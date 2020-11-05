import moment, { Moment } from 'moment';
import lodash, { isArray, isNil, isString } from 'lodash';
import { ObjectId } from 'mongodb';
import om from 'object-mapper';
import gql from 'graphql-tag';
import uuid from 'uuid';
import lasecApi, { LasecNotAuthenticatedException } from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import { Organization, User, Task } from '@reactory/server-core/models';
import FreightRequest from '@reactory/server-modules/lasec/models/LasecFreightRequest';
import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';
import amq from '@reactory/server-core/amq';
import Hash from '@reactory/server-core/utils/hash';
import { clientFor } from '@reactory/server-core/graph/client';
import { getCacheItem, setCacheItem } from '../models';
import emails from '@reactory/server-core/emails';
import LasecQuoteComment from '@reactory/server-modules/lasec/models/LasecQuoteComment';


import {
  LasecQuote,
  LasecDashboardSearchParams,
  LasecProductDashboardParams,
  USER_FILTER_TYPE,
  DATE_FILTER_PRESELECT,
  Lasec360User,
  LasecQuoteItem,
  Lasec360QuoteLineItem
} from '../types/lasec';


import CONSTANTS, { LOOKUPS, OBJECT_MAPS } from '../constants';
import { Reactory } from '@reactory/server-core/types/reactory';
import { argsToArgsConfig } from 'graphql/type/definition';
import Api from '@reactory/server-modules/lasec/api';

const lookups = CONSTANTS.LOOKUPS;

const maps = { ...OBJECT_MAPS };


/**
 * Transforms meta data into totals object
 * @param meta meta data to use for transformation
 */
export const totalsFromMetaData = (meta: any) => {
  return om.merge(meta.source, {
    "grand_total_excl_vat_cents": "totalVATExclusive",
    "grand_total_vat_cents": "totalVAT",
    "grand_total_incl_vat_cents": "totalVATInclusive",
    "grand_total_discount_cents": "totalDiscount",
    "grand_total_discount_percent": "totalDiscountPercent",
    "gp_percent": "GP",
    "actual_gp_percent": "actualGP",
  });
};

export const synchronizeQuote = async (quote_id: string, owner: any, source: any = null, map: any = true) => {
  logger.debug(`synchronizeQuote called ${quote_id}`)
  const quoteSyncTimeout = 3;


  let _source = source;
  let _quoteDoc: LasecQuote | null;
  const _predicate = {
    'meta.reference': quote_id,
    'meta.owner': owner || global.partner.key,
  }

  const now = moment();

  const _existing: LasecQuote = await Quote.findOne(_predicate).then();

  if (_source === null) {
    _source = await lasecApi.Quotes.getByQuoteId(quote_id).then();
  }

  if (_source === null && _existing !== null) {
    _source = _existing.meta && _existing.meta.source ? _existing.meta.source : {};
  }

  logger.debug(`SOURCE ${JSON.stringify(_source)}`);
  // logger.debug(`EXISTING ${JSON.stringify(_existing)}`);

  if (map === true && _source) {
    const _map = {
      ...maps.meta,
      ...maps.company,
      ...maps.customer,
      ...maps.status,
      ...maps.totals,
    };

    _quoteDoc = om.merge(_source, _map) as LasecQuote;
  }

  if (_source === null) return null;

  try {
    if (_existing) {
      _existing.meta = {
        owner,
        reference: quote_id,
        source: { ..._source },
        lastSync: now.valueOf(),
        nextSync: moment(now).add(quoteSyncTimeout, 'minutes').valueOf(),
        mustSync: true,
      };
      _existing.totals = _quoteDoc.totals;
      _existing.modified = moment(_quoteDoc.modified || now).valueOf();
      await _existing.save();
      return _existing;
    } else {
      const _newQuote: any = new Quote({
        ..._quoteDoc,
        meta: {
          owner,
          reference: quote_id,
          source: { ..._source },
          lastSync: now.valueOf(),
          nextSync: moment(now).add(quoteSyncTimeout, 'minutes').valueOf(),
          mustSync: true,
        },
        created: moment(_quoteDoc.created || now).valueOf(),
        modified: moment(_quoteDoc.modified || now).valueOf(),
      });

      await _newQuote.addTimelineEntry({
        when: now.valueOf(),
        what: `Initial Sync with reactory trigger by ${global.user.fullName(true)}`,
        who: global.user._id,
        notes: `Initial import from Lasec360 API.`
      });

      return _newQuote;
    }
  } catch (createError) {
    logger.error('Error while upserting remote document', createError);
    throw createError;
  }

};

export const getLoggedIn360User: Function = async function (): Promise<Lasec360User> {
  const { user } = global;

  if (user === null || user === undefined) throw new ApiError(`GLOBAL USER OBJECT IS NULL`, user)
  const lasecCreds = user.getAuthentication("lasec");

  if (!lasecCreds) {
    throw new LasecNotAuthenticatedException();
  }


  if (lasecCreds.props && lasecCreds.props.payload) {
    let staff_user_id: string = "";

    staff_user_id = `${lasecCreds.props.payload.user_id}`;

    const hashkey = `LOGGED_IN_360_USER_${global.partner._id}_${user._id}_${staff_user_id}`;
    let me360 = await getCacheItem(hashkey).then();
    if (!me360) {
      me360 = await lasecApi.User.getLasecUsers([staff_user_id], "ids").then();
      if (me360.length === 1) {
        me360 = me360[0];
        //fetch any other data that may be required for the data fetch
      }
    }

    if (me360) {
      setCacheItem(hashkey, me360, 60);
      logger.debug(`Updated Cache item for ${hashkey} 🟢`)
    }

    logger.debug(`me360 ===>`, me360)
    return me360;
  }

  throw new LasecNotAuthenticatedException();
};

export const setLoggedInUserProps = async (active_rep_code: string, active_company: string): Promise<Lasec360User> => {
  const $current = getLoggedIn360User();

  let company_id = 3; // sa

  switch (`${active_company}`.toLowerCase()) {
    case 'lasec_international':
    case 'lasecinternational': {
      company_id = 4;
      break;
    }
    case 'lasec_education': 
    case 'laseceducation': {
      company_id = 5;
      break;
    }
    case 'lasec_sa': 
    case 'LasecSA':
    default: {
      company_id = 3;
    }
  }

  let result = await lasecApi.User.setActiveCompany(company_id)
  logger.debug(`Result from setting active company`, { result });
  return $current;
};

export const getTargets = async (params: LasecDashboardSearchParams) => {
  const { periodStart, periodEnd, teamIds, repIds, agentSelection } = params;
  logger.debug(`QuoteResolver.getTargets(params)`, params);
  let userTargets: number = 0;
  try {

    const { user } = global;
    const lasecCreds = user.getAuthentication("lasec");
    if (!lasecCreds) {
      logger.error(`agentSelection: ${agentSelection} and user has no Lasec Credentials? Should not happen`, lasecCreds);
      return userTargets;
    }

    let staff_user_id = null;
    if (lasecCreds.props && lasecCreds.props.payload) {
      staff_user_id = lasecCreds.props.payload.user_id
    }

    switch (agentSelection) {
      case "team": {
        logger.debug(`Finding Targets for REP_CODES `, teamIds);
        userTargets = await lasecApi.User.getUserTargets(teamIds, 'sales_team_id').then();
        break;
      }
      case "custom": {
        logger.debug(`Finding Targets for USERS `, repIds);
        userTargets = await lasecApi.User.getUserTargets(repIds, 'ids').then();
        break;
      }
      case "me":
      default: {
        logger.debug(`Finding Targets for LOGGED IN USER `, repIds);
        userTargets = await lasecApi.User.getUserTargets([`${staff_user_id}`], 'ids').then();
      }
    }

    logger.debug('QuoteResolver.getTargets() => result', userTargets);
    return userTargets;

  } catch (targetFetchError) {
    logger.error(`Could not retrieve targets`, targetFetchError);
    return 0;
  }
};

/**
 * Finds and / or synchronizes a record
 * @param {String} quote_id
 */
export const getLasecQuoteById = async (quote_id: string) => {
  try {
    const owner = global.partner.key;
    let quote = await synchronizeQuote(quote_id, owner, null, true).then();
    logger.debug(`QUOTE RESULT:: ${JSON.stringify(quote)}`);
    return quote;

  } catch (quoteFetchError) {
    logger.error(`Could not fetch Quote with Quote Id ${quote_id} - ${quoteFetchError.message}`);
    return null;
  }
};

interface QuotesFilter {
  start_date: string;
  end_date: string;
  rep_codes?: string[],
  staff_user_id?: number,
}

interface SalesDashboardDataResult {
  quotes: any[],
  invoices: any[],
  isos: any[],
  quotesByStatus: any[],
}

