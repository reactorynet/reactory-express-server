'use strict'
import moment, { Moment } from 'moment';
import lodash, { isArray, isNil, isString } from 'lodash';
import { ObjectID, ObjectId } from 'mongodb';
import om from 'object-mapper';
import gql from 'graphql-tag';
import uuid from 'uuid';
import lasecApi, { LasecApiException, LasecNotAuthenticatedException } from '@reactory/server-modules/lasec/api';
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
import LasecSalesOrderComment from '@reactory/server-modules/lasec/models/LasecSalesOrderComment';


import {
  LasecQuote,
  LasecDashboardSearchParams,
  LasecProductDashboardParams,
  USER_FILTER_TYPE,
  DATE_FILTER_PRESELECT,
  Lasec360User,
  LasecQuoteItem,
  Lasec360QuoteLineItem,
  Lasec360Credentials,
  LasecGetFreightRequestQuoteParams,
  LasecQuoteOption,
  FreightRequestOption,
  LasecGetPageQuotesParams,
  IQuoteService,
  ILasecLoggingService,
  LasecCurrency
} from '../types/lasec';


import CONSTANTS, { LOOKUPS, OBJECT_MAPS } from '../constants';
import { Reactory } from '@reactory/server-core/types/reactory';
import { argsToArgsConfig } from 'graphql/type/definition';
import Api from '@reactory/server-modules/lasec/api';
import ReactoryFileModel from '@reactory/server-modules/core/models/CoreFile';
import { PagingResult } from 'database/types';

const lookups = CONSTANTS.LOOKUPS;

const maps = { ...OBJECT_MAPS };


/**
 * Transforms meta data into totals object
 * @param meta meta data to use for transformation
 */
export const totalsFromMetaData: any = (meta: any) => {
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

export const synchronizeQuote = async (quote_id: string, owner: any, source: any = null, map: any = true, context: Reactory.IReactoryContext) => {
  logger.debug(`synchronizeQuote called ${quote_id}`)
  const quoteSyncTimeout = 3;


  let _source = source;
  let _quoteDoc: LasecQuote | null;
  const _predicate = {
    'meta.reference': quote_id,
    'meta.owner': owner || context.partner.key,
  }

  const now = moment();

  const _existing: LasecQuote = await Quote.findOne(_predicate).then();

  if (_source === null) {
    _source = await lasecApi.Quotes.getByQuoteId(quote_id, undefined, context).then();
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
        lastSync: now.toDate(),
        nextSync: moment(now).add(quoteSyncTimeout, 'minutes').toDate(),
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
        what: `Initial Sync with reactory trigger by ${context.user.fullName(true)}`,
        who: context.user._id,
        notes: `Initial import from Lasec360 API.`
      });

      return _newQuote;
    }
  } catch (createError) {
    logger.error('Error while upserting remote document', createError);
    throw createError;
  }

};

const credsFromAuthentication = (authentication: Reactory.IAuthentication) => {
  if (authentication && authentication.props) {
    if (authentication.props.username && authentication.props.password) {
      return authentication.props as Lasec360Credentials;
    } {
      return { ...authentication.props, username: '', password: '' }
    }
  }

}

export const LoggedInLasecUserHashKey = ($partner: Reactory.IReactoryClientDocument, $user: Reactory.IUserDocument) => {
  if ($user === null || $user === undefined) throw new ApiError(`$user us a required parameter`, user)
  let _authentication: Reactory.IAuthentication = null;

  if ($user) {
    _authentication = $user.getAuthentication("lasec");
  }

  if (!_authentication) {
    throw new LasecNotAuthenticatedException(`User is not currently authentication with 360`);
  }

  const lasec_creds: Lasec360Credentials = credsFromAuthentication(_authentication);
  if (lasec_creds && lasec_creds.payload) {
    let staff_user_id: string = "";
    staff_user_id = `${_authentication.props.payload.user_id}`;
    return `LOGGED_IN_360_USER_${$partner._id}_${$user._id}_${staff_user_id}`;
  } else {
    throw new LasecNotAuthenticatedException("User does not have 360 credentials, please try logging in");
  }

}

export const getLoggedIn360User = async function (skip_cache: boolean = false, context: Reactory.IReactoryContext): Promise<Lasec360User> {
  const { user } = context;
  if (user._id === "ANON" || user.id === 'ANON') {
    logger.debug("🚨 Anon User Cannot Retrieve Authentications");
    return null;
  }
  if (user === null || user === undefined) throw new ApiError(`GLOBAL USER OBJECT IS NULL`, user)

  if (typeof user.getAuthentication === 'function') {
    const _authentication = user.getAuthentication("lasec");

    if (!_authentication) {
      throw new LasecNotAuthenticatedException('User has no authentication entry for Lasec');
    }

    const _lasec_creds: Lasec360Credentials = credsFromAuthentication(_authentication);
    if (_lasec_creds && _lasec_creds.payload) {
      let staff_user_id: string = "";
      staff_user_id = `${_lasec_creds.payload.user_id}`;

      const hashkey = LoggedInLasecUserHashKey(context.partner, user);
      let me360 = await getCacheItem(hashkey, null, 60, context.partner).then();
      if (me360 === null || skip_cache === true) {
        me360 = await lasecApi.User.getLasecUsers([staff_user_id], "ids", context).then();
        if (me360.length === 1) {
          me360 = me360[0];
          //fetch any other data that may be required for the data fetch
        }
      }

      if (me360) {
        setCacheItem(hashkey, me360, 60, context.partner);
        logger.debug(`Updated Cache item for ${hashkey} 🟢`)
      }

      logger.debug(`me360 ===>`, me360)
      return me360;
    }
  } else {

    throw new LasecNotAuthenticatedException('No lasec credentials available');
  }


};

export const setLoggedInUserProps = async (active_rep_code: string, active_company: string, context: Reactory.IReactoryContext): Promise<Lasec360User> => {
  logger.debug(`Helpers.ts setLoggedInUserProps(active_rep_code, active_company)`, { active_rep_code, active_company })

  let company_id = 2; // sa
  let companyName = 'Lasec SA';

  switch (`${active_company}`.toLowerCase()) {
    case 'lasec-international':
    case 'lasec_international':
    case 'lasecinternational': {
      company_id = 4;
      companyName = 'Lasec International';
      break;
    }
    case 'lasec_education':
    case 'lasec-education':
    case 'laseceducation': {
      company_id = 5;
      companyName = 'Lasec Education';
      break;
    }
    case 'lasec_sa':
    case 'lasec-sa':
    case 'LasecSA':
    default: {
      company_id = 2;
    }
  }

  let result = await lasecApi.User.setActiveCompany(company_id, context).then()
  logger.debug(`Result from setting active company`, { result });
  return getLoggedIn360User(true, context);

};

