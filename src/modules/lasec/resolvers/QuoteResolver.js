
import om from 'object-mapper';
import moment from 'moment';
import lodash, { isArray } from 'lodash';
import lasecApi from '../api';
import logger from '../../../logging';
import ApiError from '../../../exceptions';
import { Quote, QuoteReminder } from '../schema/Quote';
import amq from '../../../amq';
import { getCacheItem, setCacheItem } from '../models';
import { Workflows } from '../workflow';

const mapQuote = (quote) => {
  logger.debug('Mapping Quote Result', quote);
  return om(quote, {

  });
};

const defaultDashboardParams = {
  period: 'this-week',
  periodStart: moment().startOf('week'),
  periodEnd: moment().endOf('week'),
  repIds: [ ],
  status: [ ]
};

/**
 * Finds and / or synchronizes a record
 * @param {String} quote_id
 */
const getLasecQuoteById = async (quote_id) => {
  try {
    const owner = global.partner.key;
    const predicate = { 'meta.owner': owner, code: quote_id };
    const countResult = await Quote.count(predicate).then();
    let quote = null;

    if (countResult === 0) {
      logger.debug(`Quote ${quote_id} is not found - fetching remote`);
      quote = await lasecApi.Quotes.getByQuoteId(quote_id).then();
      // quote = mapQuote(quote);
      if(quote) {
        amq.raiseWorkflowEvent('startWorkflow', {
          id: Workflows.QuoteInvalidateWorkflow.meta.name,
          data: { quote },
        });
      }      
    } else {
      quote = await Quote.findOne(predicate).populate('').then();
    }

    if (quote === null) throw ApiError('Record not found and could not be synced');

    return quote;
  } catch (quoteFetchError) {
    logger.error(`Could not fetch Quote with Quote Id ${quote_id} - ${quoteFetchError.message}`);
    return null;
  }
};