export const getSalesDashboardData = async (params) => {

  let me = await getLoggedIn360User().then();
  logger.debug(`Fetching Lasec Sales Dashboard Data as ${me.first_name} `, params, me);
  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('month'),
      periodEnd: moment().endOf('day')
    }
  }

  let apiFilter: QuotesFilter = {
    start_date: _params.periodStart ? _params.periodStart.toISOString() : moment().startOf('month').toISOString(),
    end_date: _params.periodEnd ? _params.periodEnd.toISOString() : moment().endOf('day').toISOString()
  };

  if (params.agentSelection === 'team') {
    apiFilter.rep_codes = params.teamIds;
  }

  if (params.agentSelection === 'custom') {
    apiFilter.staff_user_id = params.repIds || []
  }

  if (params.agentSelection === 'me') {

    if (me) {
      apiFilter.rep_codes = me.rep_codes;
    }
  }

  const debresults: any = await mysql(`CALL LasecGetSalesDashboardData ('${moment(apiFilter.start_date).format('YYYY-MM-DD HH:mm:ss')}', '${moment(apiFilter.end_date).format('YYYY-MM-DD HH:mm:ss')}',  ${me.id}, 'me');`, 'mysql.lasec360').then()

  let quotes: any[] = debresults[1];
  let invoices: any[] = debresults[2];
  let isos: any[] = debresults[3];
  let quotesByStatus: any[] = []; //dbresults[4];

  if (apiFilter.rep_codes && apiFilter.rep_codes.length > 0) {
    lodash.remove(quotes, (quote: any) => lodash.intersection(apiFilter.rep_codes, [quote.sales_team_id]).length === 1);
  }

  //perform a lightweight map
  const quoteSyncResult = await Promise.all(quotes.map((quote: any) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  // logger.debug(`QUOTES ${JSON.stringify(quotes.slice(0, 5))}`);


  return {
    quotes,
    invoices,
    isos,
    quotesByStatus,
  };

};


export const getQuotes = async (params) => {

  let me = await getLoggedIn360User().then();
  logger.debug(`Fetching Lasec Dashboard Data as ${me.first_name} `, params, me);
  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('month'),
      periodEnd: moment().endOf('day')
    }
  }

  let apiFilter: QuotesFilter = {
    start_date: _params.periodStart ? _params.periodStart.toISOString() : moment().startOf('month').toISOString(),
    end_date: _params.periodEnd ? _params.periodEnd.toISOString() : moment().endOf('day').toISOString()
  };

  if (params.agentSelection === 'team') {
    apiFilter.rep_codes = params.teamIds;
  }

  if (params.agentSelection === 'custom') {
    apiFilter.staff_user_id = params.repIds || []
  }

  if (params.agentSelection === 'me') {

    if (me) {
      apiFilter.rep_codes = me.rep_codes;
    }
  }

  const debresults: any = await mysql(`CALL LasecGetSalesDashboardData ('${moment(apiFilter.start_date).format('YYYY-MM-DD HH:mm:ss')}', '${moment(apiFilter.end_date).format('YYYY-MM-DD HH:mm:ss')}',  ${me.id}, 'me');`, 'mysql.lasec360').then()


  /*
  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: 10, enabled: true } }).then();

  let ids = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  const pagePromises = [];
  const upperLimit = 20;
  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    const max_pages = quoteResult.pagination.num_pages < upperLimit ? quoteResult.pagination.num_pages : upperLimit;

    for (let pageIndex = quoteResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
      pagePromises.push(lasecApi.Quotes.list({ filter: apiFilter, pagination: { enabled: true, current_page: pageIndex, page_size: 10 } }));
    }
  }

  const pagedResults = await Promise.all(pagePromises).then();

  pagedResults.forEach((pagedResult) => {
    ids = [...ids, ...pagedResult.ids]
  });

  const quotesDetails = await lasecApi.Quotes.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${quotesDetails.items.length}) Quotes from API`);
   */

  let quotes = debresults[1];

  if (apiFilter.rep_codes && apiFilter.rep_codes.length > 0) {
    lodash.remove(quotes, (quote: any) => lodash.intersection(apiFilter.rep_codes, [quote.sales_team_id]).length === 1);
  }

  //perform a lightweight map
  const quoteSyncResult = await Promise.all(quotes.map((quote: any) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  // logger.debug(`QUOTES ${JSON.stringify(quotes.slice(0, 5))}`);

  amq.raiseWorkFlowEvent('quote.list.refresh', quotes, global.partner);

  return quotes;


};

export const getInvoices = async ({ periodStart, periodEnd, teamIds = [], repIds = [], agentSelection = 'me' }) => {

  //holds a list of our detail promises
  let idsQueryResults: any = null;
  let invoice_details_promises: Promise<any>[] = [];
  let ids_to_request: any = [];
  let invoice_items: any[] = [];

  let filter: any = {
    start_date: periodStart,
    end_date: periodEnd
  };

  const me360 = await getLoggedIn360User().then();

  switch (agentSelection) {
    case "team": {
      filter.rep_code = teamIds;
      break;
    }
    case "custom": {
      filter.staff_user_id = repIds;
      break;
    }
    case "me":
    default: {
      filter.rep_code = [me360.sales_team_id];
    }
  }

  /**
   * Collect ids and setup promises for details
   */
  try {
    logger.debug(`QuoteResolver getInvoices({ ${periodStart}, ${periodEnd}, ${teamIds} })`);
    idsQueryResults = await lasecApi.Invoices.list({ filter: filter, pagination: { page_size: 10, enabled: true, current_page: 1 }, ordering: { "invoice_date": "asc" } }).then();
    if (lodash.isArray(idsQueryResults.ids) === true) {
      ids_to_request = [...idsQueryResults.ids] //spread em
    }

    if (idsQueryResults.pagination && idsQueryResults.pagination.num_pages > 1) {

      let more_ids_promises: Promise<any>[] = []

      const max_pages = idsQueryResults.pagination.num_pages;
      logger.debug(`Period requires paged invoice result fetching ${max_pages} id pages`)
      for (let pageIndex = idsQueryResults.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        more_ids_promises.push(lasecApi.Invoices.list({ filter: filter, pagination: { page_size: 10, enabled: true, current_page: pageIndex }, ordering: { "invoice_date": "asc" } }));
      }

      try {
        const all_ids_results = await Promise.all(more_ids_promises).then();

        all_ids_results.forEach((ids_result: any) => {
          if (ids_result && lodash.isArray(ids_result.ids) === true) {
            ids_to_request = lodash.concat(ids_to_request, ids_result.ids)
          }
        });
      } catch (allPromisesFailure) {
        logger.error(`Fetching invoice ids failed ${allPromisesFailure}`);
      }

    }

    logger.debug(`Need to fetch ${ids_to_request.length} ids`);

    const max_batch_size = 10;
    let ids_left = ids_to_request.length;
    while (ids_left > 0) {
      let _batch_size = max_batch_size;
      if (ids_left < max_batch_size) _batch_size = ids_left;
      //get the slice
      let _ids_to_fetch = lodash.takeRight(ids_to_request, _batch_size);
      //trim
      ids_to_request = lodash.slice(ids_to_request, 0, ids_to_request.length - _batch_size);
      //add invoice list with ids promise
      invoice_details_promises.push(lasecApi.Invoices.list({ filter: { ids: _ids_to_fetch }, ordering: { "invoice_date": "asc" }, pagination: { page_size: _ids_to_fetch.length, current_page: 1, enabled: true } }));
      ids_left = ids_to_request.length;
    }

    logger.debug(`${invoice_details_promises.length} API.Invoices.list Promises Queued  `);

  } catch (e) {
    logger.error(`Error querying Invoices ${e.message}`)
  }


  /**Detail fetch*/
  try {
    if (invoice_details_promises.length > 0) {
      const invoice_fetch_results = await Promise.all(invoice_details_promises).then();
      if (invoice_fetch_results) {
        for (let idx = 0; idx < invoice_fetch_results.length; idx += 1) {
          if (invoice_fetch_results[idx].items) {
            invoice_items = [...invoice_items, ...invoice_fetch_results[idx].items]
          }
        }
      }
    }

    return invoice_items;
  } catch (e) {
    logger.debug(`Error while fetching error invoice detailed records ${e.message}`);
    return [];
  }

};

export const getISOs = async (dashparams: LasecDashboardSearchParams, collectedIds = []) => {

  const { periodStart, periodEnd, agentSelection, teamIds } = dashparams;
  logger.debug(`QuoteResolver getISOs({ ${periodStart}, ${periodEnd} })`);


  let ids_to_request: any[] = [];
  let idsQueryResults: any = null;
  let iso_fetch_promises = [];
  let iso_items: any[] = [];


  let isoQueryParams = {
    filter: { order_status: "1", start_date: periodStart, end_date: periodEnd },
    ordering: { order_date: "desc" },
    pagination: { enabled: true, page_size: 20 }
  };

  const me360 = await getLoggedIn360User().then();

  switch (agentSelection) {
    case "team": {
      isoQueryParams.filter.sales_team_id = teamIds;
      break;
    }
    case "custom": {
      //isoQueryParams.filter.staff_user_id = repIds;
    }
    case "me":
    default: {
      isoQueryParams.filter.sales_team_id = [me360.sales_team_id];
    }
  }

  /**
   * Collect ids and setup promises for details
   */
  try {
    logger.debug(`QuoteResolver getISOs({ ${periodStart}, ${periodEnd}, ${teamIds} })`);
    idsQueryResults = await lasecApi.PurchaseOrders.list({ filter: isoQueryParams.filter, pagination: { page_size: 10, enabled: true, current_page: 1 }, ordering: { order_date: "desc" } }).then();
    if (lodash.isArray(idsQueryResults.ids) === true) {
      ids_to_request = [...idsQueryResults.ids] //spread em
    }

    if (idsQueryResults.pagination && idsQueryResults.pagination.num_pages > 1) {

      let more_ids_promises: Promise<any>[] = []

      const max_pages = idsQueryResults.pagination.num_pages;
      logger.debug(`Period requires paged invoice result fetching ${max_pages} id pages`)
      for (let pageIndex = idsQueryResults.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        more_ids_promises.push(lasecApi.PurchaseOrders.list({ filter: isoQueryParams.filter, pagination: { page_size: 10, enabled: true, current_page: pageIndex }, ordering: { "order_date": "asc" } }));
      }

      try {
        const all_ids_results = await Promise.all(more_ids_promises).then();

        all_ids_results.forEach((ids_result: any) => {
          if (ids_result && lodash.isArray(ids_result.ids) === true) {
            ids_to_request = lodash.concat(ids_to_request, ids_result.ids)
          }
        });
      } catch (allPromisesFailure) {
        logger.error(`Fetching PurchaseOrders ids failed ${allPromisesFailure}`);
      }

    }

    logger.debug(`Need to fetch ${ids_to_request.length} ids`);

    const max_batch_size = 10;
    let ids_left = ids_to_request.length;
    while (ids_left > 0) {
      let _batch_size = max_batch_size;
      if (ids_left < max_batch_size) _batch_size = ids_left;
      //get the slice
      let _ids_to_fetch = lodash.takeRight(ids_to_request, _batch_size);
      //trim
      ids_to_request = lodash.slice(ids_to_request, 0, ids_to_request.length - _batch_size);
      //add invoice list with ids promise
      iso_fetch_promises.push(lasecApi.PurchaseOrders.list({ filter: { ids: _ids_to_fetch }, ordering: { "order_date": "asc" }, pagination: { page_size: _ids_to_fetch.length, current_page: 1, enabled: true } }));
      ids_left = ids_to_request.length;
    }

    logger.debug(`${iso_fetch_promises.length} API.PurchaseOrders.list Promises Queued  `);

  } catch (e) {
    logger.error(`Error querying Invoices ${e.message}`)
  }


  /**Detail fetch*/
  try {
    if (iso_fetch_promises.length > 0) {
      const invoice_fetch_results = await Promise.all(iso_fetch_promises).then();
      if (invoice_fetch_results) {
        for (let idx = 0; idx < invoice_fetch_results.length; idx += 1) {
          if (invoice_fetch_results[idx].items) {
            iso_items = [...iso_items, ...invoice_fetch_results[idx].items]
          }
        }
      }
    }

    return iso_items;
  } catch (e) {
    logger.debug(`Error while fetching error invoice detailed records ${e.message}`);
    return [];
  }
};

//retrieves next actions for a user
export const getNextActionsForUser = async ({ periodStart, periodEnd, user = global.user, actioned = false }) => {

  try {
    if (!user) throw new ApiError("Invalid user data", user);
    logger.debug(`Fetching nextActions (Quote Reminders) for user:: ${user.firstName} ${user.lastName} [${user.email}]`);
    logger.debug(`Fetching nextActions (Period) for user:: ${periodStart} - ${periodEnd}`);
    const reminders = await QuoteReminder.find({
      // owner: user._id,
      who: user._id,
      next: {
        $gte: moment(periodStart).toDate(),
        $lte: moment(periodEnd).endOf('day').toDate()
      },
      actioned: false
    }).then();
    logger.debug(`Loaded ${reminders.length} reminder documents for user`);
    return reminders;
  } catch (nextActionError) {
    logger.error(nextActionError);
    throw nextActionError;
  }
};

// retrieve next action by id
export const getNextActionById = async (id) => {
  try {
    logger.debug(`Fetching nextAction (Quote Reminders) for Id:: ${id}`);

  }
  catch (nextActionError) {
    logger.error(nextActionError);
    throw nextActionError;
  }

}

/**
 * Fetches emails where content / subject matches the quote
 * @param {*} quote_id
 */
export const getQuoteEmails = async (quote_id) => {

  return new Promise((resolve, reject) => {
    clientFor(global.user, global.partner).query({
      query: gql`
        query EmailForQuote($mailFilter: MailFilter) {
          userEmails(mailFilter: $mailFilter) {
            id
            sent
            from
            message
            subject
            to
            createdAt
            archived
          }
        }`, variables: {
        mailFilter: {
          search: quote_id,
          via: ['microsoft'],
        }
      }
    }).then((emailResult) => {
      logger.debug('Got emails for user', emailResult);
      if (emailResult.data && emailResult.data.userEmails) {
        resolve(emailResult.data.userEmails);
      } else {
        resolve([]);
      }

    }).catch((emailError) => {
      logger.error(`Error fetching mail from user ${emailError.message}`, emailError);
      reject(emailError);
    });
  });
};

export const groupQuotesByStatus = (quotes: any[]) => {
  const groupsByKey: any = {};
  quotes.forEach((quote) => {
    const key: string = quote.statusGroup || 'none';

    const { totals } = quote;

    const titleFromKey = (_k) => {
      const _m = {
        "1": "Draft",
        "2": "Open",
        "3": "Accepted",
        "4": "Lost",
        "5": "Expired",
        "6": "Deleted",
      };

      return _m[_k] || "Other";
    };

    /**
     * The good the bad and the ugly map
     */
    const good_bad: any = {
      "1": "good",
      "2": "good",
      "3": "good",
      "4": "good",
      "5": "bad",
      "6": "good",
    };

    if (Object.getOwnPropertyNames(groupsByKey).indexOf(quote.statusGroup) >= 0) {
      groupsByKey[key].quotes.push(quote);
      groupsByKey[key].totalVAT = groupsByKey[key].totalVAT + (totals.totalVAT / 100);
      groupsByKey[key].totalVATExclusive = groupsByKey[key].totalVATExclusive + (totals.totalVATExclusive / 100);
      groupsByKey[key].totalVATInclusive = Math.floor(groupsByKey[key].totalVATInclusive + (totals.totalVATInclusive / 100));
      if (good_bad[key] === "good") groupsByKey[key].good += 1;
      else groupsByKey[key].naughty += 1;

    } else {
      groupsByKey[key] = {
        quotes: [quote],
        good: 0,
        naughty: 0,
        category: '',
        key,
        totalVAT: totals.totalVAT / 100,
        totalVATExclusive: totals.totalVATExclusive / 100,
        totalVATInclusive: totals.totalVATInclusive / 100,
        title: titleFromKey(key),
      };

      if (good_bad[key] === "good") groupsByKey[key].good += 1;
      else groupsByKey[key].naughty += 1;
    }
  });

  const groupedByStatus = Object.getOwnPropertyNames(groupsByKey).map((statusKey) => {
    return {
      ...groupsByKey[statusKey],
      totalVAT: Math.floor(groupsByKey[statusKey].totalVAT),
      totalVATExclusive: Math.floor(groupsByKey[statusKey].totalVATExclusive),
      totalVATInclusive: Math.floor(groupsByKey[statusKey].totalVATInclusive),
    };
  });

  return groupedByStatus;
};

export interface QuotesByProductClassMap {
  [key: string]: LasecQuote[]
}

export interface ProductClassQuotes {
  ProductClassCode: string,
  ProductClassDescription: string,
  Quotes: LasecQuote[],
  QuoteLineItems: any[],
}

export const groupQuotesByProduct = async (quotes: LasecQuote[]) => {

  const quotesByProductClass: QuotesByProductClassMap = {};
  try {
    const lineitemsPromises = quotes.map((quote: LasecQuote) => { lasecGetQuoteLineItems(quote.id) })
    const LineItemResults = await Promise.all(lineitemsPromises).then();
  } catch (e) {
    logger.error(`Error Getting Line Items For Quote(s) ${e.message}`, e);
    return quotesByProductClass;
  }


  quotes.forEach((quote) => {
    logger.debug(`Checking Quote ${quote.id} items for product class`, quote);
    const key = quote.productClass || 'None';
    const statusKey = quote.statusGroup || 'none';



    // logger.debug(`Found ${lineItems ? lineItems.length : ' (none) '} lineitems`)
    const { totals } = quote;

    const good_bad: any = {
      "1": "good",
      "2": "good",
      "3": "good",
      "4": "good",
      "5": "bad",
      "6": "good",
    };

    if (Object.getOwnPropertyNames(groupsByKey).indexOf(quote.statusGroup) >= 0) {
      groupsByKey[key].quotes.push(quote);
      groupsByKey[key].totalVAT = Math.floor(groupsByKey[key].totalVAT + (totals.totalVAT / 100));
      groupsByKey[key].totalVATExclusive = Math.floor(groupsByKey[key].totalVATExclusive + (totals.totalVATExclusive / 100));
      groupsByKey[key].totalVATInclusive = Math.floor(groupsByKey[key].totalVATInclusive + (totals.totalVATInclusive / 100));
      if (good_bad[statusKey] === "good") groupsByKey[key].good += 1;
      else groupsByKey[key].naughty += 1;

    } else {
      groupsByKey[key] = {
        quotes: [quote],
        good: 0,
        naughty: 0,
        category: '',
        key,
        totalVAT: Math.floor(totals.totalVAT / 100),
        totalVATExclusive: Math.floor(totals.totalVATExclusive / 100),
        totalVATInclusive: Math.floor(totals.totalVATInclusive / 100),
        title: key,
      };
    }
  });

  const groupedByProduct = Object.getOwnPropertyNames(groupsByKey).map((statusKey) => {
    return groupsByKey[statusKey];
  });

  return groupedByProduct;
};

export const lasecGetProductDashboard = async (dashparams = defaultProductDashboardParams,) => {

  logger.debug(`GET PRODUCT DASHBOARD QUERIED: ${JSON.stringify(dashparams)}`);
  let {
    period = 'this-week',
    periodStart = moment(dashparams.periodStart || moment()).startOf('week'),
    periodEnd = moment(dashparams.periodEnd || moment()).endOf('week'),
    agentSelection = 'me',
    teamIds = [],
    repIds = [],
    productClass = [],
    options = {
      bypassEmail: true,
    }
  } = dashparams;



  const now = moment();
  switch (period) {
    case 'today': {
      periodStart = moment(now).startOf('day');
      periodEnd = moment(periodStart).endOf('day');
      break;
    }
    case 'yesterday': {
      periodStart = moment(now).startOf('day').subtract('24', 'hour');
      periodEnd = moment(periodStart).endOf('day');
      break;
    }
    case 'last-week': {
      periodStart = moment(now).startOf('week').subtract('1', 'week');
      periodEnd = moment(periodStart).endOf('week');
      break;
    }
    case 'this-month': {
      periodStart = moment(now).startOf('month');
      periodEnd = moment(periodStart).endOf('month');
      break;
    }
    case 'last-month': {
      periodStart = moment(now).startOf('month').subtract('1', 'month');
      periodEnd = moment(periodStart).endOf('month');
      break;
    }
    case 'this-year': {
      periodStart = moment(now).startOf('year');
      periodEnd = moment(periodStart).endOf('year');
      break;
    }
    case 'last-year': {
      periodStart = moment(now).startOf('year').subtract(1, 'year');
      periodEnd = moment(periodStart).endOf('year');
      break;
    }
    case 'custom': {
      //already bound to incoming params, only check if they are in correct order
      if (periodEnd.isBefore(periodStart) === true) {
        const _periodStart = moment(periodEnd);
        const _periodEnd = moment(periodStart);

        periodStart = _periodStart;
        periodEnd = _periodEnd;
      }
      break;
    }
    case 'this-week':
    default: {
      //ain't nothing to do
      break;
    }
  }

  let periodLabel = `Product Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${global.user.firstName} ${global.user.lastName}`;

  /*
    let cacheKey = `productQuote.dashboard.${user._id}.${periodStart.valueOf()}.${periodEnd.valueOf()}`;
    let _cached = await getCacheItem(cacheKey);

    if(_cached) {
      logger.debug('Found results in cache');
      periodLabel = `${periodLabel} [cache]`;
      return _cached;
    }
  */

  let palette = global.partner.colorScheme();
  logger.debug('Fetching Quote Data');
  let quotes = await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection, productClass }).then();
  logger.debug(`QUOTES:: (${quotes.length})`);
  const targets = await getTargets({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
  logger.debug('Fetching Next Actions for User, targets loaded', { targets });
  const nextActionsForUser = await getNextActionsForUser({ periodStart, periodEnd, user: global.user }).then();
  logger.debug(`Fetching invoice data ${periodStart.format('YYYY-MM-DD HH:mm')} ${periodEnd.format('YYYY-MM-DD HH:mm')} ${global.user.firstName} ${global.user.lastName}`);
  const invoices = await getInvoices({
    periodStart,
    periodEnd,
    teamIds: teamIds.length === 0 ? null : teamIds,
    repIds,
    agentSelection
  }).then();
  logger.debug(`Found ${isArray(invoices) ? invoices.length : '##'} invoices`)
  logger.debug('Fetching isos');
  const isos = await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
  logger.debug(`Found ${isArray(isos) ? isos.length : '##'} isos`);



  const quoteProductFunnel = {
    chartType: 'FUNNEL',
    data: [],
    options: {},
    key: `quote-product/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`,
  };

  const quoteProductPie = {
    chartType: 'PIE',
    data: [],
    options: {
      multiple: false,
      outerRadius: 140,
      innerRadius: 70,
      fill: `#${palette[0]}`,
      dataKey: 'value',
    },
    key: `quote-status/product-dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`,
  };

  const quoteISOPie = {
    chartType: 'PIE',
    data: isos.map((iso) => {
      return iso;
    }),
    options: {
      multiple: false,
      outerRadius: 140,
      innerRadius: 70,
      fill: `#${palette[1]}`,
      dataKey: 'order_value',
    },
    key: `quote-iso/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`
  };

  const quoteINVPie = {
    chartType: 'PIE',
    data: invoices.map((invoice) => {
      return invoice;
    }),
    options: {
      multiple: false,
      outerRadius: 140,
      innerRadius: 70,
      fill: `#${palette[2]}`,
      dataKey: 'invoice_value',
    },
    key: `quote-inv/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`
  };

  const quoteStatusComposed = {
    chartType: 'COMPOSED',
    data: [],
    options: {
      xAxis: {
        dataKey: 'modified',
      },
      line: {
        dataKey: 'totalVATExclusive',
        dataLabel: 'Total Quoted',
        name: 'Total Quoted',
        stroke: `#${palette[0]}`,
      },
      area: {
        dataKey: 'invoiced',
        dataLabel: 'Total Invoiced',
        name: 'Total Invoiced',
        stroke: `${global.partner.themeOptions.palette.primary1Color}`,
      },
      bar: {
        dataKey: 'isos',
        dataLabel: 'Total ISO',
        name: 'Sales Orders',
        stroke: `${global.partner.themeOptions.palette.primary2Color}`,
      }
    },
    key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/composed`
  };

  // TODO - REMOVE THIS. Adding a random product class.
  // const randomProductClasses = ['Product 1', 'Product 2', 'Product 3', 'Product 4'];
  // quotes.forEach(quote => {
  //   quote.productClass = randomProductClasses[Math.floor(Math.ra ndom() * randomProductClasses.length)];
  // });

  lodash.orderBy(quotes, ['productClass'], ['asc']);

  const productDashboardResult = {
    period,
    periodLabel,
    periodStart,
    periodEnd,
    agentSelection,
    teamIds,
    repIds,
    target: targets || 0,
    targetPercent: 0,
    nextActions: {
      owner: global.user,
      actions: nextActionsForUser
    },
    totalQuotes: 0,
    totalBad: 0,
    productSummary: [],
    quotes,
    charts: {
      quoteProductFunnel,
      quoteProductPie,
      quoteStatusComposed
    }
  };

  productDashboardResult.totalQuotes = quotes.length;
  productDashboardResult.productSummary = []
  productDashboardResult.charts.quoteProductFunnel.data = [];
  productDashboardResult.charts.quoteProductPie.data = [];
  productDashboardResult.productSummary.forEach((entry, index) => {
    productDashboardResult.charts.quoteProductFunnel.data.push({
      "value": entry.totalVATExclusive,
      "name": entry.title,
      "fill": `#${palette[index + 1 % palette.length]}`
    });
    productDashboardResult.charts.quoteProductPie.data.push({
      "value": entry.totalVATExclusive,
      "name": entry.title,
      "outerRadius": 140,
      "innerRadius": 70,
      "fill": `#${palette[index + 1 % palette.length]}`
    });
  });

  lodash.sortBy(quotes, [q => q.modified]).forEach((quote) => {
    productDashboardResult.charts.quoteStatusComposed.data.push({
      "name": quote.id,
      "modified": moment(quote.modified).format('YYYY-MM-DD'),
      "totalVATInclusive": quote.totals.totalVATInclusive / 100,
      "totalVATExclusive": quote.totals.totalVATExclusive / 100,
      "totalVAT": quote.grand_total_vat_cents
    });
  });

  let totalTargetValue = 0;

  if (isNaN(productDashboardResult.target) && isNaN(totalTargetValue) === false) {
    productDashboardResult.targetPercent = totalTargetValue * 100 / productDashboardResult.target;
  }

  productDashboardResult.charts.quoteProductFunnel.data = lodash.reverse(productDashboardResult.charts.quoteProductFunnel.data);

  return productDashboardResult;

}

