
import om from 'object-mapper';
import moment from 'moment';
import lodash, { isArray } from 'lodash';
import lasecApi from '../api';
import logger from '../../../logging';
import ApiError from '../../../exceptions';
import { Quote } from '../schema/Quote';
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
      quote = await lasecApi.Quotes.getQuoteById(quote_id).then();
      quote = mapQuote(quote);

      amq.raiseWorkflowEvent('startWorkflow', {
        id: Workflows.QuoteInvalidateWorkflow.meta.name,
        data: { quote },
      });
    } else {
      quote = await Quote.findOne(predicate).populate('').then();
    }

    if (quote === null) throw ApiError('Record not found and could not be synced');

    return quote;
  } catch (quoteFetchError) {
    logger.error(`Could not fetch Quote with Quote Id ${quote_id}`);
    return null;
  }
};

const getQuotes = async (params) => {

  const apiFilter = {
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
    for(let pageIndex = quoteResult.pagination.current_page + 1; pageIndex <= quoteResult.pagination.num_pages; pageIndex += 1) {
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
      groupsByKey[key].totalVAT += groupsByKey[key].totalVAT + quote.grand_total_vat_cents;
      groupsByKey[key].totalVATExclusive += groupsByKey[key].totalVATExclusive + quote.grand_total_excl_vat_cents;
      groupsByKey[key].totalVATInclusive += groupsByKey[key].totalVATInclusive + quote.grand_total_incl_vat_cents;

    } else {
      groupsByKey[key] = {
        quotes: [quote],
        good: 1,
        naughty: 0,
        category: '',
        key,
        totalVAT: quote.grand_total_vat_cents,
        totalVATExclusive: quote.grand_total_excl_vat_cents,
        totalVATInclusive: quote.grand_total_incl_vat_cents,        
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

      const {
        period = 'this-week',
        periodStart = moment().startOf('week'),
        periodEnd = moment().endOf('week'),
        repIds = [ ],
        status = [ ]
      } = dashparams;

      let cacheKey = `quote.dashboard.${dashparams.periodStart.valueOf()}.${dashparams.periodEnd.valueOf()}`;

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
          {
            "name": "Page A",
            "uv": 4000,
            "pv": 2400,
            "amt": 2400
          },
          {
            "name": "Page B",
            "uv": 3000,
            "pv": 1398,
            "amt": 2210
          },
          {
            "name": "Page C",
            "uv": 2000,
            "pv": 9800,
            "amt": 2290
          },
          {
            "name": "Page D",
            "uv": 2780,
            "pv": 3908,
            "amt": 2000
          },
          {
            "name": "Page E",
            "uv": 1890,
            "pv": 4800,
            "amt": 2181
          },
          {
            "name": "Page F",
            "uv": 2390,
            "pv": 3800,
            "amt": 2500
          },
          {
            "name": "Page G",
            "uv": 3490,
            "pv": 4300,
            "amt": 2100
          }
        ],
        options: {
          xAxis: {
            dataKey: 'name',
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
          "value": entry.good,
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

        dashboardResult.charts.quoteStatusComposed.data.push({
          "name": entry.key,
          "vatInclusive": entry.totalVATInclusive,
          "vatExclusive": entry.totalVATExclusive,
          "totalVat": entry.totalVAT
        })
      });
      
      dashboardResult.charts.quoteStatusFunnel.data = lodash.reverse(dashboardResult.charts.quoteStatusFunnel.data);

      setCacheItem(cacheKey, dashboardResult, 60 * 5);

      return dashboardResult;
    },
    LasecGetQuoteById: async (obj, { quote_id }) => {
      return getLasecQuoteById(quote_id);
    },
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
      const found = await Quote.findOne({ code: quote_id }).then();
      if (!found) {
        const quote = new Quote({
          code: quote_id,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        amq.raiseWorkFlowEvent('startWorkflow', {
          id: 'LasecQuoteCacheInvalidate',
          version: 1,
          src: 'QuoteResolver:LasecQuoteUpdateStatus',
          data: {
            quote_id,
          },
        });

        await quote.save().then();
      }
    },
  },
};