const getQuotes = async (params) => {

  let apiFilter = {
    start_date: params.periodStart.toISOString(), 
    end_date: params.periodEnd.toISOString() 
  };



  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: 10 } }).then();

  /**
   * 
   * {
  "filter": {},
  "format": {
    "ids_only": true
  },
  "ordering": {},
  "pagination": {
    "current_page": 2,
    "page_size": 25,
    "num_items": 61,
    "has_prev_page": false,
    "last_item_index": 25,
    "has_next_page": true,
    "num_pages": 3,
    "first_item_index": 1
  }
}
   * 
   * 
   */


  /**
   * Paged Result
   * 
   *{
  "status": "success",
  "payload": {
    "pagination": {
      "num_items": 66,
      "has_prev_page": false,
      "current_page": 1,
      "last_item_index": 10,
      "page_size": 10,
      "has_next_page": true,
      "num_pages": 7,
      "first_item_index": 1
    },
    "ids": [
      "1907-152002",
      "1907-321002",
      "1906-337001",
      "1906-321008",
      "1906-321007",
      "1906-152006",
      "1906-321005",
      "1906-152005",
      "1906-321001",
      "1906-337000"
    ]
  }
}
   */
  const fetchPromises = [];

  let ids = [];
   
  if(isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  const pagePromises = [];

  if(quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    const max_pages = quoteResult.pagination.num_pages < 10 ?  quoteResult.pagination.num_pages : 10;

    for(let pageIndex = quoteResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
      pagePromises.push(lasecApi.Quotes.list({ filter: apiFilter, pagination: { ...quoteResult.pagination, current_page: pageIndex } }));
    }
  }

  const pagedResults = await Promise.all(pagePromises).then();

  pagedResults.forEach(( pagedResult ) => {
    ids = [...ids, ...pagedResult.ids]
  });

  logger.debug(`Loading (${ids.length}) quote ids`);
    
  const quotesDetails = await lasecApi.Quotes.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${quotesDetails.items.length}) Quotes from API`);
  const quotes = [...quotesDetails.items];

  
  amq.raiseWorkFlowEvent('quote.list.refresh', quotes, global.partner);

  return quotes;
};

const groupQuotesByStatus = (quotes) => {
  const groupsByKey = {};
  quotes.forEach((quote) => {
    const key = quote.status || 'none';

    if (Object.getOwnPropertyNames(groupsByKey).indexOf(quote.status) >= 0) {
      groupsByKey[key].quotes.push(quote);
      groupsByKey[key].good += 1;
      groupsByKey[key].totalVAT = Math.floor(groupsByKey[key].totalVAT + (quote.grand_total_vat_cents/100));
      groupsByKey[key].totalVATExclusive = Math.floor(groupsByKey[key].totalVATExclusive + (quote.grand_total_excl_vat_cents/100));
      groupsByKey[key].totalVATInclusive = Math.floor(groupsByKey[key].totalVATInclusive + (quote.grand_total_incl_vat_cents/100));

    } else {
      groupsByKey[key] = {
        quotes: [quote],
        good: 1,
        naughty: 0,
        category: '',
        key,
        totalVAT: Math.floor(quote.grand_total_vat_cents / 100),
        totalVATExclusive: Math.floor(quote.grand_total_excl_vat_cents / 100),
        totalVATInclusive: Math.floor(quote.grand_total_incl_vat_cents / 100),        
        title: key.toUpperCase(),
      };
    }
  });

  const groupedByStatus = Object.getOwnPropertyNames(groupsByKey).map((statusKey) => {
    return groupsByKey[statusKey];
  });

  return groupedByStatus;
};

export default {  
  Quote: {
    id: (quote) => {
      return quote.id || 'Not Set';
    },
    customer: (quote) => {
      return om(quote, {
        customer_id: 'id',
        customer_full_name: 'fullName',
      });
    },
    status: ({ status_id }) => {
      return status_id;
    },
    statusGroup: ( { substatus_id }) => {
      return substatus_id;
    },
    allowedStatus: ( { allowed_status_ids } ) => allowed_status_ids,
    company: ({ company_id, company_trading_name }) => {
      return {
        id: company_id,
        tradingName: company_trading_name,
      };
    },
    totalVATExclusive: ({ grand_total_excl_vat_cents = 0 }) => {
      return grand_total_excl_vat_cents;
    },
    totalVAT: ({ grand_total_vat_cents = 0 }) => {
      return grand_total_vat_cents;
    },
    totalVATInclusive: ({ grand_total_incl_vat_cents = 0 }) => {
      return grand_total_incl_vat_cents;
    },
    GP: ({ gp_percent = 0 }) => (gp_percent),
    actualGP: ({ actual_gp_percent }) => (actual_gp_percent),
    created: ({ created }) => { return moment(created); },
    modified: ({ modified }) => { return moment(modified); },
    expirationDate: ({ expirationDate }) => { return moment(expirationDate); },
    note: ({ note }) => (note),
    timeline: ({ timeline }) => timeline,
    meta: ( quote ) => {
      return {
        source: quote
      };
    }
  },
  LasecCompany: {
    id: ({ id }) => (id),
  },
  LasecCustomer: {
    id: ({ id }) => (id),
  },
  LasecQuoteDashboard: {
    id: ({
      period, periodStart, periodEnd, status,
    }) => {
      return `${period}.${moment(periodStart).valueOf()}.${moment(periodEnd).valueOf()}`;
    },
  },  
  Query: {
    LasecGetQuoteList: async (obj, { search }) => {
      return getQuotes();
    },
    LasecGetDashboard: async (obj, { dashparams = defaultDashboardParams }) => {
      logger.debug('Get Dashboard Queried', dashparams);
      let {
        period = 'this-week',
        periodStart = moment(dashparams.periodStart || moment()).startOf('week'),
        periodEnd = moment(dashparams.periodEnd || moment()).endOf('week'),
        repIds = [ ],
        status = [ ]
      } = dashparams;

      let cacheKey = `quote.dashboard.${periodStart.valueOf()}.${periodEnd.valueOf()}`;

      let _cached = await getCacheItem(cacheKey);

      if(_cached) {
        return _cached;        
      }

      logger.debug(`Fetching Lasec Dashboard Data`, dashparams);
      let palette = global.partner.colorScheme();

      const quotes = await getQuotes( dashparams );
            
      const quoteStatusFunnel = {
        chartType: 'FUNNEL',
        data: [                  
        ],
        options: {

        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`  
      };
      
      const quoteStatusPie = {
        chartType: 'PIE',
        data: [         
        ],
        options: {
          multiple: false,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[0]}`,
          dataKey: 'value',
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`  
      };

      const quoteStatusComposed = {
        chartType: 'COMPOSED',
        data: [
          
        ],
        options: {
          xAxis: {
            dataKey: 'modified',
          },
          area: {
            dataKey: 'vatInclusive',            
            fill: `${palette[0]}`,
            stroke: `#8884d8`,
          }, 
          bar: { 
            dataKey: 'totalVat', 
            fill: `${palette[1]}`,
          }, 
          line: {
            dataKey: 'vatExclusive',
            stroke: `${palette[2]}`
          },          
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/composed`  
      };

      const dashboardResult = {
        period: 'this-week',
        periodStart,
        periodEnd,
        totalQuotes: 0,
        totalBad: 0,
        repIds: [],
        statusSummary: [],
        quotes,
        charts: {
          quoteStatusFunnel,
          quoteStatusPie,
          quoteStatusComposed,
        }             
      };
      
      dashboardResult.totalQuotes = quotes.length;
      dashboardResult.statusSummary = groupQuotesByStatus(dashboardResult.quotes);
      dashboardResult.charts.quoteStatusFunnel.data = [];
      dashboardResult.charts.quoteStatusPie.data = [];
      dashboardResult.charts.quoteStatusComposed.data = [];

      dashboardResult.statusSummary.forEach((entry, index) => {

        dashboardResult.charts.quoteStatusFunnel.data.push({
          "value": entry.totalVATExclusive,
          "name": entry.key,
          "fill": `#${palette[index + 1 % palette.length]}`
        });

        dashboardResult.charts.quoteStatusPie.data.push({
          "value": entry.good,
          "name": entry.key,
          outerRadius: 140,
          innerRadius: 70,
          "fill": `#${palette[index + 1 % palette.length]}`
        });       
      });

      lodash.sortBy(quotes, [q => q.modified]).forEach((quote) => {
        dashboardResult.charts.quoteStatusComposed.data.push({
          "name": quote.id,
          "modified": moment(quote.modified).format('YYYY-MM-DD'), 
          "vatInclusive": quote.grand_total_incl_vat_cents / 100,
          "vatExclusive": quote.grand_total_excl_vat_cents / 100,
          "totalVat": quote.grand_total_vat_cents
        });
      });
      
      dashboardResult.charts.quoteStatusFunnel.data = lodash.reverse(dashboardResult.charts.quoteStatusFunnel.data);

      setCacheItem(cacheKey, dashboardResult, 60 * 5);

      return dashboardResult;
    },
    LasecGetQuoteById: async (obj, { quote_id }) => {
      const result = await getLasecQuoteById(quote_id).then();
      if(result) {
        result.timeline = [];
      }      
      return result;
    }    
  },
  Mutation: {
    LasecSetQuoteHeader: async (parent, { quote_id, input }) => {
      switch (input.action) {
        case 'NEW': {
          return lasecApi.Quotes.createQuoteHeader({ quote_id, ...input });
        }
        case 'ADD_ITEM': {
          return lasecApi.Quotes.addItemToQuoteHeader({ quote_id, ...input });
        }
        case 'REMOVE_ITEM': {
          return lasecApi.Quotes.removeItemFromHeader({ quote_id, ...input });
        }
        case 'REMOVE_HEADER': {
          return lasecApi.Quotes.removeQuoteHeader({ quote_id, ...input });
        }
        default: {
          throw new ApiError(`The ${input.action} action is not supported`);
        }
      }
    },
    LasecUpdateQuoteStatus: async (parent, { quote_id, input }) => {
      logger.debug('Mutation.LasecUpdateQuoteStatus(...)', { quote_id, input });            
      const quote = getLasecQuoteById(quote_id);
      const { user } = global;
      let reminder = null;

      if(moment.isMoment(moment(input.reminder)) === true) {
        reminder = new QuoteReminder({
          quote: quote._id,
          who: user._id,
          next: moment(reminder).valueOf(),
          actioned: false,
          via: 'microsoft',
          meta: {
            message: `Reminder, please ${input.nextAction} with customer regarding Quote ${quote_id}`
          }
        });
        await reminder.save().then();
      } 

      quote.status = input.status,
      quote.timeline.push({
        when: new Date().valueOf(),
        what: `Status updated by ${global.user.firstName} ${global.user.lastName} from quote ${quote.status} to ${input.status}`,
        who: global.user._id,
        notes: input.note,
        reason: input.reason          
      });

      amq.raiseWorkFlowEvent('startWorkflow', {
        id: 'LasecQuoteCacheInvalidate',
        version: 1,
        src: 'QuoteResolver:LasecQuoteUpdateStatus',
        data: {
          quote_id,
          quote,
          statusUpdate: input,
          reason: 'Status.Update'
        },
      });

      return {
        quote,
        success: true,
        message: 'Quote status updated'
      };      
    },
  }
};