const line_items_map = {
  'items[]': '[].meta.source',
  'items[].id': [
    '[].quote_item_id',
    '[].meta.reference',
    '[].line_id',
    '[].id',    
  ],
  'items[].quote_id': '[].quoteId',
  'items[].code': '[].code',
  'items[].description': '[].title',
  'items[].quantity': '[].quantity',
  'items[].total_price_cents': '[].price',
  'items[].gp_percent': '[].GP',
  'items[].total_price_before_discount_cents': [
    '[].totalVATExclusive',
    {
      key: '[].totalVATInclusive',
      transform: (v: any) => (Number.parseInt(v) * 1.15)
    }
  ],
  'items[].note': '[].note',
  'items[].quote_heading_id': '[].header.meta.reference',
  'items[].header_name': {
    key: '[].header.text', transform: (v: any) => {
      if (lodash.isEmpty(v) === false) return v;
      return 'Uncategorised';
    }
  },
  'items[].total_discount_percent': '[].discount',
  'items[].product_class': '[].productClass',
  'items[].product_class_description': '[].productClassDescription',
};

const line_item_map = {
  'id': [
    'id',
    'quote_item_id',
    'meta.reference',
    'line_id',    
  ],
  'quote_id': 'quoteId',
  'code': 'code',
  'description': 'title',
  'quantity': 'quantity',
  'total_price_cents': 'price',
  'gp_percent': 'GP',
  'total_price_before_discount_cents': [
    'totalVATExclusive',
    {
      key: 'totalVATInclusive',
      transform: (v: any) => (Number.parseInt(v) * 1.15)
    }
  ],
  'note': 'note',
  'quote_heading_id': 'header.meta.reference',
  'header_name': {
    key: 'header.text', transform: (v: any) => {
      if (lodash.isEmpty(v) === false) return v;
      return 'Uncategorised';
    }
  },
  'total_discount_percent': 'discount',
  'product_class': 'productClass',
  'product_class_description': 'productClassDescription',
}

