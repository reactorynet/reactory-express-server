
import om from 'object-mapper';
import moment from 'moment';
import lasecApi from '../api';
import logger from '../../../logging';
import ApiError from '../../../exceptions';
import { Quote } from '../schema/Quote';
import amq from '../../../amq';
import { Workflows } from '../workflow';

const mapQuote = (quote) => {
  logger.debug('Mapping Quote Result', quote);
  return om(quote, {

  });
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


const getQuotes = async () => {
  const quoteResult = await lasecApi.Quotes.list().then();
  const fetchPromises = [];
  for (let qidx = 0; qidx <= quoteResult.ids.length; qidx += 1) {
    fetchPromises.push(lasecApi.Quotes.list({ filter: { ids: [quoteResult.ids[qidx]] } }));
  }

  const expanded = await Promise.all(fetchPromises).then();
  logger.debug(`Fetched Expanded View for (${expanded.length}) Quotes from API`);
  const quotes = [];
  expanded.forEach((quoteItem) => {
    quotes.push({
      ...quoteItem.items[0],
    });
  });

  return quotes;
};

const groupQuotesByStatus = (quotes) => {
  const groupsByKey = {};
  quotes.forEach((quote) => {
    const key = quote.status || 'none';

    if (Object.getOwnPropertyNames(groupsByKey).indexOf(quote.status) >= 0) {
      groupsByKey[key].quotes.push(quote);
      groupsByKey[key].good += 1;
    } else {
      groupsByKey[key] = {
        quotes: [quote],
        good: 1,
        naughty: 0,
        category: '',
        key,
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
    lasec_getQuoteList: async (obj, { search }) => {
      return getQuotes();
    },
    lasec_getDashboard: async (obj, { dashparams }) => {
      const dashboardResult = {
        period: 'this-week',
        periodStart: moment().startOf('week'),
        periodEnd: moment().endOf('week'),
        totalQuotes: 80,
        totalBad: 20,
        repIds: [],
        statusSummary: [],
        quotes: await getQuotes(),
      };


      dashboardResult.totalQuotes = 80; // dashboardResult.quotes.length;
      dashboardResult.statusSummary = groupQuotesByStatus(dashboardResult.quotes);

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