export const getTargets = async (params: LasecDashboardSearchParams, context: Reactory.IReactoryContext) => {
  const { periodStart, periodEnd, teamIds, repIds, agentSelection } = params;
  logger.debug(`QuoteResolver.getTargets(params)`, params);
  let userTargets: number = 0;
  try {

    const { user } = context;
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
        userTargets = await lasecApi.User.getUserTargets(teamIds, 'sales_team_id', context).then();
        break;
      }
      case "custom": {
        logger.debug(`Finding Targets for USERS `, repIds);
        userTargets = await lasecApi.User.getUserTargets(repIds, 'ids', context).then();
        break;
      }
      case "me":
      default: {
        logger.debug(`Finding Targets for LOGGED IN USER `, repIds);
        userTargets = await lasecApi.User.getUserTargets([`${staff_user_id}`], 'ids', context).then();
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
export const getLasecQuoteById = async (quote_id: string, partner: Reactory.IReactoryClientDocument, context: Reactory.IReactoryContext) => {
  try {
    const owner = partner.key;
    let quote = await synchronizeQuote(quote_id, owner, null, true, context).then();
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

export const getSalesDashboardData = async (params: any, context: Reactory.IReactoryContext) => {

  let me: any = await getLoggedIn360User(false, context).then();
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

  const debresults: any = await mysql(`CALL LasecGetSalesDashboardData ('${moment(apiFilter.start_date).format('YYYY-MM-DD HH:mm:ss')}', '${moment(apiFilter.end_date).format('YYYY-MM-DD HH:mm:ss')}',  ${me.id}, 'me');`, 'mysql.lasec360', undefined, context).then()

  let quotes: any[] = debresults[1];
  let invoices: any[] = debresults[2];
  let isos: any[] = debresults[3];
  let quotesByStatus: any[] = []; //dbresults[4];

  if (apiFilter.rep_codes && apiFilter.rep_codes.length > 0) {
    lodash.remove(quotes, (quote: any) => lodash.intersection(apiFilter.rep_codes, [quote.sales_team_id]).length === 1);
  }

  //perform a lightweight map
  const quoteSyncResult = await Promise.all(quotes.map((quote: any) => {
    return synchronizeQuote(quote.id, context.partner.key, quote, true, context);
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


export const getQuotes = async (params: any, context: Reactory.IReactoryContext) => {

  let me = await getLoggedIn360User(false, context).then();
  logger.debug(`Fetching Lasec Dashboard Data as ${me.firstName} `, params, me);
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

  const debresults: any = await mysql(`CALL LasecGetSalesDashboardData ('${moment(apiFilter.start_date).format('YYYY-MM-DD HH:mm:ss')}', '${moment(apiFilter.end_date).format('YYYY-MM-DD HH:mm:ss')}',  ${me.id}, 'me');`, 'mysql.lasec360', undefined, context).then()


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
    return synchronizeQuote(quote.id, context.partner.key, quote, true, context);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  // logger.debug(`QUOTES ${JSON.stringify(quotes.slice(0, 5))}`);

  amq.raiseWorkFlowEvent('quote.list.refresh', quotes, context.partner);

  return quotes;


};

export const getInvoices = async ({ periodStart, periodEnd, teamIds = [], repIds = [], agentSelection = 'me' }: any, context: Reactory.IReactoryContext) => {

  //holds a list of our detail promises
  let idsQueryResults: any = null;
  let invoice_details_promises: Promise<any>[] = [];
  let ids_to_request: any = [];
  let invoice_items: any[] = [];

  let filter: any = {
    start_date: periodStart,
    end_date: periodEnd
  };

  const me360 = await getLoggedIn360User(false, context).then();

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
    idsQueryResults = await lasecApi.Invoices.list({ filter: filter, pagination: { page_size: 10, enabled: true, current_page: 1 }, ordering: { "invoice_date": "asc" } }, context).then();
    if (lodash.isArray(idsQueryResults.ids) === true) {
      ids_to_request = [...idsQueryResults.ids] //spread em
    }

    if (idsQueryResults.pagination && idsQueryResults.pagination.num_pages > 1) {

      let more_ids_promises: Promise<any>[] = []

      const max_pages = idsQueryResults.pagination.num_pages;
      logger.debug(`Period requires paged invoice result fetching ${max_pages} id pages`)
      for (let pageIndex = idsQueryResults.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        more_ids_promises.push(lasecApi.Invoices.list({ filter: filter, pagination: { page_size: 10, enabled: true, current_page: pageIndex }, ordering: { "invoice_date": "asc" } }, context));
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
      invoice_details_promises.push(lasecApi.Invoices.list({ filter: { ids: _ids_to_fetch }, ordering: { "invoice_date": "asc" }, pagination: { page_size: _ids_to_fetch.length, current_page: 1, enabled: true } }, context));
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

export const getISOs = async (dashparams: LasecDashboardSearchParams, context: Reactory.IReactoryContext) => {

  const { periodStart, periodEnd, agentSelection, teamIds } = dashparams;
  logger.debug(`QuoteResolver getISOs({ ${periodStart}, ${periodEnd} })`);


  let ids_to_request: any[] = [];
  let idsQueryResults: any = null;
  let iso_fetch_promises = [];
  let iso_items: any[] = [];


  let isoQueryParams: any = {
    filter: { order_status: "1", start_date: periodStart, end_date: periodEnd },
    ordering: { order_date: "desc" },
    pagination: { enabled: true, page_size: 20 }
  };

  const me360 = await getLoggedIn360User(false, context).then();

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
    idsQueryResults = await lasecApi.PurchaseOrders.list({ filter: isoQueryParams.filter, pagination: { page_size: 10, enabled: true, current_page: 1 }, ordering: { order_date: "desc" } }, context).then();
    if (lodash.isArray(idsQueryResults.ids) === true) {
      ids_to_request = [...idsQueryResults.ids] //spread em
    }

    if (idsQueryResults.pagination && idsQueryResults.pagination.num_pages > 1) {

      let more_ids_promises: Promise<any>[] = []

      const max_pages = idsQueryResults.pagination.num_pages;
      logger.debug(`Period requires paged invoice result fetching ${max_pages} id pages`)
      for (let pageIndex = idsQueryResults.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        more_ids_promises.push(lasecApi.PurchaseOrders.list({ filter: isoQueryParams.filter, pagination: { page_size: 10, enabled: true, current_page: pageIndex }, ordering: { "order_date": "asc" } }, context));
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
      iso_fetch_promises.push(lasecApi.PurchaseOrders.list({ filter: { ids: _ids_to_fetch }, ordering: { "order_date": "asc" }, pagination: { page_size: _ids_to_fetch.length, current_page: 1, enabled: true } }, context));
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
export const getNextActionsForUser = async ({ periodStart, periodEnd, user, actioned = false }: any, context: Reactory.IReactoryContext) => {

  let $user = user;
  if (!$user) $user = context.user;

  try {
    if (!$user) throw new ApiError("Invalid user data", user);
    logger.debug(`Fetching nextActions (Quote Reminders) for user:: ${$user.firstName} ${$user.lastName} [${$user.email}]`);
    logger.debug(`Fetching nextActions (Period) for user:: ${periodStart} - ${periodEnd}`);
    const reminders = await QuoteReminder.find({
      // owner: user._id,
      who: $user._id,
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
export const getQuoteEmails = async (quote_id: string, context: Reactory.IReactoryContext) => {

  return new Promise((resolve, reject) => {
    clientFor(context.user, context.partner).query({
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

    const titleFromKey = (_k: string) => {
      const _m: any = {
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

export const groupQuotesByProduct = async (quotes: LasecQuote[], context: Reactory.IReactoryContext) => {

  const groupsByKey: any = {};

  const quotesByProductClass: QuotesByProductClassMap = {};
  try {
    const lineitemsPromises = quotes.map((quote: LasecQuote) => { lasecGetQuoteLineItems(quote.id, null, 1, 100, context) })
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

export const lasecGetProductDashboard = async (dashparams: any, context: Reactory.IReactoryContext) => {

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

  let periodLabel = `Product Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${context.user.firstName} ${context.user.lastName}`;

  /*
    let cacheKey = `productQuote.dashboard.${user._id}.${periodStart.valueOf()}.${periodEnd.valueOf()}`;
    let _cached = await getCacheItem(cacheKey);

    if(_cached) {
      logger.debug('Found results in cache');
      periodLabel = `${periodLabel} [cache]`;
      return _cached;
    }
  */

  let palette = context.partner.colorScheme();
  logger.debug('Fetching Quote Data');
  let quotes = await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection, productClass }, context).then();
  logger.debug(`QUOTES:: (${quotes.length})`);
  const targets = await getTargets({ periodStart, periodEnd, teamIds, repIds, agentSelection, period: DATE_FILTER_PRESELECT.CUSTOM }, context).then();
  logger.debug('Fetching Next Actions for User, targets loaded', { targets });
  const nextActionsForUser = await getNextActionsForUser({ periodStart, periodEnd, user: context.user }, context).then();
  logger.debug(`Fetching invoice data ${periodStart.format('YYYY-MM-DD HH:mm')} ${periodEnd.format('YYYY-MM-DD HH:mm')} ${context.user.firstName} ${context.user.lastName}`);
  const invoices = await getInvoices({
    periodStart,
    periodEnd,
    teamIds: teamIds.length === 0 ? null : teamIds,
    repIds,
    agentSelection
  }, context).then();
  logger.debug(`Found ${isArray(invoices) ? invoices.length : '##'} invoices`)
  logger.debug('Fetching isos');
  const isos = await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection, period: DATE_FILTER_PRESELECT.CUSTOM }, context).then();
  logger.debug(`Found ${isArray(isos) ? isos.length : '##'} isos`);



  const quoteProductFunnel: any = {
    chartType: 'FUNNEL',
    data: [],
    options: {},
    key: `quote-product/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`,
  };

  const quoteProductPie: any = {
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

  const quoteISOPie: any = {
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

  const quoteINVPie: any = {
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

  const quoteStatusComposed: any = {
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
        stroke: `${context.partner.themeOptions.palette.primary1Color}`,
      },
      bar: {
        dataKey: 'isos',
        dataLabel: 'Total ISO',
        name: 'Sales Orders',
        stroke: `${context.partner.themeOptions.palette.primary2Color}`,
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

  const productDashboardResult: any = {
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
      owner: context.user,
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

export const lasecGetQuoteLineItem = async (id: string, context: Reactory.IReactoryContext): Promise<LasecQuoteItem> => {
  const line_item_result: Lasec360QuoteLineItem = await lasecApi.Quotes.getLineItem(id, context).then();

  const line_item: LasecQuoteItem = om.merge(line_item_result, line_item_map) as LasecQuoteItem;
  line_item.meta.source = line_item_result;

  return line_item;
};


export const lasecGetQuoteLineItems = async (code: string, active_option: string = 'all', page = 1, pageSize = 25, context: Reactory.IReactoryContext): Promise<any> => {
  const keyhash = `quote.${code}-${active_option}.lineitems.${page}-${pageSize}`;

  //let cached = await getCacheItem(keyhash);
  //if (cached) logger.debug(`Found Cached Line Items For Quote: ${code}`);

  //if (lodash.isNil(cached) === true) {
  let lineItems = []
  let result = await lasecApi.Quotes.getLineItems(code, active_option, pageSize, page, context).then();

  logger.debug(`Helpers.ts -> lasecGetQuoteLineItems() => Got results from API`, { records: result.line_items.length, paging: result.item_paging })

  lineItems = result.line_items;


  logger.debug(`Found line items for quote ${code}:\n${JSON.stringify(lineItems, null, 2)}`);

  if (lineItems.length == 0) return [];

  lodash.sortBy(lineItems, (e) => `${e.quote_heading_id || -1}-${e.position}`)

  lineItems = om.merge(result.line_items, line_items_map) as LasecQuoteItem[];


  //setCacheItem(keyhash, cached, 25).then();
  //}

  return { lineItems, item_paging: result.item_paging };
}

export const LasecSendQuoteEmail = async (params: { code: string, mailMessage: any }, context: Reactory.IReactoryContext) => {
  const { code, mailMessage } = params;

  const { subject, message, to, cc = [], bcc = [], from, attachments = [] } = mailMessage;
  const { user } = context;

  if (user.email !== from.email) throw new ApiError('Cannot send an email on behalf of another account. You can only send emails on behalf of yourself.', { HereBeDragons: true });

  let mailResponse = { success: true, message: `Customer mail sent successfully!` };

  if (user.getAuthentication("microsoft") !== null) {
    await clientFor(user, context.partner).mutate({
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
export const getPagedQuotes = async (params: LasecGetPageQuotesParams, context: Reactory.IReactoryContext) => {

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

  logger.debug(`🚨🚨getPagedQuotes(${JSON.stringify(params, null, 2)})`);

  let ordering: { [key: string]: string } = {}
  let lasec_user: Lasec360User = await getLoggedIn360User(false, context).then();

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
    sales_team_id: lasec_user.sales_team_id,
  };

  const DEFAULT_FILTER = {
    rep_id: lasec_user.sales_team_id,
  }

  const empty_result: any = {
    paging: pagingResult,
    quotes: [],
  }

  const empty_response: any = {
    paging: pagingResult,
    periodStart,
    periodEnd,
    filter,
    filterBy,
    quotes: []
  };

  switch (filterBy) {
    case "any_field": {
      delete apiFilter.start_date;
      delete apiFilter.end_date;

      if (isString(search) === false && filter === undefined) apiFilter = DEFAULT_FILTER;
      else apiFilter.any_field = search;

      if (search.length > 0) delete apiFilter.sales_team_id;

      break;
    }
    case "date_range": {
      delete apiFilter.date_range;

      apiFilter.start_date = periodStart ? moment(periodStart).toISOString() : moment().startOf('year');
      apiFilter.end_date = periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day');

      if (search && search.length >= 3) {
        apiFilter.any_field = search;
      }

      delete apiFilter.sales_team_id;

      break;
    }
    case "quote_number": {

      if (isString(search) === false && filter === undefined) {
        return empty_response;
      }

      apiFilter.ids = [search];
      delete apiFilter.sales_team_id;

      break;
    }
    case "quote_date": {
      apiFilter.created = moment(filter).format('YYYY-MM-DD')
      delete apiFilter.sales_team_id;
      break;
    }
    case "quote_status": {
      //HACK to ensure the quote status filter works
      apiFilter.quote_status = `${filter},${filter}`;
      delete apiFilter.sales_team_id;
      break;
    }
    case "total_value": {
      let total_value: number = parseInt(parseFloat(search || "100").toFixed(2)) * 10;
      apiFilter.total_value = total_value;
      delete apiFilter.sales_team_id;
      break;
    }
    case "client": {
      //apiFilter.full_name = search;
      apiFilter.customer_name = search;
      delete apiFilter.sales_team_id;
      break;
    }
    case "customer": {
      //apiFilter.registered_name = search;
      apiFilter.company_name = search;
      delete apiFilter.sales_team_id;
      break;
    }
    case "account_number": {
      //apiFilter.account_number = search;
      apiFilter.account_number = search;
      delete apiFilter.sales_team_id;
      break;
    }
    case "quote_type": {
      apiFilter.quote_type = filter;
      delete apiFilter.sales_team_id;
      break;
    }
    case "rep_code": {
      apiFilter.sales_team_id = filter || lasec_user.sales_team_id
      break;
    }
  }

  if (quoteDate) {
    apiFilter.start_date = moment(quoteDate).startOf('day').toISOString();
    apiFilter.end_date = moment(quoteDate).endOf('day').toISOString();
  }

  let ids: string[] = [];

  if (filterBy !== 'quote_number') {
    let quoteResult = await lasecApi.Quotes.list({
      filter: apiFilter,
      pagination: { page_size: paging.pageSize || 10, current_page: paging.page },
      ordering,
      format: { "ids_only": true },
    }, context).then();


    if (isArray(quoteResult.ids) === true) {
      ids = [...quoteResult.ids];
    }

    if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
      pagingResult.total = quoteResult.pagination.num_items;
      pagingResult.pageSize = quoteResult.pagination.page_size || 10;
      pagingResult.hasNext = quoteResult.pagination.has_next_page === true;
      pagingResult.page = quoteResult.pagination.current_page || 1;
    }

  } else {
    ids = apiFilter.ids;
  }


  let quotes = [];

  if (ids.length > 0) {
    let quoteDetails = await lasecApi.Quotes.list({ filter: { ids: ids } }, context).then();
    logger.debug(`Fetched Expanded View for (${quoteDetails.items.length}) Quotes from API`);
    quotes = [...quoteDetails.items];


    logger.debug(`QUOTE DOC:: ${JSON.stringify(quotes[0])}`);

    const quoteSyncResult = await Promise.all(quotes.map((quote) => {
      return synchronizeQuote(quote.id, context.partner.key, quote, true, context);
    })).then();

    logger.debug(`QUOTE DOC:: ${JSON.stringify(quoteSyncResult[0])}`);

    quotes = quoteSyncResult.map(doc => doc);

  }

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
  periodEnd: any,
  quoteDate: string,
  dateFilter: string,
  filterBy?: string,
  filter?: string,
  paging: {
    page: number,
    pageSize: number
  }
  iter?: number,
}



export const getPagedClientQuotes = async (params: PagedClientQuotesParams, context: Reactory.IReactoryContext): Promise<any> => {

  logger.debug(`GETTING PAGED CLIENT QUOTES:: ${JSON.stringify(params)}`);


  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    quoteDate,
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

  const empy_result: any = {
    paging: pagingResult,
    quotes: [],
  };

  let lasec_user: Lasec360User = await getLoggedIn360User(false, context).then();

  // if (filterBy === "any_field" || search.length < 3) {
  // return empy_result;
  // }

  let apiFilter = {
    customer_id: clientId,
    // [filterBy]: search,
    // start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    // end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };
  const DEFAULT_FILTER = {
    customer_id: clientId,
  }

  const empty_response: any = {
    paging: pagingResult,
    periodStart,
    periodEnd,
    filter,
    filterBy,
    clientId,
    quotes: []
  };

  switch (filterBy) {
    case 'any_field': {
      delete apiFilter.start_date
      delete apiFilter.end_date
      if (isString(search) === false && filter === undefined) apiFilter = DEFAULT_FILTER;
      else apiFilter.any_field = search;
      break;
    }
    case "date_range": {
      delete apiFilter.date_range;
      apiFilter.start_date = periodStart ? moment(periodStart).toISOString() : moment().startOf('year');
      apiFilter.end_date = periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day');
      if (search && search.length >= 3) apiFilter.any_field = search;
      break;
    }
    case "quote_date": {
      apiFilter.using = filterBy;
      apiFilter.start_date = moment(filter).startOf('day').toISOString();
      apiFilter.end_date = moment(filter).endOf('day').toISOString();
      break;
    }
    case "quote_number": {
      if (search === '') return empty_response;
      delete apiFilter.customer_id;
      apiFilter[filterBy] = search;
      break;
    }
    case "quote_status": {
      if (filter === undefined) return empty_response;
      apiFilter.quote_status = `${filter},${filter}`;
      break;
    }
    case "customer": {
      if (search === '') return empty_response;
      apiFilter.company_name = search;
      break;
    }
    case "account_number": {
      apiFilter.account_number = search;
      break;
    }
    case "quote_type": {
      apiFilter.quote_type = filter;
      break;
    }
    case "rep_code": {
      apiFilter.sales_team_id = filter || lasec_user.sales_team_id
      break;
    }
    default: {
      logger.error(`NO MATCHING FILTERBY OPTIONS!!!!!`);
      break;
    }
  }

  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: paging.pageSize || 10, current_page: paging.page } }, context).then();

  let ids: string[] = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    pagingResult.total = quoteResult.pagination.num_items;
    pagingResult.pageSize = quoteResult.pagination.page_size || 10;
    pagingResult.hasNext = quoteResult.pagination.has_next_page === true;
    pagingResult.page = quoteResult.pagination.current_page || 1;
  }

  let quoteDetails = await lasecApi.Quotes.list({ filter: { ids: ids } }, context).then();
  logger.debug(`Fetched Expanded View for (${quoteDetails.items.length}) Quotes from API`);
  let quotes = [...quoteDetails.items];

  const quoteSyncResult = await Promise.all(quotes.map((quote) => {
    return synchronizeQuote(quote.id, context.partner.key, quote, true, context);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  let result = {
    clientId,
    paging: pagingResult,
    search,
    filterBy,
    quotes,
  };

  return result;
}

export const getSalesOrders = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(`GETTING PAGED SALES ORDERS:: ${JSON.stringify(params)}`);

  const {
    productId,
    id,
    image,
    code,
    description,
    unitOfMeasure,
    price,
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
    }, context).then();

  logger.debug(`GOT IDS:: ${salesOrdersIds.ids.length}`);

  let ids: string[] = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }, context).then();
  logger.debug(`GOT DETAILS:: ${JSON.stringify(salesOrdersDetails.items[0])}`);
  let salesOrders = [...salesOrdersDetails.items];

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
      invoices: order.dispatch_invoices || [],
      orderQty: order.order_qty,
      shipQty: order.ship_qty,
      reservedQty: order.reserved_qty,
      backOrderQty: order.back_order_qty
    }
  });

  const totals = salesOrders.reduce((acc, obj) => {
    return {
      orderQty: acc.orderQty + obj.orderQty,
      shipQty: acc.shipQty + obj.shipQty,
      reservedQty: acc.reservedQty + obj.reservedQty,
      backOrderQty: acc.backOrderQty + obj.backOrderQty
    }
  }, { orderQty: 0, shipQty: 0, reservedQty: 0, backOrderQty: 0 });

  let result = {
    paging: pagingResult,
    salesOrders,
    totals,
    id: productId,
    image,
    code,
    description,
    unitOfMeasure,
    price
  };

  return result;

}

export const getPurchaseOrders = async (params: any, context: Reactory.IReactoryContext) => {

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
    }, context).then();

  logger.debug(`GOT PO IDS:: ${purchaseOrdersIds.ids.length}`);

  let ids: string[] = [];

  if (isArray(purchaseOrdersIds.ids) === true) {
    ids = [...purchaseOrdersIds.ids];
  }

  let purchaseOrdersDetails = await lasecApi.PurchaseOrders.list({ filter: { ids: ids } }, context).then();
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

export const getPurchaseOrderDetails = async (params: any, context: Reactory.IReactoryContext) => {
  try {
    const { orderId, quoteId } = params;
    let apiFilter = { purchase_order_id: orderId };
    let purchaseOrdersItems = await lasecApi.PurchaseOrders.detail({ filter: apiFilter }, context).then();
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

export const getPagedSalesOrders = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(`GETTING PAGED SALES ORDERS:: ${JSON.stringify(params)}`);

  const { paging, apiFilter, ordering } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let salesOrdersIds = await lasecApi.SalesOrders.list({
    filter: apiFilter,
    format: {
      ids_only: true,
    },
    ordering: ordering || { order_date: "desc" },
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    }
  }, context).then();

  logger.debug(`PAGED SALES ORDERS IDS RESPONSE:: ORDERS FOUND`, { sales_orders: JSON.stringify(salesOrdersIds) });

  let ids: string[] = [];

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

    if (ids.length === 0) {
      return {
        paging: pagingResult,
        salesOrders: []
      }
    }

    let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }, context).then();

    logger.debug(`SALES ORDER DETAILS RESPONSE:: ${JSON.stringify(salesOrdersDetails)}`);

    let salesOrders = salesOrdersDetails && salesOrdersDetails.items ? [...salesOrdersDetails.items] : [];


    salesOrders = salesOrders.map((order, idx) => {
      return {
        // id: order.id || idx,
        // salesOrderNumber: order.sales_order_number,
        // orderType: order.type_of_order,
        // orderStatus: order.status,
        // orderDate: order.order_date,
        // shippingDate: order.shipping_date,
        // quoteDate: order.quote_date,
        // iso: order.id,
        // customer: order.company_trading_name,
        // client: order.customer_name,
        // poNumber: order.customerponumber || order.purchase_order_number,
        // quoteId: order.quote_id,
        // currency: order.currency,
        // deliveryAddress: { id: order.delivery_address_id },
        // warehouseNote: order.warehouse_note,
        // deliveryNote: order.delivery_instructions,
        // salesTeam: order.sales_team_id,
        // value: order.purchase_order_amount || 0,
        // reserveValue: order.reserved_value || 0,
        // shipValue: order.shipped_value || 0,
        // backorderValue: order.back_order_value || 0,


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

export const getClientSalesOrders = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(` -- GETTING CLIENT SALES ORDERS --  ${JSON.stringify(params)}`);

  debugger

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

  let apiFilter: any = {
    customer_id: clientId,
    // [filterBy]: filter || search,
    // start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    // end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
    ordering: { order_date: "desc" },
  };
  const DEFAULT_FILTER = {
    customer_id: clientId,
    ordering: { order_date: "desc" },
  }

  const empty_response: any = {
    paging: pagingResult,
    periodStart,
    periodEnd,
    filter,
    filterBy,
    clientId,
    salesOrders: [],
  };

  switch (filterBy) {
    case 'any_field': {
      delete apiFilter.start_date
      delete apiFilter.end_date
      if (isString(search) === false && filter === undefined) apiFilter = DEFAULT_FILTER;
      else apiFilter.any_field = search;
      break;
    }
    case 'iso_number':
    case 'po_number':
    case 'order_value':
    case 'reserved_value':
    case 'shipped_value':
    case 'back_order_value':
    case 'quote_id':
    case 'customer':
    case 'sales_team_id': {
      delete apiFilter.start_date
      delete apiFilter.end_date
      if (search === '') apiFilter = empty_response;
      else apiFilter.any_field = search;
      break;
    }
    case "date_range": {
      delete apiFilter.date_range;
      apiFilter.start_date = periodStart ? moment(periodStart).toISOString() : moment().startOf('year');
      apiFilter.end_date = periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day');
      if (search && search.length >= 3) apiFilter.any_field = search;
      break;
    }
    case "order_date":
    case "quote_date":
    case "shipping_date": {
      apiFilter.using = filterBy;
      apiFilter.start_date = moment(filter).startOf('day').toISOString();
      apiFilter.end_date = moment(filter).endOf('day').toISOString();
      break;
    }
    case "order_type":
    case "order_status": {
      if (filter === undefined) return empty_response;
      delete apiFilter.start_date
      delete apiFilter.end_date
      apiFilter[filterBy] = filter;
      // apiFilter.quote_status = `${filter},${filter}`;
      break;
    }
    default: {
      logger.error(`NO MATCHING FILTERBY OPTIONS!!!!!`);
      break;
    }
  }

  debugger

  let salesOrdersIds = await lasecApi.SalesOrders.list({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    }
  }, context).then();


  logger.debug(`Results searching for Sales Orders`, { result: JSON.stringify(salesOrdersIds, null, 2), apiFilter: JSON.stringify(apiFilter, null, 2) });
  let ids: string[] = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  if (salesOrdersIds.pagination && salesOrdersIds.pagination.num_pages > 1) {
    pagingResult.total = salesOrdersIds.pagination.num_items;
    pagingResult.pageSize = salesOrdersIds.pagination.page_size || 10;
    pagingResult.hasNext = salesOrdersIds.pagination.has_next_page === true;
    pagingResult.page = salesOrdersIds.pagination.current_page || 1;
  }

  let salesOrdersDetails = await lasecApi.SalesOrders.list({ filter: { ids: ids } }, context).then();
  let salesOrders = [...salesOrdersDetails.items];

  logger.debug(`SALES ORDER:: ${JSON.stringify(salesOrders[0])}`);

  salesOrders = salesOrders.map(order => {
    return {
      id: order.id,
      salesOrderNumber: order.sales_order_number,
      // orderDate: order.order_date,
      orderDate: order.order_date ? moment(order.order_date).toISOString() : '',
      // shippingDate: order.req_ship_date,
      shippingDate: order.req_ship_date ? moment(order.req_ship_date).toISOString() : '',
      // quoteDate: order.quote_date,
      quoteDate: order.quote_date ? moment(order.quote_date).toISOString() : '',
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
    clientId
  };

  return result;

}

const sales_order_field_maps: any = {
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


export const getCRMSalesOrders = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(` -- GETTING CRM SALES ORDERS --  ${JSON.stringify(params)}`);

  debugger

  const {
    search = "",
    periodStart,
    periodEnd,
    filterBy = "any_field",
    filter,
    orderBy = 'order_date',
    orderDirection = 'desc',
    paging = { page: 1, pageSize: 10 },
    iter = 0 } = params;

  let me: Lasec360User = await getLoggedIn360User(false, context).then() as Lasec360User;

  let apiFilter: any = {};

  if (filterBy == 'order_date' || filterBy == 'shipping_date' || filterBy == 'quote_date') {
    apiFilter.using = filterBy;
    apiFilter.start_date = moment(filter).startOf('day');
    apiFilter.end_date = moment(filter).endOf('day');
  }

  if (filterBy == 'order_type') {
    apiFilter[filterBy] = filter;
  }

  if (filterBy == 'any_field' || filterBy == 'iso_number' || filterBy == 'po_number' || filterBy == 'order_value' || filterBy == 'reserved_value' || filterBy == 'shipped_value' || filterBy == 'back_order_value' || filterBy == 'dispatches' || filterBy == 'quote_id') {
    apiFilter[filterBy] = search;
  }

  if (filterBy === 'customer') {
    apiFilter.customer = search;
  }

  if (filterBy === 'client') {
    apiFilter.client = search
  }

  if (filterBy == 'sales_team_id') {
    apiFilter[filterBy] = filter;
  }

  if (filterBy === 'date_range') {
    apiFilter = {
      ...apiFilter,
      using: 'order_date',
      start_date: periodStart ? moment(periodStart).toISOString() : moment().add(-1, 'year'),
      end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
    }
  }

  if (search.trim() === "" && filterBy === "any_field") apiFilter.sales_team_id = me.sales_team_id;

  let ordering: any = {};

  switch (orderBy) {
    case 'orderType':
      ordering['order_type'] = orderDirection;
      break;
    case 'shippingDate':
      ordering['shipping_date'] = orderDirection;
      break;
    case 'salesOrderNumber':
      ordering['iso_number'] = orderDirection;
      break;
    case 'poNumber':
      ordering['po_number'] = orderDirection;
      break;
    case 'quoteId':
      ordering['quote_id'] = orderDirection;
      break;
    case 'customer':
      ordering['customer_name'] = orderDirection;
      break;
    case 'client':
      ordering['client_name'] = orderDirection;
      break;
    case 'salesTeam':
      ordering['sales_team_id'] = orderDirection;
      break;
    case 'value':
      ordering['order_value'] = orderDirection;
      break;
    case 'reserveValue':
      ordering['reserved_value'] = orderDirection;
      break;

    case 'orderDate':
      ordering['order_date'] = orderDirection;
      break;
    default:
      break;
  }


  logger.debug(`ORDERING::  ${JSON.stringify(ordering)}`);

  const result = await getPagedSalesOrders({ paging, apiFilter, ordering }, context);
  return result;
}


interface CustomerDocumentQueryParams {
  id?: string,
  ids?: string[],
  uploadContexts?: string[],
  paging?: {
    page: number,
    pageSize: number
  }
}


const allowedExts = ['txt', 'pdf', 'doc', 'zip'];
const allowedMimeTypes = ['text/plain', 'application/msword', 'application/x-pdf', 'application/pdf', 'application/zip'];

const mimes: any = {
  "pdf": "application/pdf",
  "txt": "text/plain",
  "doc": "application/msword",
  "zip": "application/zip"
}


const mimeTypeForFilename = (filename: string) => {

  let parts = filename.split(".");
  if (parts.length > 1) {
    let m: string = mimes[parts[parts.length - 1]];
    if (m !== null && m !== undefined) {
      return m;
    }
  }

  return 'application/octet-stream';
};


export const getCustomerDocuments = async (params: CustomerDocumentQueryParams, context: Reactory.IReactoryContext) => {

  logger.debug(`GET CUSTOMER DOCUMENT PARAMS:: ${JSON.stringify(params)}`);

  const _docs: any[] = []

  let documentFilter: any = {};
  if (params.uploadContexts && params.uploadContexts.length > 0) {
    documentFilter.uploadContext = {
      $in: params.uploadContexts.map((ctx: string) => {
        if (ctx === 'lasec-crm::new-company::document') {
          if (params.id == 'new_client') return `lasec-crm::client::document::new_client::${context.user._id}`; // NEW CLIENT
          else return `lasec-crm::client::document::${params.id}`; // INCOMPLETE CLIENT - EXISTING CLIENT
        }
        else if (ctx === 'lasec-crm::client::document') {
          return `${ctx}::${params.id}`;// EXISTING CUSTOMER
        }
        return ctx;
      })
    };
  } else {
    documentFilter.uploadContext = {
      $in: [`lasec-crm::company::${params.id}`]
    };
  }

  logger.debug(`lasec-crm::CompanyResovler.ts --> getCustomerDocuments() --> documentFilter`, documentFilter);

  let reactoryFiles: Reactory.IReactoryFileModel[] = await ReactoryFileModel.find(documentFilter).then();

  reactoryFiles.forEach((rfile) => {
    rfile.fromApi = false;
    _docs.push(rfile);
  });


  // GET DOCS FROM LASEC API
  if (params.id && params.id !== 'new_client') {
    const clientDetails = await lasecApi.Customers.list({ filter: { ids: [params.id] } }, context);
    if (clientDetails && clientDetails.items.length > 0) {
      let client = clientDetails.items[0];
      if (client.document_ids.length > 0) {
        let documents = await lasecApi.get(lasecApi.URIS.file_upload.url, { filter: { ids: client.document_ids }, paging: { enabled: false } }, null, context);

        documents.items.forEach((documentItem: any) => {

          let found = false;

          _docs.forEach((loaded: Reactory.IReactoryFile) => {
            if (loaded.remotes && loaded.remotes.length === 1) {
              if (loaded.remotes[0].id.indexOf(`${documentItem.id}@`) === 0) {
                found = true;
              }
            }
          });

          if (found === false) {
            _docs.push({
              id: documentItem.id,
              partner: context.partner,
              filename: documentItem.name,
              link: documentItem.url,
              hash: Hash(documentItem.url),
              path: '',
              alias: '',
              alt: [],
              size: 0,
              uploadContext: 'lasec-crm::company-document::remote',
              mimetype: mimeTypeForFilename(documentItem.name),
              uploadedBy: context.user._id,
              owner: context.user._id,
              fromApi: true
            });
          }
        });
      }
    }
  }

  // ID IDS IS AN ARRAY (NOT SURE WHEN THIS OCCURS)
  if (params.ids && params.ids.length > 0) {
    let remote_documents = await lasecApi.get(lasecApi.URIS.file_upload.url, { filter: { ids: params.ids }, paging: { enabled: false } }, null, context);
    remote_documents.items.forEach((documentItem: any) => {
      _docs.push({
        id: new ObjectID(),
        partner: context.partner,
        filename: documentItem.name,
        link: documentItem.url,
        hash: Hash(documentItem.url),
        path: '',
        alias: '',
        alt: [],
        size: 0,
        uploadContext: 'lasec-crm::company-document::remote',
        mimetype: mimeTypeForFilename(documentItem.name),
        uploadedBy: context.user._id,
        // owner: context.user.id
        owner: context.user._id,
        fromApi: true
      })
    });

  }



  logger.debug(`Files found (${_docs.length})`);

  if (params.paging) {
    let skipCount: number = (params.paging.page - 1) * params.paging.pageSize;
    return {
      id: params.id,
      documents: lodash(_docs).drop(skipCount).take(params.paging.pageSize),
      uploadContexts: params.uploadContexts || [],
      paging: {
        total: _docs.length,
        page: params.paging.page,
        hasNext: skipCount + params.paging.pageSize < _docs.length,
        pageSize: params.paging.pageSize
      },
    }
  } else {
    return {
      id: params.id,
      documents: _docs,
      uploadContexts: params.uploadContexts || [],
      paging: {},
    }
    // return _docs;
  }
};


export const getSODocuments = async (args: any, context: Reactory.IReactoryContext) => {
  logger.debug(`GETTING DOCUMENTS:: ${JSON.stringify(args)}`)

  const { ids } = args;

  if (ids && ids.length > 0) {

    let documents = await lasecApi.SalesOrders.documents({ filter: { ids: ids } }, context).then();
    documents = [...documents.items];
    documents = documents.map((doc: any) => {
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

export const deleteSalesOrdersDocument = async (args: any, context: Reactory.IReactoryContext) => {

  const { id } = args;

  return {
    success: true,
    message: 'Document deleted successfully'
  }
};

/**
 * Fetches sales order comments for the order id
 * @param params
 */
export const getSalesOrderComments = async (params: { orderId: string }) => {
  return LasecSalesOrderComment.find({
    salesOrderId: params.orderId
  }).populate('who').then();
};

/**
 * Save Sales Order Comment
 * @param params
 */
export const saveSalesOrderComment = async (params: { orderId: string, comment: string }, context: Reactory.IReactoryContext) => {
  try {
    const sales_order_comment = new LasecSalesOrderComment({
      _id: new ObjectId(),
      who: context.user._id,
      salesOrderId: params.orderId,
      comment: params.comment,
      when: moment()
    });
    await sales_order_comment.save().then();
    logger.debug(`🟢 Added comment to sales order ${params.orderId}`);
    return LasecSalesOrderComment.findById(sales_order_comment._id).populate("who").then();
  } catch (addCommentError) {
    logger.error(`🔴 Adding Comment to sales order failed ${addCommentError.message}`, { addCommentError });
    const exception = new LasecApiException('Could not add the comment due to an internal error');
    exception.meta = addCommentError;
    throw exception;
  }
};



/**
 * get the iso details
 * @param params
 */
export const getISODetails = async (params: { orderId: string, quoteId: string }, context: Reactory.IReactoryContext) => {

  const {
    orderId,
    quoteId
  } = params;

  let apiFilter = { sales_order_id: orderId };
  let salesOrdersIds = await lasecApi.SalesOrders.detail({ filter: apiFilter }, context).then();

  let ids: string[] = [];

  if (isArray(salesOrdersIds.ids) === true) {
    ids = [...salesOrdersIds.ids];
  }

  let salesOrdersDetail = await lasecApi.SalesOrders.detail({ filter: { ids: ids } }, context).then();
  let salesOrders = [...salesOrdersDetail.items];

  logger.debug(`LINE ITEMS:: ${JSON.stringify(salesOrders)}`);

  let lineItems: any[] = [];
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
        comment: so.comment,
      }

      lineItems.push(item);
    }
  })

  logger.debug(`LINE ITEMS TO RETURN :: ${JSON.stringify(lineItems)}`);

  let existing_comments = await LasecSalesOrderComment.find({ salesOrderId: params.orderId }).populate('who').then();
  return {
    lineItems,
    comments: existing_comments
  };
}

export const getClientInvoices = async (params: any, context: Reactory.IReactoryContext) => {

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

  let apiFilter: any = {
    customer_id: clientId,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('month'),
  };

  const empty_response: any = {
    paging: pagingResult,
    periodStart,
    periodEnd,
    filter,
    filterBy,
    clientId,
    invoices: []
  };

  switch (filterBy) {

    case 'any_field': {
      apiFilter[filterBy] = search;
      delete apiFilter.start_date;
      delete apiFilter.end_date;
      break;
    }
    case 'invoice_number':
    case 'po_number':
    case 'invoice_value':
    case 'account_number':
    case 'dispatch_number':
    case 'iso_number':
    case 'quote_number':
    case 'customer':
    case 'sales_team_id': {
      if (search === '') return empty_response;
      apiFilter[filterBy] = search;
      delete apiFilter.start_date;
      delete apiFilter.end_date;
      break;
    }
    case "invoice_date": {
      apiFilter.using = filterBy;
      apiFilter.start_date = moment(dateFilter).startOf('day');
      apiFilter.end_date = moment(dateFilter).endOf('day');
      break;
    }
    default: {
      logger.error(`NO MATCHING FILTERBY OPTIONS!!!!!`);
      break;
    }
  }

  const invoiceIdsResponse = await lasecApi.Invoices.list({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10, current_page: paging.page
    },
    ordering: { "invoice_date": "desc" }
  }, context).then();

  logger.debug(`INVOICE COUNT:: ${invoiceIdsResponse.ids.length}`);

  let ids: string[] = [];

  if (isArray(invoiceIdsResponse.ids) === true) {
    ids = [...invoiceIdsResponse.ids];
  }

  if (invoiceIdsResponse.pagination && invoiceIdsResponse.pagination.num_pages > 1) {
    pagingResult.total = invoiceIdsResponse.pagination.num_items;
    pagingResult.pageSize = invoiceIdsResponse.pagination.page_size || 10;
    pagingResult.hasNext = invoiceIdsResponse.pagination.has_next_page === true;
    pagingResult.page = invoiceIdsResponse.pagination.current_page || 1;
  }

  let invoiceDetails = await lasecApi.Invoices.list({ filter: { ids: ids } }, context).then();
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
    clientId,
    paging: pagingResult,
    invoices,
  };

  return result;

}



export const getCRMInvoices = async (params: any, context: Reactory.IReactoryContext) => {

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


  let apiFilter: any = {
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('month'),
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
  }, context).then();

  logger.debug(`INVOICE COUNT:: ${invoiceIdsResponse.ids.length}`);

  let ids: any[] = [];

  if (isArray(invoiceIdsResponse.ids) === true) {
    ids = [...invoiceIdsResponse.ids];
  }

  if (invoiceIdsResponse.pagination && invoiceIdsResponse.pagination.num_pages > 1) {
    pagingResult.total = invoiceIdsResponse.pagination.num_items;
    pagingResult.pageSize = invoiceIdsResponse.pagination.page_size || 10;
    pagingResult.hasNext = invoiceIdsResponse.pagination.has_next_page === true;
    pagingResult.page = invoiceIdsResponse.pagination.current_page || 1;
  }

  if (ids.length === 0) {
    logger.debug('🚨 QUERY PARAMETERS RETURNED NO RESULTS 🚨')
    return {
      paging: pagingResult,
      invoices: []
    }
  }

  let invoiceDetails = await lasecApi.Invoices.list({ filter: { ids: ids }, ordering: undefined }, context).then();
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

export const getClientSalesHistory = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(`GETTING PAGED CLIENT SALES HISTORY:: ${JSON.stringify(params)}`);

  const {
    clientId,
    search = "",
    periodStart,
    periodEnd,
    filterBy = "any_field",
    filter,
    paging = { page: 1, pageSize: 10 },

    year,
    month,
    years,

    iter = 0 } = params;

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let apiFilter: any = {
    customer_id: clientId,
    order_status: 9,
    // [filterBy]: filter || search,
    // start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    // end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
  };

  if (search != '')
    apiFilter[filterBy] = search;

  if (year) {
    logger.debug(`SETTING DATES PER YEAR:: ${month}`);
    apiFilter.start_date = moment([year]).startOf('year').toISOString();
    apiFilter.end_date = moment([year]).endOf('year').toISOString();
  }

  if (month != undefined) {
    logger.debug(`SETTING DATES PER MONTH:: ${month}`);
    let _year = year || moment().year();
    apiFilter.start_date = moment([_year, month - 1]).startOf('month').toISOString();
    apiFilter.end_date = moment([_year, month - 1]).endOf('month').toISOString();
  }

  const salesHistoryResponse = await lasecApi.Products.sales_orders({
    filter: apiFilter,
    pagination: {
      page_size: paging.pageSize || 10,
      current_page: paging.page
    },
  }, context).then();

  logger.debug(`SALES HISTORY COUNT:: ${salesHistoryResponse.ids.length}`);

  let ids: string[] = [];

  if (isArray(salesHistoryResponse.ids) === true) {
    ids = [...salesHistoryResponse.ids];
  }

  if (salesHistoryResponse.pagination && salesHistoryResponse.pagination.num_pages > 1) {
    pagingResult.total = salesHistoryResponse.pagination.num_items;
    pagingResult.pageSize = salesHistoryResponse.pagination.page_size || 10;
    pagingResult.hasNext = salesHistoryResponse.pagination.has_next_page === true;
    pagingResult.page = salesHistoryResponse.pagination.current_page || 1;
  }

  let saleshistoryDetails = await lasecApi.Products.sales_orders({ filter: { ids: ids } }, context).then();
  let salesHistory = [...saleshistoryDetails.items];

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

      // id: order.id,
      orderType: order.order_type,
      // orderDate: order.order_date,
      quoteDate: order.quote_date,
      quoteNumber: order.quote_id || '',
      // iso: order.sales_order_id,
      dispatches: order.dispatch_note_ids.join(', '),
      // customer: order.company_trading_name,
      // client: order.customer_name,
      // poNumber: order.sales_order_number,
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
    year,
    month,
    years,
  };

  return result;

}

export const getSalesHistoryMonthlyCount = async (params: any, context: Reactory.IReactoryContext) => {

  logger.debug(`GET TOTALS PARAMS:: ${JSON.stringify(params)}`);

  try {

    const {
      clientId,
      search = "",
      filterBy = "any_field",
    } = params;

    let _filter: any = {
      order_status: 9,
      // start_date: moment().startOf('year').toISOString(),
      // end_date: moment().endOf('day').toISOString(),
      totals: true
    };

    // CATER FOR SPECIFIC CLIENT
    if (clientId && clientId != '') {
      _filter.customer_id = clientId;
    }

    _filter[filterBy] = search;

    //TODO: TEST AND CHECK the SalesHistoryMonthlyCount
    const salesHistoryResponse = await lasecApi.Products.sales_orders({
      filter: _filter,
      pagination: { enabled: true, current_page: 1, page_size: 50 },
    }, context).then();

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

export const getCRMSalesHistory = async (params: any, context: Reactory.IReactoryContext) => {

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
    _filter.start_date = moment([_year, month - 1]).startOf('month').toISOString();
    _filter.end_date = moment([_year, month - 1]).endOf('month').toISOString();
  }

  const salesHistoryResponse = await lasecApi.Products.sales_orders({
    filter: _filter,
    pagination: { page_size: paging.pageSize || 10, current_page: paging.page },
    // ordering,
  }, context).then();

  logger.debug(`SALES HISTORY RESPONSE:: ${JSON.stringify(salesHistoryResponse)}`);

  let ids: string[] = [];

  if (isArray(salesHistoryResponse.ids) === true) {
    ids = [...salesHistoryResponse.ids];
  }

  if (salesHistoryResponse.pagination && salesHistoryResponse.pagination.num_pages > 1) {
    pagingResult.total = salesHistoryResponse.pagination.num_items;
    pagingResult.pageSize = salesHistoryResponse.pagination.page_size || 10;
    pagingResult.hasNext = salesHistoryResponse.pagination.has_next_page === true;
    pagingResult.page = salesHistoryResponse.pagination.current_page || 1;
  }

  let saleshistoryDetails = await lasecApi.Products.sales_orders({ filter: { ids: ids } }, context).then();

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

export const getFreightRequetQuoteDetails = async (params: LasecGetFreightRequestQuoteParams, context: Reactory.IReactoryContext) => {


  logger.debug(`
  **********************************************************
  * 🚛 Getting Freight Request for Quote ${params.quoteId} *
  **********************************************************
  `);

  const { quoteId } = params;

  let quoteDetail: LasecQuote = await lasecApi.Quotes.getByQuoteId(quoteId, null, context).then();

  logger.debug(`Fetched Quote Results :\n${JSON.stringify(quoteDetail)}\nLoading Quote Options`);

  let promises: Promise<any>[] = [];
  if (quoteDetail && quoteDetail.quote_option_ids) {
    promises = quoteDetail.quote_option_ids.map((option_id: string): Promise<FreightRequestOption> => {
      return new Promise((resolve, reject) => {

        lasecApi.Quotes.getQuoteOption(option_id, context).then((option_result) => {
          logger.debug(`QUOTE [${quoteId}] OPTION [${option_id}]\n ${JSON.stringify(option_result, null, 2)}`);
          if (option_result.id) {
            let quoteOptionResponse = option_result;

            let freight_request_option: FreightRequestOption = {
              id: quoteOptionResponse.id || option_id,
              name: quoteOptionResponse.name,
              transportMode: quoteOptionResponse.transport_mode || '',
              incoTerm: quoteOptionResponse.inco_terms || '',
              place: quoteOptionResponse.named_place || '',
              fromSA: false,
              vatExempt: false,
              totalValue: quoteOptionResponse.grand_total_incl_vat_cents || 0,
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
              deliveryNote: '',
              item_paging: {
                total: 0,
                hasNext: false,
                page: 0,
                pageSize: 0
              },
              productDetails: [],
            };


            lasecGetQuoteLineItems(quoteId, option_id, 1, 100, context).then((paged_results: { lineItems: LasecQuoteItem[], item_paging: PagingResult }) => {
              if (paged_results && paged_results.lineItems && paged_results.lineItems.length > 0) {
                freight_request_option.item_paging = paged_results.item_paging,

                  paged_results.lineItems.forEach((line_item: LasecQuoteItem) => {
                    debugger;
                    freight_request_option.productDetails.push({
                      code: line_item.code,
                      description: line_item.title,
                      sellingPrice: line_item.totalVATExclusive,
                      qty: line_item.quantity,
                      unitOfMeasure: '',
                      length: 0,
                      width: 0,
                      height: 0,
                      weight: 0,
                      volume: 0
                    });
                  });
              }

              resolve(freight_request_option);

            }).catch((get_line_items_error) => {
              logger.error(`Could not get the the line items for the Freight Costing Details:\n${get_line_items_error.message}`, get_line_items_error)
              reject(get_line_items_error);
            })
          } else {
            reject(new ApiError('No data available for quote option'))
          }
        });
      });
    })
  }

  return {
    id: params.quoteId,
    email: context.user.email,
    communicationMethod: 'attach_pdf',
    options: await Promise.all(promises).then()
  };
}

export const updateFreightRequestDetails = async (params: any) => {
  logger.debug(`UPDATE FREIGHT REQUEST DETAILS ::\n ${JSON.stringify(params, null, 2)}`);

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

export const duplicateQuoteForClient = async (params: any, context: Reactory.IReactoryContext) => {
  try {
    const { quoteId, clientId } = params;

    const lasecClient = await lasecApi.Customers.list({
      filter: { ids: [clientId] }, ordering: {}, pagination: {
        enabled: false,
        current_page: 0,
        page_size: 10
      }
    }, context).then()

    if (!lasecClient) {
      logger.error(`No Client found`);
      throw new ApiError('Error copying quote. No client found.')
    }

    const copiedQuoteResponse = await lasecApi.Quotes.copyQuoteToCustomer({ quote_id: quoteId, customer_id: clientId }, context).then();
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

export const createNewQuote = async (params: any, context: Reactory.IReactoryContext) => {
  try {
    const { clientId, repCode } = params;

    const newQuoteResponse = await lasecApi.Quotes.createNewQuoteForClient({ customer_id: clientId, secondary_api_staff_user_id: repCode }, context).then();
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

export const getQuoteComments = async (params: any, context: Reactory.IReactoryContext) => {
  return await LasecQuoteComment.find({ quoteId: params.quote_id }).exec();
}

export const saveQuoteComment = async (params: any, context: Reactory.IReactoryContext) => {

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
        who: context.user._id,
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

export const deleteQuoteComment = async (params: any, context: Reactory.IReactoryContext) => {
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
  item_id: string,
  quote_type: string,
  rep_code: string,
  client_id: string
  valid_until: Date
  currency_code: String
};

export const updateQuote = async (params: ILasecUpdateQuoteExpectedParams, context: Reactory.IReactoryContext) => {

  logger.debug(`UPDATING QUOTE:: ${JSON.stringify(params)}`);

  try {
    const {
      item_id, // Quote code
      quote_type,
      rep_code,
      client_id,
      valid_until,
      currency_code
    } = params;

    const updateParams: any = { item_id, values: {} };

    const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');
    const lasecLogging: ILasecLoggingService = context.getService('lasec-crm.LasecLoggingService@1.0.0');

    lasecLogging.writeLog(`${context.user.fullName(false)}, is updating quote ${item_id}`, 'Helpers => updateQuote', 0, params);


    if (quote_type) updateParams.values.quote_type = quote_type;
    if (rep_code) updateParams.values.sales_team_id = rep_code;
    if (client_id) updateParams.values.customer_id = client_id;
    if (currency_code) {

      let _id = 0;

      const currencies = await quoteService.getCurrencies().then();
      currencies.forEach((c) => {
        if (c.code === currency_code) {
          updateParams.values.currency_id = c.id;
        }
      })

      if (updateParams.values.currency_id) lasecLogging.writeLog(`${context.user.fullName(false)} could not read / find correct currency selection`, "Helpers => updateQuote => currency_code_set", 5, { currencies, currency_code })
    }


    if (valid_until) updateParams.values.valid_until = moment(valid_until, 'YYYY-MM-DD').toISOString();

    const updateResult = await lasecApi.Quotes.updateQuote(updateParams, context).then();

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

export const updateQuoteLineItems = async (params: any, context: Reactory.IReactoryContext) => {

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
      return lasecApi.Quotes.updateQuoteItems(updateParams, context);
    });

    const freightParams = {
      item_id: 'NLSCFREIGHT ',
      values: {
        unit_price_cents: freight * 100
      }
    }
    const freightItemPromise = lasecApi.Quotes.updateQuoteItems(freightParams, context);
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

export const getCompanyDetails = async (params: { id: string }, context: Reactory.IReactoryContext) => {
  try {
    let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [params.id] } }, context).then();
    let customerObject = {};

    logger.debug(`Results from Helpers.ts -> getCompanyDetails(params)`, { params, companyPayloadResponse });

    if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
      customerObject = {
        ...om.merge(companyPayloadResponse.items[0], {
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
          "credit_invoice_total_cents": "creditTotal",
          "delivery_address_id": "deliveryAddressId",
          "delivery_address": "deliveryAddress"
        })
      };
    }

    return customerObject;

  } catch (error) {
    throw new ApiError(`Error getting customer details:: ${error}`);
  }
}

export const deleteQuote = async (params: any, context: Reactory.IReactoryContext) => {

  try {
    let companyPayloadResponse = await lasecApi.Quotes.deleteQuote(params.id, context).then();

    if (!companyPayloadResponse) throw new ApiError(`Error deleting quote!`);

    return {
      success: true,
      message: 'Quote successfully deleted!'
    }

  } catch (error) {
    throw new ApiError(`Error deleting quote:: ${error}`);
  }

}