export const lasecGetQuoteLineItem = async (id: string): Promise<LasecQuoteItem> => {
  const line_item_result: Lasec360QuoteLineItem = await lasecApi.Quotes.getLineItem(id).then();

  const line_item: LasecQuoteItem = om.merge(line_item_result, line_item_map) as LasecQuoteItem;
  line_item.meta.source = line_item_result;
  
  return line_item;
};


export const lasecGetQuoteLineItems = async (code: string, active_option: String = 'all', page = 1, pageSize = 25) => {
  const keyhash = `quote.${code}-${active_option}.lineitems.${page}-${pageSize}`;

  //let cached = await getCacheItem(keyhash);
  //if (cached) logger.debug(`Found Cached Line Items For Quote: ${code}`);

  //if (lodash.isNil(cached) === true) {
    let lineItems = []
    let result = await lasecApi.Quotes.getLineItems(code, active_option, pageSize, page).then();

    logger.debug(`Helpers.ts -> lasecGetQuoteLineItems() => Got results from API`, { records: result.line_items.length, paging: result.item_paging })

    lineItems = result.line_items;
    
    
    logger.debug(`Found line items for quote ${code}`, lineItems);

    if (lineItems.length == 0) return [];

    lodash.sortBy(lineItems, (e) => `${e.quote_heading_id || -1}-${e.position}`)

    lineItems = om.merge(result.line_items, line_items_map) as LasecQuoteItem[];
    

    logger.debug(`Line items ${code} 🟢`, { lineItems });    
    //setCacheItem(keyhash, cached, 25).then();
  //}

  return { lineItems, item_paging: result.item_paging };
}

export const LasecSendQuoteEmail = async (params: { code: string, mailMessage: any }) => {
  const { code, mailMessage } = params;

  const { subject, message, to, cc = [], bcc = [], from, attachments = [] } = mailMessage;
  const { user } = global;

  if (user.email !== from.email) throw new ApiError('Cannot send an email on behalf of another account. You can only send emails on behalf of yourself.', { HereBeDragons: true });

  let mailResponse = { success: true, message: `Customer mail sent successfully!` };

  if (user.getAuthentication("microsoft") !== null) {
    await clientFor(user, global.partner).mutate({
      mutation: gql`
        mutation sendMail($message: SendMailInput!) {
          sendMail(message: $message) {
            Successful
            Message
          }
        }`, variables: {
        "message": {
          "id": `${user._id.toString()}`,
          "via": "microsoft",
          "subject": subject,
          "content": message,
          "recipients": to,
          "ccRecipients": cc,
          "bcc": bcc,
          'contentType': 'html',
        }
      }
    })
      .then()
      .catch(error => {
        logger.debug(`SENDING CUSTOMER COMMUNICTATION FAILED - ERROR:: ${error}`);
        mailResponse.success = false;
        mailResponse.message = `Sending customer communication failed: ${error}`
      });

    return mailResponse;

  } else {
    const mailParams = {
      to: to,
      from: user.email,
      subject,
      message
    }
    const response = await emails.sendSimpleEmail(mailParams);
    if (!response.success) {
      logger.debug(`SENDING CUSTOMER COMMUNICATION FAILED - ERROR:: ${response.message}`);
      mailResponse.success = false;
      mailResponse.message = `Sending customer communication failed: ${response.message}`
    }

    return mailResponse;
  }
}

const quote_field_maps: any = {
  "code": "id",
  "created": "created",
  "status": "quote_status_id",
  "total": "grand_total_excl_vat_cents",
  "companyTradingName": "organisation_id",
  "accountNumber": "account_number",
  "customer": "company_trading_name",
  "repCode": "company_sales_team",
  "client": "client",
};

/**
 * Function that returns paged quote data from the lasec api.
 * @param params
 */
