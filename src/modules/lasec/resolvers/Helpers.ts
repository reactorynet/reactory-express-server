
import om from 'object-mapper';
import moment, { Moment } from 'moment';
import lodash, { isArray, isNil, isString } from 'lodash';
import { ObjectId } from 'mongodb';
import gql from 'graphql-tag';
import uuid from 'uuid';
import lasecApi, { LasecNotAuthenticatedException } from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { Organization, User, Task } from '@reactory/server-core/models';
import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';
import amq from '@reactory/server-core/amq';
import Hash from '@reactory/server-core/utils/hash';
import { clientFor } from '@reactory/server-core/graph/client';
import { getCacheItem, setCacheItem } from '../models';
import emails from '@reactory/server-core/emails';

import {
    Quote as LasecQuote,
    LasecDashboardSearchParams,
    LasecProductDashboardParams,
    USER_FILTER_TYPE,
    DATE_FILTER_PRESELECT
} from '../types/lasec';


import CONSTANTS, { LOOKUPS, OBJECT_MAPS } from '../constants';
import { Reactory } from 'types/reactory';

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




export const synchronizeQuote = async ( quote_id: string, owner: any, source: any = null, map: any = true ) => {
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
  
    // logger.debug(`SOURCE ${JSON.stringify(_source)}`);
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


export const getLoggedIn360User: any = async ( ) => {
  const { user } = global;
  const lasecCreds = user.getAuthentication("lasec");
    
  if (!lasecCreds) {     
    throw new LasecNotAuthenticatedException();
  } 

  
  if (lasecCreds.props && lasecCreds.props.payload) {
    let staff_user_id: string = "";

    staff_user_id = `${lasecCreds.props.payload.user_id}`;

    const hashkey = Hash(`LOGGED_IN_360_USER_${global.partner.id}_${user.id}_${staff_user_id}`);
    debugger
    let me360 = await getCacheItem(hashkey).then();
    if(!me360) {
      me360 = await lasecApi.User.getLasecUsers([staff_user_id], "ids").then();
      if(me360.length === 1) {
        me360 = me360[0];
      }
    } 
    if(me360 ) {
      setCacheItem(hashkey, me360, 60);    
    }

    return me360;
  }
  
  throw new LasecNotAuthenticatedException();
};


export const getTargets = async (params: LasecDashboardSearchParams) => {  
    const { periodStart, periodEnd, teamIds, repIds, agentSelection } = params;
    logger.debug(`QuoteResolver.getTargets(params)`,params);
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
            userTargets = await lasecApi.User.getUserTargets(teamIds, 'rep_code').then();
          break;       
        }
        case "custom": {
            logger.debug(`Finding Targets for USERS `, repIds);            
            userTargets = await lasecApi.User.getUserTargets(repIds, 'staff_user_id').then();
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
export const getLasecQuoteById = async (quote_id) => {
  try {
    const owner = global.partner.key;
    let quote = await synchronizeQuote(quote_id, owner, null, true).then();
    return quote;
  } catch (quoteFetchError) {
    logger.error(`Could not fetch Quote with Quote Id ${quote_id} - ${quoteFetchError.message}`);
    return null;
  }
};

export const getQuotes = async (params) => {

  logger.debug(`Fetching Lasec Dashboard Data`, params);

  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('year'),
      periodEnd: moment().endOf('day')
    }
  }

  let apiFilter = {
    start_date: _params.periodStart ? _params.periodStart.toISOString() : moment().startOf('year'),
    end_date: _params.periodEnd ? _params.periodEnd.toISOString() : moment().endOf('day')
  };

  if(params.agentSelection === 'team') {
    apiFilter.rep_codes = params.teamIds;
  }

  if(params.agentSelection === 'custom') {
    apiFilter.staff_user_id = params.repIds || []
  }

  if(params.agentSelection === 'me') {
    let me = await getLoggedIn360User().then();
    if(me) {      
      apiFilter.rep_codes = me.rep_codes;
    }    
  }

  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: 10, enabled: true } }).then();

  let ids = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  const pagePromises = [];

  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    const max_pages = quoteResult.pagination.num_pages < 10 ? quoteResult.pagination.num_pages : 10;

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
  let quotes = [...quotesDetails.items];

  //perform a lightweight map
  const quoteSyncResult = await Promise.all(quotes.map((quote) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  // logger.debug(`QUOTES ${JSON.stringify(quotes.slice(0, 5))}`);

  amq.raiseWorkFlowEvent('quote.list.refresh', quotes, global.partner);

  return quotes;
};

export const getInvoices = async ({ periodStart, periodEnd, teamIds = [], repIds = [], agentSelection = 'me' }) => {

  let idsQueryResults: any = null;
  let pagePromises = [];
  let invoice_fetch_promises = [];
  let invoice_items: any[] = [];
  let filter: any = {    
    start_date: periodStart,
    end_date: periodEnd
  };

  const me360 = await getLoggedIn360User().then();

  switch(agentSelection) {
    case "team": {
      filter.rep_code = teamIds;
      break;      
    }
    case "custom": {
      filter.staff_user_id = repIds;
    }
    case "me": 
    default: {
      filter.staff_user_id = me360.id;
    }
  }

  try {
    logger.debug(`QuoteResolver getInvoices({ ${periodStart}, ${periodEnd}, ${teamIds} })`);
    idsQueryResults = await lasecApi.Invoices.list({ filter: filter, pagination: { page_size: 10, enabled: true }, ordering: { "invoice_date": "asc" } }).then();    
    invoice_fetch_promises.push(lasecApi.Invoices.list({ filter: { ids: idsQueryResults.ids }, pagination: { enabled: false }, ordering: { "invoice_date": "asc" } }))
  }
  catch (e) {
    logger.error(`Error querying Invoices ${e.message}`)
    return [];
  }

  try {

    if (idsQueryResults.pagination && idsQueryResults.pagination.num_pages > 1) {
      logger.debug(`Period requires paged invoice result`)
      const max_pages = idsQueryResults.pagination.num_pages;
      for (let pageIndex = idsQueryResults.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        pagePromises.push(lasecApi.Invoices.list({
          filter: filter,
          pagination: { ...idsQueryResults.pagination, current_page: pageIndex },
          ordering: { "invoice_date": "asc" }
        }));
      }
    }

    if (pagePromises.length > 0) {
      const pagedResults = await Promise.all(pagePromises).then();
      //collect all ids
      pagedResults.forEach((pagedResult) => {
        invoice_fetch_promises.push(lasecApi.Invoices.list({ filter: { ids: pagedResult.ids }, pagination: { enabled: false }, ordering: { "invoice_date": "asc" } }))
      });
    }

  } catch (e) {
    logger.error(`Could not fetch paged results for Invoice ids query ${e.message}`);
    return [];
  }

  /**Detail fetch*/
  try {
    if (invoice_fetch_promises.length > 0) {
      const invoice_fetch_results = await Promise.all(invoice_fetch_promises).then();
      if (invoice_fetch_results) {
        for (let idx = 0; idx < invoice_fetch_results.length; idx += 1) {
          if (invoice_fetch_results[0].items) {
            invoice_items = [...invoice_items, ...invoice_fetch_results[0].items]
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
  try {
    const { periodStart, periodEnd, agentSelection, teamIds } = dashparams;
    logger.debug(`QuoteResolver getISOs({ ${periodStart}, ${periodEnd} })`);


    let ids: any[] = [];
    let idsQueryResults: any = null;
    let pagePromises = [];
    let iso_fetch_promises = [];
    let iso_items: any[] = [];
          

    let isoQueryParams = {
      filter: { order_status: "1", start_date: periodStart, end_date: periodEnd },
      ordering: { order_date: "desc" },
      pagination: { enabled: true, page_size: 20 }
    };

    const me360 = await getLoggedIn360User().then();
    
    switch(agentSelection) {
      case "team": {
        isoQueryParams.filter.sales_team_id = teamIds;
        break;      
      }
      case "custom": {
        //isoQueryParams.filter.staff_user_id = repIds;
      }
      case "me": 
      default: {
        isoQueryParams.filter.sales_team_id = me360.sales_team_id;
      }
    }

    
    
    const isoIds = await lasecApi.PurchaseOrders.list(isoQueryParams).then();
    logger.debug(`QuoteResolver getISOs({ ${periodStart}, ${periodEnd} }) --> Result`);

    if (isArray(isoIds.ids) === true && isoIds.ids.length > 0) {
      iso_fetch_promises.push(lasecApi.PurchaseOrders.list({
        filter: { ids: isoIds.ids },
        ordering: { order_date: "desc" },
        pagination: { enabled: false },
      }));
    }

    if (isoIds.pagination && isoIds.pagination.num_pages > 1) {
      logger.debug(`Period requires paged invoice result`)
      const max_pages = isoIds.pagination.num_pages;
      for (let pageIndex = isoIds.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
        pagePromises.push(lasecApi.PurchaseOrders.list({
          filter: isoQueryParams.filter,
          pagination: { ...idsQueryResults.pagination, current_page: pageIndex },
          ordering: { "invoice_date": "asc" }
        }));
      }
    }

    if (pagePromises.length > 0) {
      const pagedResults = await Promise.all(pagePromises).then();
      //collect all ids
      pagedResults.forEach((pagedResult) => {
        iso_fetch_promises.push(lasecApi.Invoices.list({
          filter: { ids: pagedResult.ids }, 
          pagination: { enabled: false }, 
          ordering: { "invoice_date": "asc" } 
        }));
      });
    }

    
    try {
      if (iso_fetch_promises.length > 0) {
        const iso_fetch_results = await Promise.all(iso_fetch_promises).then();
        if (iso_fetch_results) {
          for (let idx = 0; idx < iso_fetch_results.length; idx += 1) {
            if (iso_fetch_results[0].items) {
              iso_items = [...iso_items, ...iso_fetch_results[0].items]
            }
          }
        }
      }
  
      return iso_items;
    } catch (e) {
      logger.debug(`Error while fetching ISO detailed records ${e.message}`);
      return [];
    }        
    
  } catch (isoGetError) {
    logger.error('Error fetching ISOs for the period', isoGetError);
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

export const groupQuotesByStatus = (quotes) => {
  const groupsByKey = {};
  quotes.forEach((quote) => {
    const key = quote.statusGroup || 'none';

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
    const good_bad = {
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
      if (good_bad[key] === "good") groupsByKey[key].good += 1;
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
        title: titleFromKey(key),
      };

      if (good_bad[key] === "good") groupsByKey[key].good += 1;
      else groupsByKey[key].naughty += 1;
    }
  });

  const groupedByStatus = Object.getOwnPropertyNames(groupsByKey).map((statusKey) => {
    return groupsByKey[statusKey];
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

    const good_bad = {
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

export const lasecGetProductDashboard = async (dashparams = defaultProductDashboardParams, ) => {

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

export const lasecGetQuoteLineItems = async (code: string) => {
  const keyhash = Hash(`quote.${code}.lineitems`);

  let cached = await getCacheItem(keyhash);
  if (cached) logger.debug(`Found Cached Line Items For Invoice: ${code}`);
  if (lodash.isNil(cached) === true) {
    const lineItems = await lasecApi.Quotes.getLineItems(code).then();
    logger.debug(`Found line items for quote ${code}`, lineItems);

    cached = om(lineItems, {
      'items.[].id': [
        '[].quote_item_id',
        '[].meta.reference',
        '[].line_id',
        {
          key: '[].id', transform: () => (new ObjectId())
        },
        {
          key: '[].quoteId', transform: () => (code)
        }
      ],
      'items.[].code': '[].code',
      'items.[].description': '[].title',
      'items.[].quantity': '[].quantity',
      'items.[].total_price_cents': '[].price',
      'items.[].gp_percent': '[].GP',
      'items.[].total_price_before_discount_cents': [
        '[].totalVATExclusive',
        {
          key: '[].totalVATInclusive',
          transform: (v) => (Number.parseInt(v) * 1.15)
        }
      ],
      'items.[].note': '[].note',
      'items.[].quote_heading_id': '[].header.meta.reference',
      'items.[].header_name': {
        key: '[].header.text', transform: (v: any) => {
          if (lodash.isEmpty(v) === false) return v;
          return 'Uncategorised';
        }
      },
      'items.[].total_discount_percent': '[].discount',
      'items.[].product_class': '[].productClass',
      'items.[].product_class_description': '[].productClassDescription',
    });

    setCacheItem(keyhash, cached, 60);
  }

  return cached;
}

export const LasecSendQuoteEmail = async (params) => {
  const { code, email, subject, message } = params;
  const { user } = global;
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
          "recipients": [email],
          'contentType': 'html'
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
      to: email,
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

export const getPagedQuotes = async (params) => {

  logger.debug(`GETTING PAGED QUOTES:: ${JSON.stringify(params)}`);

  const {
    search = "",
    periodStart,
    periodEnd,
    quoteDate,
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

  if (isString(search) === false || search.length < 3 && filter === undefined) return {
    paging: pagingResult,
    quotes: []
  };

  // NEED TO ADD CACHING

  let apiFilter = {
    [filterBy]: search,
    start_date: periodStart ? moment(periodStart).toISOString() : moment().startOf('year'),
    end_date: periodEnd ? moment(periodEnd).toISOString() : moment().endOf('day'),
    // agentSelection: 'me',
  };

  // Filter by specific date
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

  // logger.debug(`Loading (${ids.length}) quote ids`);

  let quoteDetails = await lasecApi.Quotes.list({ filter: { ids: ids } }).then();
  logger.debug(`Fetched Expanded View for (${quoteDetails.items.length}) Quotes from API`);
  let quotes = [...quoteDetails.items];


  // logger.debug(`QUOTE DOC:: ${JSON.stringify(quotes[0])}`);

  const quoteSyncResult = await Promise.all(quotes.map((quote) => {
    return synchronizeQuote(quote.id, global.partner.key, quote, true);
  })).then();

  // logger.debug(`QUOTE DOC:: ${JSON.stringify(quoteSyncResult[0])}`);

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
    filter,
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


  salesOrders = salesOrders.map(order => {
    return {
      id: order.id,
      orderDate: order.order_date,
      orderType: order.order_type,
      shippingDate: order.req_ship_date,
      iso: order.sales_order_id,
      customer: order.customer_name,
      client: order.sales_team_id,
      poNumber: order.sales_order_number,
      value: order.order_value,
    }


  });

  let result = {
    paging: pagingResult,
    salesOrders,
  };

  return result;

}