export const getPagedQuotes = async (params) => {

  const {
    search = "",
    periodStart,
    periodEnd,
    quoteDate,
    filterBy = "any_field",
    filter,
    paging = { page: 1, pageSize: 10 },
    orderBy = 'code',
    orderDirection = 'asc',
    iter = 0 } = params;

  logger.debug(`🚨🚨getPagedQuotes(${JSON.stringify(params)})`);

  let ordering: { [key: string]: string } = {}

  let lasec_user: Lasec360User = await getLoggedIn360User().then();

  if (orderBy) {
    let fieldKey: string = quote_field_maps[orderBy];
    ordering[fieldKey] = orderDirection || 'asc'
  }

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let apiFilter: any = {
  };

  const DEFAULT_FILTER = {
    sales_team_ids: lasec_user.sales_team_ids,
    repo_code: lasec_user.sales_team_ids,
  }

  const empty_result = {
    paging: pagingResult,
    quotes: [],
  }

  switch (filterBy) {
    case "any_field": {
      //make sure we have a search value
      delete apiFilter.start_date
      delete apiFilter.end_date

      if (isString(search) === false || search.length < 3 && filter === undefined) {
        apiFilter = DEFAULT_FILTER;
      } else {
        apiFilter.any_field = search;
      }
      break;
    }
    case "date_range": {
      delete apiFilter.date_range;

      apiFilter.start_date = periodStart ? moment(periodStart).toISOString() : moment().startOf('year');
      apiFilter.end_date = periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day');

      if (search && search.length >= 3) {
        apiFilter.any_field = search;
      }

      break;
    }
    case "quote_number": {

      if (isString(search) === false || search.length < 3 && filter === undefined) {
        return {
          paging: pagingResult,
          periodStart,
          periodEnd,
          filter,
          filterBy,
          quotes: []
        };
      }

      apiFilter.id = search;

      break;
    }
    case "quote_date": {
      apiFilter.created = moment(filter).format('yyyy-MM-dd')
      break;
    }
    case "quote_status": {
      apiFilter.quote_status_id = filter;
      break;
    }
    case "total_value": {
      let total_value: number = parseInt(parseFloat(search || "100").toFixed(2)) * 10;
      apiFilter.total_value = total_value;
      break;
    }
    case "client": {
      apiFilter.client = search;
      break;
    }
    case "customer": {
      apiFilter.company_trading_name = search;
      break;
    }
    case "account_number": {
      apiFilter.account_number = search;
      break;
    }
    case "quote_type": {
      apiFilter.quote_type = filter
      break;
    }
    case "rep_code": {
      apiFilter.sales_team_id = isArray(filter) && filter.length > 0 ? filter : lasec_user.sales_team_ids
      break;
    }
  }

  if (quoteDate) {
    apiFilter.start_date = moment(quoteDate).startOf('day').toISOString();
    apiFilter.end_date = moment(quoteDate).endOf('day').toISOString();
  }

  const filterExample = {
    "filter": {
      "any_field": "cod",
      "start_date": "2020-04-06T22:00:00.000Z",
      "end_date": "2020-05-05T22:00:00.000Z"
    },
    "format": { "ids_only": true },
    "ordering": { "quote_id": "asc" }
  }

  let quoteResult = await lasecApi.Quotes.list({
    filter: apiFilter,
    pagination: { page_size: paging.pageSize || 10, current_page: paging.page },
    ordering,
    format: { "ids_only": true },
  }).then();

  let ids = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    pagingResult.total = quoteResult.pagination.num_items;
    pagingResult.pageSize = quoteResult.pagination.page_size || 10;
    pagingResult.hasNext = quoteResult.pagination.has_next_page === true;
    pagingResult.page = quoteResult.pagination.current_page || 1;
  }

  // logger.debug(`Loading (${ids.length}) quote ids`);

  let quoteDetails = await lasecApi.Quotes.list({ filter: { ids: ids } }).then();
  logger.debug(`Fetched Expanded View for (${quoteDetails.items.length}) Quotes from API`);
  let quotes = [...quoteDetails.items];


  logger.debug(`QUOTE DOC:: ${JSON.stringify(quotes[0])}`);

  const quoteSyncResult = await Promise.all(quotes.map((quote) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  logger.debug(`QUOTE DOC:: ${JSON.stringify(quoteSyncResult[0])}`);

  quotes = quoteSyncResult.map(doc => doc);

  let result = {
    paging: pagingResult,
    search,
    periodStart,
    periodEnd,
    filter,
    filterBy,
    quoteDate,
    quotes,
  };

  return result;
}

interface PagedClientQuotesParams {
  clientId: string,
  search?: string,
  periodStart: string,
  periodEnd: string,
  quoteDate: string,
  filterBy?: string,
  paging: {
    page: number,
    pageSize: number
  }
  iter?: number,
}



export const getPagedClientQuotes = async (params: PagedClientQuotesParams): Promise<any> => {

  logger.debug(`GETTING PAGED CLIENT QUOTES:: ${JSON.stringify(params)}`);

  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    quoteDate,
    filterBy = "any_field",
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  const empy_result = {
    paging: pagingResult,
    quotes: []
  };


  if (filterBy === "any_field" || search.length < 3) {
    return empy_result;
  }

  // -- POSSIBLE FILTERS --
  // Date Range
  // Quote Number
  // Quote Date
  // Quote Status
  // Quote Value
  // Customer
  // Client
  // Account Number
  // Quote Type
  // Rep Code

  let apiFilter = {
    customer_id: clientId,
    // sales_team_id: "100",
    [filterBy]: search,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };

  if (quoteDate) {
    apiFilter.start_date = moment(quoteDate).startOf('day').toISOString();
    apiFilter.end_date = moment(quoteDate).endOf('day').toISOString();
  }

  // const exampleFilter = {
  //   "filter": {
  //     "sales_team_id": "100",
  //     "customer_id": "15366"
  //   },
  // }

  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: paging.pageSize || 10, current_page: paging.page } }).then();

  let ids = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    pagingResult.total = quoteResult.pagination.num_items;
    pagingResult.pageSize = quoteResult.pagination.page_size || 10;
    pagingResult.hasNext = quoteResult.pagination.has_next_page === true;
    pagingResult.page = quoteResult.pagination.current_page || 1;
  }

  let quoteDetails = await lasecApi.Quotes.list({ filter: { ids: ids } }).then();
  logger.debug(`Fetched Expanded View for (${quoteDetails.items.length}) Quotes from API`);
  let quotes = [...quoteDetails.items];

  const quoteSyncResult = await Promise.all(quotes.map((quote) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    quotes,
  };

  return result;
}

export const getSalesOrders = async (params) => {
  logger.debug(`GETTING PAGED SALES ORDERS:: ${JSON.stringify(params)}`);

  const {
    productId,
    filterBy,
    search,
    paging = { page: 1, pageSize: 10 }
  } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  //order_status: "1"
  const salesOrdersIds = await lasecApi.SalesOrders.list(
    {
      filter: { product_id: productId, order_status: "1" },
      // format: { ids_only: true },
      ordering: { order_date: "desc" },
      pagination: paging
    }).then();

  logger.debug(`GOT IDS:: ${salesOrdersIds.ids.length}`);

  let ids = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }).then();
  logger.debug(`GOT DETAILS:: ${JSON.stringify(salesOrdersDetails.items[0])}`);
  let salesOrders = [...salesOrdersDetails.items];
  /**
   *
   *
   * {
  "id": "497780-RLAS1GL011-0000M",
  "document_ids": [
    "42004"
  ],
  "order_date": "2020-06-30T00:00:00Z",
  "order_type": "Normal",
  "req_ship_date": "2020-06-30T00:00:00Z",
  "order_status": "Open Order",
  "sales_order_number": "497780",
  "sales_order_id": "497780",
  "company_trading_name": "CAPE PEN UNIVERSITY OF TECH",
  "sales_team_id": "LAB106",
  "currency": "R",
  "quote_id": "2006-106331047",
  "quote_date": "2020-06-26T08:17:57Z",
  "order_value": 1062000,
  "back_order_value": 675000,
  "reserved_value": 387000,
  "shipped_value": 0,
  "delivery_address": "Room A113,  Floor 1,  CPUT,  Bellville,Campus,  Symphony Way,  Bellville,  7530",
  "customer_name": "Fadia Alexander",
  "customerponumber": "CP265392",
  "dispatch_note_ids": [],
  "invoice_ids": [],
  "warehouse_note": "",
  "delivery_note": ""
}
   *
   *
   */

  salesOrders = salesOrders.map(order => {
    return {
      id: order.id,
      orderDate: moment(order.order_date).toDate(),
      salesOrderNumber: order.sales_order,
      shippingDate: order.req_ship_date,
      quoteId: order.quote_id || 'none',
      quoteDate: order.quote_date,
      orderType: order.order_type,
      orderStatus: order.order_status,
      iso: order.sales_order_id,
      salesTeam: order.sales_team_id,
      customer: order.company_trading_name,
      client: order.customer_name,
      poNumber: order.customerponumber,
      currency: order.currency,
      deliveryAddress: order.delivery_address,
      warehouseNote: order.warehouse_note,
      shipValue: order.shipped_value,
      value: order.order_value,
      reserveValue: order.reserved_value,
      backorderValue: order.back_order_value,
      dispatchCount: (order.dispatch_note_ids || []).length,
      invoiceCount: (order.invoices || []).length,
      dispatches: order.dispatch_note_ids || [],
      invoices: order.dispatch_invoices || []
    }


  });

  let result = {
    paging: pagingResult,
    salesOrders,
  };

  return result;

}

export const getPurchaseOrders = async (params) => {

  logger.debug(`GETTING PAGED PURCHASE ORDERS:: ${JSON.stringify(params)}`);

  const {
    productId,
    filterBy,
    search,
    paging = { page: 1, pageSize: 10 }
  } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  const purchaseOrdersIds = await lasecApi.PurchaseOrders.list(
    {
      filter: { product_id: productId },
      ordering: {},
      format: { ids_only: true },
      pagination: paging
    }).then();

  logger.debug(`GOT PO IDS:: ${purchaseOrdersIds.ids.length}`);

  let ids = [];

  if (isArray(purchaseOrdersIds.ids) === true) {
    ids = [...purchaseOrdersIds.ids];
  }

  let purchaseOrdersDetails = await lasecApi.PurchaseOrders.list({ filter: { ids: ids } }).then();
  logger.debug(`GOT PO DETAILS:: ${JSON.stringify(purchaseOrdersDetails.items[0])}`);
  let purchaseOrders = [...purchaseOrdersDetails.items];

  purchaseOrders = purchaseOrders.map(order => {
    return {
      id: order.id,
      dueDate: moment(order.due_date).toDate(),
      entryDate: moment(order.entry_date).toDate(),
      lastUpdateDate: moment(order.last_updated).toDate(),
      poNumber: order.purchase_order_number,
      shipInfo: order.ship_information,
      orderQuantity: order.order_quantity,
      receiptedQuantity: order.receipted_quantity
    }
  });

  let result = {
    paging: pagingResult,
    purchaseOrders,
  };

  return result;
}

export const getPurchaseOrderDetails = async (params) => {
  try {
    const { orderId, quoteId } = params;
    let apiFilter = { purchase_order_id: orderId };
    let purchaseOrdersItems = await lasecApi.PurchaseOrders.detail({ filter: apiFilter }).then();
    let purchaseOrderItems = [...purchaseOrdersItems.items];

    purchaseOrderItems = purchaseOrderItems.map(item => {
      return {
        code: item.product_code,
        description: item.product_description,
        orderQty: item.order_qty,
        etaDate: item.eta_date ? moment(item.eta_date).toDate() : '',
      }
    })

    return purchaseOrderItems;

  } catch (error) {
    throw new ApiError(`Error getting purchase order items: ${error}`);
  }

};

export const getPagedSalesOrders = async (params: any) => {

  logger.debug(`GETTING PAGED SALES ORDERS:: ${JSON.stringify(params)}`);

  const { paging, apiFilter } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let salesOrdersIds = await lasecApi.SalesOrders.list({
    filter: apiFilter,
    ordering: { order_date: "desc" },
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    }
  }).then();

  logger.debug(`PAGED SALES ORDERS IDS RESPONSE:: ${JSON.stringify(salesOrdersIds)}`);

  let ids = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  if (salesOrdersIds.pagination && salesOrdersIds.pagination.num_pages > 1) {
    pagingResult.total = salesOrdersIds.pagination.num_items;
    pagingResult.pageSize = salesOrdersIds.pagination.page_size || 10;
    pagingResult.hasNext = salesOrdersIds.pagination.has_next_page === true;
    pagingResult.page = salesOrdersIds.pagination.current_page || 1;
  }

  try {
    let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }).then();

    logger.debug(`SALES ORDER DETAILS RESPONSE:: ${JSON.stringify(salesOrdersDetails)}`);

    let salesOrders = salesOrdersDetails && salesOrdersDetails.items ? [...salesOrdersDetails.items] : [];

    logger.debug(`SALES ORDER:: ${JSON.stringify(salesOrders[0])}`);

    salesOrders = salesOrders.map(order => {
      return {
        id: order.id,
        salesOrderNumber: order.sales_order_number,
        orderType: order.order_type,
        orderStatus: order.order_status,
        orderDate: order.order_date,
        shippingDate: order.req_ship_date,
        quoteDate: order.quote_date,
        iso: order.sales_order_id,
        customer: order.company_trading_name,
        client: order.customer_name,
        poNumber: order.customerponumber,
        quoteId: order.quote_id,
        currency: order.currency,
        deliveryAddress: order.delivery_address,
        warehouseNote: order.warehouse_note,
        deliveryNote: order.delivery_note,
        salesTeam: order.sales_team_id,
        value: order.order_value,
        reserveValue: order.reserved_value,
        shipValue: order.shipped_value,
        backorderValue: order.back_order_value,
      }
    });

    let result = {
      paging: pagingResult,
      salesOrders,
    };

    return result;
  } catch (fetchRecordsError) {
    logger.error(`Error fetching sales orders - ${fetchRecordsError}`)
    throw fetchRecordsError
  }

}

export const getClientSalesOrders = async (params) => {

  logger.debug(` -- GETTING CLIENT SALES ORDERS --  ${JSON.stringify(params)}`);

  // -- POSSIBLE FILTERS --
  // any_field - done
  // date_range - done
  // order_date - done
  // shipping_date - done
  // quote_date - done
  // order_type - done
  // order_status - done
  // iso_number - done
  // po_number - done
  // quote_number - done
  // rep_code - done
  // order_value - done
  // reserve_value - done
  // ship_value - done
  // backorder_value - done

  // customer
  // client

  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    filterBy = "any_field",
    filter,
    dateFilter,
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let apiFilter = {
    customer_id: clientId,
    // [filterBy]: filter || search,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
    ordering: { order_date: "desc" },
  };

  if (filterBy == 'order_date' || filterBy == 'shipping_date' || filterBy == 'quote_date') {
    apiFilter.using = filterBy;
    apiFilter.start_date = moment(dateFilter).startOf('day');
    apiFilter.end_date = moment(dateFilter).endOf('day');
  }

  if (filterBy == 'order_type' || filterBy == 'order_status')
    apiFilter[filterBy] = filter;

  if (filterBy == 'any_field' || filterBy == 'iso_number' || filterBy == 'po_number' || filterBy == 'order_value' || filterBy == 'reserved_value' || filterBy == 'shipped_value' || filterBy == 'back_order_value' || filterBy == 'dispatches' || filterBy == 'quote_id' || filterBy == 'sales_team_id') {
    // if (search || search != '') apiFilter[filterBy] = search;
    apiFilter[filterBy] = search;
  }

  let salesOrdersIds = await lasecApi.SalesOrders.list({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    }
  }).then();

  let ids = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  if (salesOrdersIds.pagination && salesOrdersIds.pagination.num_pages > 1) {
    pagingResult.total = salesOrdersIds.pagination.num_items;
    pagingResult.pageSize = salesOrdersIds.pagination.page_size || 10;
    pagingResult.hasNext = salesOrdersIds.pagination.has_next_page === true;
    pagingResult.page = salesOrdersIds.pagination.current_page || 1;
  }

  let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }).then();
  let salesOrders = [...salesOrdersDetails.items];

  logger.debug(`SALES ORDER:: ${JSON.stringify(salesOrders[0])}`);

  salesOrders = salesOrders.map(order => {
    return {
      id: order.id,
      salesOrderNumber: order.sales_order_number,
      orderDate: order.order_date,
      shippingDate: order.req_ship_date,
      quoteDate: order.quote_date,
      orderType: order.order_type,
      orderStatus: order.order_status,
      iso: order.sales_order_id,
      customer: order.company_trading_name,
      client: order.customer_name,
      poNumber: order.customerponumber,
      quoteId: order.quote_id,
      currency: order.currency,
      deliveryAddress: order.delivery_address,
      warehouseNote: order.warehouse_note,
      deliveryNote: order.delivery_note,
      salesTeam: order.sales_team_id,
      value: order.order_value,
      reserveValue: order.reserved_value,
      shipValue: order.shipped_value,
      backorderValue: order.back_order_value,
      documentIds: order.document_ids
    }
  });

  let result = {
    paging: pagingResult,
    salesOrders,
  };

  return result;

}

export const getCRMSalesOrders = async (params) => {

  // -- POSSIBLE FILTERS --
  // any_field - done
  // date_range - done
  // order_date - done
  // shipping_date - done
  // quote_date - done
  // order_type - done
  // order_status - done
  // iso_number - done
  // po_number - done
  // quote_number - done
  // rep_code - done
  // order_value - done
  // reserve_value - done
  // ship_value - done
  // backorder_value - 3428.00

  // customer
  // client

  logger.debug(` -- GETTING CRM SALES ORDERS --  ${JSON.stringify(params)}`);

  const {
    search = "",
    periodStart,
    periodEnd,
    filterBy = "any_field",
    filter,
    customer = [],
    client = [],
    orderStatus,
    dateFilter,
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let me = await getLoggedIn360User().then();

  let apiFilter: any = {
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
    ordering: { order_date: "desc" },
  };

  if (filterBy == 'order_date' || filterBy == 'shipping_date' || filterBy == 'quote_date') {
    apiFilter.using = filterBy;
    apiFilter.start_date = moment(dateFilter).startOf('day');
    apiFilter.end_date = moment(dateFilter).endOf('day');
  }

  if (filterBy == 'order_type')
    apiFilter[filterBy] = filter;

  if (filterBy == 'any_field' || filterBy == 'iso_number' || filterBy == 'po_number' || filterBy == 'order_value' || filterBy == 'reserved_value' || filterBy == 'shipped_value' || filterBy == 'back_order_value' || filterBy == 'dispatches' || filterBy == 'quote_id') {
    apiFilter[filterBy] = search;
  }

  if (filterBy === 'customer') {
    apiFilter.customer_id = customer;
  }

  if (filterBy === 'client') {
    apiFilter.client_id = client
  }

  if (filterBy == 'sales_team_id') {
    apiFilter[filterBy] = filter;
  }

  const result = await getPagedSalesOrders({ paging, apiFilter });
  return result;
}

export const getSODocuments = async (args) => {
  logger.debug(`GETTING DOCUMENTS:: ${JSON.stringify(args)}`)

  const { ids } = args;

  if (ids && ids.length > 0) {

    let documents = await lasecApi.SalesOrders.documents({ filter: { ids: ids } }).then();
    documents = [...documents.items];
    documents = documents.map(doc => {
      return {
        id: doc.id,
        name: doc.name,
        url: doc.url,
      }
    });

    return documents;
  }

  return [];
}

export const deleteSalesOrdersDocument = async (args) => {

  const { id } = args;

  return {
    success: true,
    message: 'Document deleted successfully'
  }
}

export const getISODetails = async (params) => {

  const {
    orderId,
    quoteId
  } = params;

  let apiFilter = { sales_order_id: orderId };

  let salesOrdersIds = await lasecApi.SalesOrders.detail({ filter: apiFilter }).then();

  let ids = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  let salesOrdersDetail = await lasecApi.SalesOrders.detail({ filter: { ids: ids } }).then();
  let salesOrders = [...salesOrdersDetail.items];

  logger.debug(`SALES ORDERS:: ${JSON.stringify(salesOrders)}`);

  let lineItems = [];
  salesOrders.forEach(so => {

    if (so.product_code != '') {
      const item = {
        id: so.id,
        line: so.line,
        productId: so.product_id,
        productCode: so.product_code,
        productDescription: so.product_description,
        unitOfMeasure: so.unit_of_measure,
        price: so.price,
        totalPrice: so.total_price,
        orderQty: so.order_qty,
        shippedQty: so.shipped_qty,
        backOrderQty: so.back_order_qty,
        reservedQty: so.reserved_qty,
        comment: so.comment
      }

      lineItems.push(item);
    }
  })

  logger.debug(`LINE ITEMS TO RETURN :: ${JSON.stringify(lineItems)}`);

  // return lineItems;/
  return {
    lineItems,
    comments: []
  };
}

export const getClientInvoices = async (params) => {

  logger.debug(`GETTING PAGED CLIENT INVOICES:: ${JSON.stringify(params)}`);

  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    dateFilter,
    filterBy = "any_field",
    filter,
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  // -- POSSIBLE FILTERS --
  // any_field - done
  // date_range - done
  // invoice_date - done
  // invoice_number - done
  // po_number - done
  // quote_number - done
  // sales_team_id - done
  // iso_number - done
  // account_number - done

  // invoice_value -  Error
  // customer
  // client

  let apiFilter: any = {
    customer_id: clientId,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };

  if (filterBy == 'invoice_date') {
    apiFilter.using = filterBy;
    apiFilter.start_date = moment(dateFilter).startOf('day');
    apiFilter.end_date = moment(dateFilter).endOf('day');
  }

  if (filterBy == 'any_field' || filterBy == 'invoice_number' || filterBy == 'po_number' || filterBy == 'invoice_value' || filterBy == 'account_number' || filterBy == 'dispatch_number' || filterBy == 'iso_number' || filterBy == 'quote_number' || filterBy == 'sales_team_id') {
    apiFilter[filterBy] = search;
  }

  const invoiceIdsResponse = await lasecApi.Invoices.list({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10, current_page: paging.page
    },
    ordering: { "invoice_date": "desc" }
  }).then();

  logger.debug(`INVOICE COUNT:: ${invoiceIdsResponse.ids.length}`);

  let ids = [];

  if (isArray(invoiceIdsResponse.ids) === true) {
    ids = [...invoiceIdsResponse.ids];
  }

  if (invoiceIdsResponse.pagination && invoiceIdsResponse.pagination.num_pages > 1) {
    pagingResult.total = invoiceIdsResponse.pagination.num_items;
    pagingResult.pageSize = invoiceIdsResponse.pagination.page_size || 10;
    pagingResult.hasNext = invoiceIdsResponse.pagination.has_next_page === true;
    pagingResult.page = invoiceIdsResponse.pagination.current_page || 1;
  }

  let invoiceDetails = await lasecApi.Invoices.list({ filter: { ids: ids } }).then();
  let invoices = [...invoiceDetails.items];

  logger.debug(`INVOICE DETAIL:: ${JSON.stringify(invoices[0])}`);

  invoices = invoices.map(invoice => {
    return {
      id: invoice.id,
      invoiceDate: invoice.invoice_date,
      quoteDate: invoice.quote_date,
      quoteId: invoice.quote_id,
      customer: invoice.company_name,
      client: invoice.customer_name,
      dispatches: invoice.dispatch_note_ids.join(', '),
      accountNumber: invoice.account,
      salesTeamId: invoice.sales_team_id,
      poNumber: invoice.customer_po_number,
      value: invoice.invoice_value,
      isoNumber: invoice.sales_order_id
    }
  });

  let result = {
    paging: pagingResult,
    invoices,
  };

  return result;

}

export const getCRMInvoices = async (params) => {

  logger.debug(`GETTING PAGED CRM INVOICES:: ${JSON.stringify(params)}`);

  const {
    search = "",
    periodStart,
    periodEnd,
    dateFilter,
    filterBy = "any_field",
    filter,
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let me = await getLoggedIn360User().then();

  let apiFilter: any = {
    //customer_id: me.id,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };

  if (filterBy == 'invoice_date') {
    apiFilter.using = filterBy;
    apiFilter.start_date = moment(dateFilter).startOf('day');
    apiFilter.end_date = moment(dateFilter).endOf('day');
  }

  if (filterBy == 'any_field' || filterBy == 'invoice_number' || filterBy == 'po_number' || filterBy == 'invoice_value' || filterBy == 'account_number' || filterBy == 'dispatch_number' || filterBy == 'iso_number' || filterBy == 'quote_number') {
    apiFilter[filterBy] = search;
  }

  if (filterBy == 'sales_team_id') {
    apiFilter[filterBy] = filter;
  }

  const invoiceIdsResponse = await lasecApi.Invoices.list({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10, current_page: paging.page
    },
    ordering: { "invoice_date": "desc" }
  }).then();

  logger.debug(`INVOICE COUNT:: ${invoiceIdsResponse.ids.length}`);

  let ids = [];

  if (isArray(invoiceIdsResponse.ids) === true) {
    ids = [...invoiceIdsResponse.ids];
  }

  if (invoiceIdsResponse.pagination && invoiceIdsResponse.pagination.num_pages > 1) {
    pagingResult.total = invoiceIdsResponse.pagination.num_items;
    pagingResult.pageSize = invoiceIdsResponse.pagination.page_size || 10;
    pagingResult.hasNext = invoiceIdsResponse.pagination.has_next_page === true;
    pagingResult.page = invoiceIdsResponse.pagination.current_page || 1;
  }

  let invoiceDetails = await lasecApi.Invoices.list({ filter: { ids: ids } }).then();
  let invoices = [...invoiceDetails.items];

  invoices = invoices.map(invoice => {
    return {
      id: invoice.id,
      invoiceDate: invoice.invoice_date,
      quoteDate: invoice.quote_date,
      quoteId: invoice.quote_id,
      customer: invoice.company_name,
      client: invoice.customer_name,
      dispatches: invoice.dispatch_note_ids.join(', '),
      accountNumber: invoice.account,
      salesTeamId: invoice.sales_team_id,
      poNumber: invoice.customer_po_number,
      value: invoice.invoice_value,
      isoNumber: invoice.sales_order_id
    }
  });

  let result = {
    paging: pagingResult,
    invoices,
  };

  return result;

}

export const getClientSalesHistory = async (params) => {

  logger.debug(`GETTING PAGED CLIENT SALES HISTORY:: ${JSON.stringify(params)}`);

  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    filterBy = "any_field",
    filter,
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let apiFilter = {
    customer_id: clientId,
    order_status: 9,
    // [filterBy]: filter || search,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };

  const salesHistoryResponse = await lasecApi.Products.sales_orders({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    },
  }).then();

  logger.debug(`SALES HISTORY COUNT:: ${salesHistoryResponse.ids.length}`);

  let ids = [];

  if (isArray(salesHistoryResponse.ids) === true) {
    ids = [...salesHistoryResponse.ids];
  }

  if (salesHistoryResponse.pagination && salesHistoryResponse.pagination.num_pages > 1) {
    pagingResult.total = salesHistoryResponse.pagination.num_items;
    pagingResult.pageSize = salesHistoryResponse.pagination.page_size || 10;
    pagingResult.hasNext = salesHistoryResponse.pagination.has_next_page === true;
    pagingResult.page = salesHistoryResponse.pagination.current_page || 1;
  }

  let saleshistoryDetails = await lasecApi.Products.sales_orders({ filter: { ids: ids } }).then();
  let salesHistory = [...saleshistoryDetails.items];

  salesHistory = salesHistory.map(order => {
    return {
      id: order.id,
      orderType: order.order_type,
      orderDate: order.order_date,
      quoteDate: order.quote_date,
      quoteNumber: order.quote_id || '',
      iso: order.sales_order_id,
      dispatches: order.dispatch_note_ids.join(', '),
      customer: order.company_trading_name,
      client: order.customer_name,
      poNumber: order.sales_order_number,
      value: order.order_value,
      salesTeamId: order.sales_team_id,

      quoteId: order.quote_id,
      salesOrderNumber: order.sales_order_number,
      orderStatus: order.order_status,
      currency: order.currency,
      deliveryAddress: order.delivery_address,
      warehouseNote: order.warehouse_note,
      deliveryNote: order.delivery_note,
      salesTeam: order.sales_team_id,
    }
  });

  let result = {
    paging: pagingResult,
    salesHistory,
  };

  return result;

}

export const getSalesHistoryMonthlyCount = async (params) => {

  logger.debug(`GET TOTALS PARAMS:: ${JSON.stringify(params)}`);

  try {

    const {
      search = "",
      filterBy = "any_field",
    } = params;

    let _filter: any = {
      order_status: 9,
      start_date: moment().startOf('year').toISOString(),
      end_date: moment().endOf('day').toISOString(),
      totals: true
    };

    _filter[filterBy] = search;

    const salesHistoryResponse = await lasecApi.Products.sales_orders({
      filter: _filter,
      pagination: { page: 1, pageSize: 50 },
    }).then();

    logger.debug(`SALES HISTORY TOTALS:: ${JSON.stringify(salesHistoryResponse)}`);

    let years;
    years = Object.keys(salesHistoryResponse).map(_year => {
      return {
        year: +_year,
        total: salesHistoryResponse[_year].total,
        months: Object.keys(salesHistoryResponse[_year].month).map(_month => {
          return {
            month: +_month,
            total: salesHistoryResponse[_year].month[_month],
          }
        })
      }
    });

    return years;

  } catch (error) {

    return [];

  }
}

const fieldMaps: any = {
  "fullName": "first_name",
  "customer": "company_trading_name",
};

export const getCRMSalesHistory = async (params) => {

  let periodStart;
  let periodEnd;

  const {
    search = "",
    paging = { page: 1, pageSize: 10 },
    filterBy = "any_field",
    orderBy = "fullName",
    orderDirection = "asc",
    year,
    month,
    years,
    iter = 0,
    filter,
  } = params;

  logger.debug(`GETTING SALES HISTORY USING SEARCH ${JSON.stringify(params)}`);

  let ordering: { [key: string]: string } = {}
  if (orderBy) {
    let fieldKey: string = fieldMaps[orderBy];
    ordering[fieldKey] = orderDirection
  }

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  if (isString(search) === false || search.length < 3 || year == null) return {
    paging: pagingResult,
    salesHistory: [],
    year,
    month,
    years,
  };

  let _filter: any = {
    order_status: 9,
    start_date: moment().startOf('year').toISOString(),
    end_date: moment().endOf('day').toISOString(),
    totals: false
  };

  _filter[filterBy] = search;

  if (year) {
    _filter.start_date = moment([year]).startOf('year').toISOString();
    _filter.end_date = moment([year]).endOf('year').toISOString();
  }

  if (month != undefined) {
    logger.debug(`SETTING DATES PER MONTH:: ${month}`);
    let _year = year || moment().year();
    _filter.start_date = moment([_year, month]).startOf('month').toISOString();
    _filter.end_date = moment([_year, month]).endOf('month').toISOString();
  }

  const salesHistoryResponse = await lasecApi.Products.sales_orders({
    filter: _filter,
    pagination: { page_size: paging.pageSize || 10, current_page: paging.page },
    // ordering,
  }).then();

  // logger.debug(`SALES HISTORY RESPONSE:: ${JSON.stringify(salesHistoryResponse)}`);

  let ids = [];

  if (isArray(salesHistoryResponse.ids) === true) {
    ids = [...salesHistoryResponse.ids];
  }

  if (salesHistoryResponse.pagination && salesHistoryResponse.pagination.num_pages > 1) {
    pagingResult.total = salesHistoryResponse.pagination.num_items;
    pagingResult.pageSize = salesHistoryResponse.pagination.page_size || 10;
    pagingResult.hasNext = salesHistoryResponse.pagination.has_next_page === true;
    pagingResult.page = salesHistoryResponse.pagination.current_page || 1;
  }

  let saleshistoryDetails = await lasecApi.Products.sales_orders({ filter: { ids: ids } }).then();

  logger.debug(`SALES HISTORY DETAILS:: ${JSON.stringify(saleshistoryDetails)}`);

  let salesHistory = [...saleshistoryDetails.items];

  logger.debug(`SALES HISTORY RESULT:: ${JSON.stringify(salesHistory[0])}`);

  salesHistory = salesHistory.map(order => {
    return {
      id: order.id,
      accountNumber: order.account_number,
      customer: order.company_trading_name,
      client: order.customer_name,
      invoiceNumber: order.invoice_ids.length > 0 ? order.invoice_ids[0] : '', // THESE ARE IDS AND CAN BE MULTIPLE
      iso: order.sales_order_id,
      poNumber: order.customerponumber,
      orderDate: order.order_date,
    }
  });

  let result = {
    paging: pagingResult,
    year,
    month,
    years,
    salesHistory,
  };

  return result;

}

export const getFreightRequetQuoteDetails = async (params) => {

  logger.debug(`FREIGHT REQUEST PARAMS:: ${JSON.stringify(params)}`);

  const { quoteId } = params;

  let quoteDetail = await lasecApi.Quotes.getByQuoteId(quoteId).then();

  logger.debug(`QUOTE DETAIL:: ${JSON.stringify(quoteDetail)}`);


  let options = [];
  let productDetails = [];  

  logger.debug(`----------  GETTING OPTIONS FROM API ----------`);

  options = quoteDetail.quote_option_ids.map(async (optionId) => {

    let quoteOptionResponse = await lasecApi.Quotes.getQuoteOption(optionId).then();

    logger.debug(`QUOTE OPTIONS ${quoteId}:: ${JSON.stringify(quoteOptionResponse)}`);

    quoteOptionResponse = quoteOptionResponse.items[0];
    
    const paged_results: { lineItems: LasecQuoteItem[], item_paging: Reactory.IPagingResult } = await lasecGetQuoteLineItems(quoteId, optionId).then();

    logger.debug(`OPTION LINE ITEMS FOR::  ${quoteId} ${optionId}:: ${JSON.stringify(paged_results)}`);

    let optionItemDetails: any[] = [];

    if (paged_results.lineItems.length > 0) {
      optionItemDetails = paged_results.lineItems.map(li => {
        return {
          code: li.code,
          description: li.title,
          sellingPrice: li.totalVATExclusive,
          qty: li.quantity,
          unitOfMeasure: '',
          length: 0,
          width: 0,
          height: 0,
          volume: 0
        }
      });
    }

    return {
      name: quoteOptionResponse.name,
      transportMode: '',
      incoTerm: quoteOptionResponse.inco_terms || '',
      place: quoteOptionResponse.named_place || '',
      fromSA: false,
      vatExempt: false,
      totalValue: quoteOptionResponse.grand_total_incl_vat_cents,
      companyName: '',
      streetAddress: '',
      suburb: '',
      city: '',
      province: '',
      country: '',
      freightFor: '',
      offloadRequired: false,
      hazardous: 'non-hazardous',
      refrigerationRequired: false,
      containsLithium: false,
      sample: '',
      item_paging: paged_results.item_paging,
      // additionalDetails: quoteOptionResponse.special_comment || '',
      productDetails: optionItemDetails
    }

  });

  // }

  return {
    email: '',
    communicationMethod: 'attach_pdf',
    options
  };
}

export const updateFreightRequesyDetails = async (params) => {
  logger.debug(`UPDATE FREIGHT REQUEST DETAILS :: ${JSON.stringify(params)}`);

  const { quoteId, email, communicationMethod, options, productDetails } = params.freightRequestDetailInput;
  try {
    const freightRequestUpdate = await FreightRequest.findOneAndUpdate(
      { quoteId: quoteId },
      params.freightRequestDetailInput,
      { new: true, upsert: true }).exec();
    logger.debug(`SAVED FREIGHT REQUEST: ${JSON.stringify(freightRequestUpdate)}`);
    return {
      success: true,
      message: 'Save success'
    }
  } catch (error) {
    logger.debug(`ERROR UPDATING FREIGHT REQUEST:: ${JSON.stringify(error)}`);
    return {
      success: false,
      message: `Error updating freight request. ${error}`
    }
  }
}

export const duplicateQuoteForClient = async (params) => {
  try {
    const { quoteId, clientId } = params;

    const lasecClient = await lasecApi.Customers.list({
      filter: { ids: [clientId] }, ordering: {}, pagination: {
        enabled: false,
        current_page: 0,
        page_size: 10
      }
    }).then()

    if (!lasecClient) {
      logger.error(`No Client found`);
      throw new ApiError('Error copying quote. No client found.')
    }

    const copiedQuoteResponse = await lasecApi.Quotes.copyQuoteToCustomer({ quote_id: quoteId, customer_id: clientId }).then();
    if (!copiedQuoteResponse || copiedQuoteResponse.status != 'success') throw new ApiError('Error copying quote.');

    return {
      success: true,
      quoteId: copiedQuoteResponse.payload.id,
      message: `Quote successfully copied.`
    };

  } catch (error) {

    return {
      success: false,
      quoteId: '',
      message: error
    };

  }

}

export const createNewQuote = async (params) => {
  try {
    const { clientId, repCode } = params;

    const newQuoteResponse = await lasecApi.Quotes.createNewQuoteForClient({ customer_id: clientId, secondary_api_staff_user_id: repCode }).then();
    if (!newQuoteResponse || newQuoteResponse.status != 'success') throw new ApiError('Error creating new quote.');

    return {
      success: true,
      quoteId: newQuoteResponse.payload.quote_id,
      quoteOptionId: newQuoteResponse.payload.quote_option_id,
      message: `Quote successfully created.`
    };

  } catch (error) {
    return {
      success: false,
      quoteId: '',
      quoteOptionId: '',
      message: error
    };
  }
}

export const getQuoteComments = async (params) => {
  return await LasecQuoteComment.find({ quoteId: params.quote_id }).exec();
}

export const saveQuoteComment = async (params) => {

  logger.debug(`NEW COMMENT :: ${JSON.stringify(params)}`);

  try {

    let saveResult;

    if (params.commentId) {
      saveResult = await LasecQuoteComment.findByIdAndUpdate(params.commentId, {
        comment: params.comment
      }).exec();

      logger.debug(`COMMENT UPDATE RESPONSE :: ${JSON.stringify(saveResult)}`);

    } else {

      saveResult = await new LasecQuoteComment({
        who: global.user._id,
        quoteId: params.quoteId,
        comment: params.comment,
        when: new Date()
      }).save({});

      logger.debug(`NEW COMMENT SAVED :: ${JSON.stringify(saveResult)}`);
    }

    return {
      success: true,
      message: 'Saved successfully'
    }

  } catch (error) {
    logger.debug(`ERROR UPDATING COMMENT. ${error}`);
    throw new ApiError(`Error updating comment. ${error}`);
  }
}

export const deleteQuoteComment = async (params) => {
  try {
    await LasecQuoteComment.findByIdAndRemove(params.commentId);

    return {
      success: true,
      message: 'Comment successfully deleted.'
    }

  } catch (error) {
    return {
      success: false,
      message: `Error deleting comment. ${error}`
    }
  }
}

interface ILasecUpdateQuoteExpectedParams {
  //quote id
  item_id: string,
  quote_type: string,
  rep_code: string,
  //client foreign id
  client_id: string
  valid_until: Date
};

export const updateQuote = async (params: ILasecUpdateQuoteExpectedParams) => {

  logger.debug(`UPDATING QUOTE:: ${JSON.stringify(params)}`);

  try {
    const { item_id, quote_type, rep_code, client_id, valid_until } = params;
    const updateParams = { item_id, values: { quote_type } };
    if (rep_code) updateParams.values.sales_team_id = rep_code;
    if (client_id) updateParams.values.customer_id = client_id;
    if (valid_until) updateParams.values.valid_until = moment(valid_until).toISOString();

    const updateResult = await lasecApi.Quotes.updateQuote(updateParams).then();

    if (!updateResult)
      throw new ApiError(`Error updating quote. Error from api.`);

    logger.debug(`UPDATING QUOTE RESULT:: ${JSON.stringify(updateResult)}`);

    return {
      success: true,
      message: `Quote ${params.item_id} successfully updated. 👌`
    };

  } catch (error) {
    //throw new ApiError(`Error updating quote. ${error}`);

    return {
      success: false,
      message: `Quote ${params.item_id} could not be updated. 😒 👉 ${error.message}`
    };
  }

}

export const updateQuoteLineItems = async (params) => {

  logger.debug(`UPDATING QUOTE LINE ITEMS:: ${JSON.stringify(params)}`);

  try {
    const { quote_id, lineItemIds, gp, mup, agentCom, freight } = params;

    if (gp > 100)
      throw new ApiError('GP Percent must be less than 100%');

    const itemPromises = lineItemIds.map((id: string) => {
      const updateParams = {
        item_id: id,
        values: {
          gp_percent: gp,
          mark_up: mup,
          agent_commission: agentCom,
        }
      }
      return lasecApi.Quotes.updateQuoteItems(updateParams);
    });

    const freightParams = {
      item_id: 'NLSCFREIGHT ',
      values: {
        unit_price_cents: freight * 100
      }
    }
    const freightItemPromise = lasecApi.Quotes.updateQuoteItems(freightParams);
    itemPromises.push(freightItemPromise);

    await Promise.all(itemPromises)
      .then(async result => logger.debug(`All promises complete :: ${JSON.stringify(result)}`))
      .catch(error => {
        logger.debug(`Error running all promises:: ${JSON.stringify(error)}`);
        throw new ApiError(`Error running all promises :: ${error}`)
      });

    return {
      success: true,
      message: 'Quote line items updated successully.'
    }


  } catch (error) {
    throw new ApiError(`Error updating quote lineitems. ${error}`);
  }
}

export const getCompanyDetails = async (params) => {
  try {
    let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [params.id] } }).then();
    let customerObject = {};
    if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
      customerObject = {
        ...om(companyPayloadResponse.items[0], {
          'company_id': 'id',
          'registered_name': 'registeredName',
          'description': 'description',
          'trading_name': 'tradingName',
          "registration_number": 'registrationNumber',
          "vat_number": "taxNumber",
          'organization_id': 'organizationId',
          'currency_code': 'currencyCode',
          'currency_symbol': 'currencySymbol',
          'currency_description': 'currencyDescription',
          "credit_limit_total_cents": "creditLimit",
          "current_balance_total_cents": "currentBalance",
          "current_invoice_total_cents": "currentInvoice",
          "30_day_invoice_total_cents": "balance30Days",
          "60_day_invoice_total_cents": "balance60Days",
          "90_day_invoice_total_cents": "balance90Days",
          "120_day_invoice_total_cents": "balance120Days",
          "credit_invoice_total_cents": "creditTotal"
        })
      };
    }

    return customerObject;

  } catch (error) {
    throw new ApiError(`Error getting customer details:: ${error}`);
  }
}

export const deleteQuote = async (params) => {

  try {
    let companyPayloadResponse = await lasecApi.Quotes.deleteQuote(params.id).then();

    if (!companyPayloadResponse) throw new ApiError(`Error deleting quote!`);

    return {
      success: true,
      message: 'Quote successfully deleted!'
    }

  } catch (error) {
    throw new ApiError(`Error deleting quote:: ${error}`);
  }

}



