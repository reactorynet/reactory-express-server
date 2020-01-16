
import om from 'object-mapper';
import moment, { Moment } from 'moment';
import lodash, { isArray, isNil } from 'lodash';
import { ObjectId } from 'mongodb';
import gql from 'graphql-tag';
import uuid from 'uuid';
import lasecApi from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { Organization, User, Task } from '@reactory/server-core/models';
import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';
import amq from '@reactory/server-core/amq';
import { clientFor } from '@reactory/server-core/graph/client';
import O365 from '../../../azure/graph';
// import { getCacheItem, setCacheItem } from '../models';


export interface DashboardParams {
  period: string,
  periodStart: Moment,
  periodEnd: Moment,
  agentSelection: string,
  teamIds: any[],
  repIds: any[],
  status: any[]
};

export interface ProductDashboardParams extends DashboardParams {
  productClass: any[],
};

const lookups = {
  statusGroupName: {
    "1": "Draft",
    "2": "Open",
    "3": "Accepted",
    "4": "Lost",
    "5": "Expired",
    "6": "Deleted",
  }
};

const maps = {
  meta: {
    "id": ["code", "meta.reference"],
    "created": "created",
    "modified": "modified",
    "note": "note"
  },
  customer: {
    //"customer_id": "customer.meta.reference",
    //"customer_full_name": "customer.fullName",
  },
  staff: {
    "primary_api_staff_user_id": ["salesRep.meta.reference"],
    "sales_team_id": "salesTeam.meta.reference",
    "staff_user_full_name": "salesRep.fullName"
  },
  company: {
    //"company_id": "company.meta.reference",
    //"company_trading_name": ["company.tradingName", "company.name"]
  },
  status: {
    "status_id": "status",
    "substatus_id": ["statusGroup", {
      key: "statusGroupName", transform: (substatus_id) => {
        return lookups.statusGroupName[`${substatus_id}`];
      }
    }],
    "status_name": "statusName",
  },
  totals: {
    "grand_total_excl_vat_cents": ["totalVATExclusive", "totals.totalVATExclusive"],
    "grand_total_vat_cents": ["totalVAT", "totals.totalVAT"],
    "grand_total_incl_vat_cents": ["totalVATInclusive", "totals.totalVATInclusive"],
    "grand_total_discount_cents": ["totalDiscount", "totals.totalDiscount"],
    "grand_total_discount_percent": ["totalDiscountPercent", "totals.totalDiscountPercent"],
    "gp_percent": ["GP", "totals.GP"],
    "actual_gp_percent": ["actualGP", "totals.actualGP"],
  },
};


const totalsFromMeta = (meta) => {
  return om(meta.source, {
    "grand_total_excl_vat_cents": "totalVATExclusive",
    "grand_total_vat_cents": "totalVAT",
    "grand_total_incl_vat_cents": "totalVATInclusive",
    "grand_total_discount_cents": "totalDiscount",
    "grand_total_discount_percent": "totalDiscountPercent",
    "gp_percent": "GP",
    "actual_gp_percent": "actualGP",
  });
}

const defaultDashboardParams :DashboardParams = {
  period: 'this-week',
  periodStart: moment().startOf('week'),
  periodEnd: moment().endOf('week'),
  agentSelection: 'me',
  teamIds: [],
  repIds: [],
  status: []
};

const defaultProductDashboardParams : ProductDashboardParams = {
  period: 'this-week',
  periodStart: moment().startOf('week'),
  periodEnd: moment().endOf('week'),
  agentSelection: 'me',
  teamIds: [],
  repIds: [],
  status: [],
  productClass: []
};

const quoteSyncTimeout = 3;

const quote_sync = async (quote_id, owner, source = null, map = true) => {

  let _source = source;
  let _quoteDoc = {};
  const _predicate = {
    'meta.reference': quote_id,
    'meta.owner': owner || global.partner.key,
  }

  const now = moment();

  const _existing = await Quote.findOne(_predicate).then();

  if (_source === null) {
    _source = await lasecApi.Quotes.getByQuoteId(quote_id).then();
  }

  if (_source === null && _existing !== null) {
    _source = _existing.meta && _existing.meta.source ? _existing.meta.source : {};
  }

  if (map === true && _source) {
    const _map = {
      ...maps.meta,
      ...maps.company,
      ...maps.customer,
      ...maps.status,
      ...maps.totals,
    };

    _quoteDoc = om(_source, _map);
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
      const _newQuote = new Quote({
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

/**
 * Finds and / or synchronizes a record
 * @param {String} quote_id
 */
const getLasecQuoteById = async (quote_id) => {
  try {
    const owner = global.partner.key;
    let quote = await quote_sync(quote_id, owner, null, true).then();
    return quote;
  } catch (quoteFetchError) {
    logger.error(`Could not fetch Quote with Quote Id ${quote_id} - ${quoteFetchError.message}`);
    return null;
  }
};

const getQuotes = async (params) => {

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

  let quoteResult = await lasecApi.Quotes.list({ filter: apiFilter, pagination: { page_size: 10 } }).then();

  let ids = [];

  if (isArray(quoteResult.ids) === true) {
    ids = [...quoteResult.ids];
  }

  const pagePromises = [];

  if (quoteResult.pagination && quoteResult.pagination.num_pages > 1) {
    const max_pages = quoteResult.pagination.num_pages < 10 ? quoteResult.pagination.num_pages : 10;

    for (let pageIndex = quoteResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
      pagePromises.push(lasecApi.Quotes.list({ filter: apiFilter, pagination: { ...quoteResult.pagination, current_page: pageIndex } }));
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
    return quote_sync(quote.id, global.partner.key, quote, true);
  })).then();

  quotes = quoteSyncResult.map(doc => doc);

  amq.raiseWorkFlowEvent('quote.list.refresh', quotes, global.partner);

  return quotes;
};

const getTargets = async ({ periodStart, periodEnd, teamIds, repIds, agentSelection }) => {
  try {
    let lasecUsersWithTargets = null;
    switch (agentSelection) {
      case "team": {
        lasecUsersWithTargets = await lasecApi.User.getLasecUsers(teamIds).then();
        break;
      }
      //case "bu": {

      //}
      case "bu":
      case "me":
      default: {
        const lasecCreds = user.getAuthentication("lasec");
        if (!lasecCreds) {
          return [];
        } else {
          if (lasecCreds.props && lasecCreds.props.payload) {
            const staff_user_id = lasecCreds.props.payload.user_id
            lasecUsersWithTargets = await lasecApi.User.getLasecUsers([staff_user_id]).then();
          } else {
            return [];
          }
        }

      }
    }

    const targets = await Promise.all(lasecUsersWithTargets.map((lasecUser) => {
      logger.debug(`Checking targets for ${lasecUser}`);
      return new Promise((resolve, reject) => {
        logger.debug(`Checking user status:`, lasecUser);

        resolve({
          target: lasecUser.target || 1,
        });

      });
    })).then();

    return targets;

  } catch (targetFetchError) {
    logger.error(`Could not retrieve targets`, targetFetchError);
    return [];
  }
};

const getInvoices = async ({ periodStart, periodEnd }) => {
  try {

    const invoiceResult = await lasecApi.Invoices.list({ filter: { start_date: periodStart, end_date: periodEnd } }).then();
    if (invoiceResults.ids && isArray(invoiceResult.ids)) {
      const invoices = await lasecApi.Invoices.list({ filter: { ids: invoiceResult.ids } }).then();
      if (invoices && isArray(invoices.payload) === true) return invoices.payload;
      return [];
    } else {
      logger.warning(`No invoice result with ids`)
      return [];
    }

  } catch (invoiceGetError) {
    logger.error(`Error fetching invoices for period`, invoiceGetError);
    return [];
  }

};

const getISOs = async ({ periodStart, periodEnd }) => {
  try {
    const isoIds = await lasecApi.PurchaseOrders.list({ filter: { start_date: periodStart, end_date: periodEnd } }).then();
    if (isArray(isoIds.ids) === true) {
      const isos = await lasecApi.PurchaseOrders.list({ filter: { ids: isoIds.ids } }).then();
      if (isos && isArray(isos.ids) === true) {
        return iso.ids;
      }
    }
  } catch (isoGetError) {
    logger.error('Error fetching ISOs for the period', isoGetError);
    return [];
  }

};

//retrieves next actions for a user
const getNextActionsForUser = async ({ periodStart, periodEnd, user = global.user, actioned = false }) => {

  try {
    if (!user) throw new ApiError("Invalid user data", user);
    logger.debug(`Fetching nextActions (Quote Reminders) for user:: ${JSON.stringify(user)}`);
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
const getNextActionById = async (id) => {
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
const getQuoteEmails = async (quote_id) => {

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

const groupQuotesByStatus = (quotes) => {
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

const groupQuotesByProduct = (quotes) => {

  const groupsByKey = {};

  quotes.forEach((quote) => {

    const key = quote.productClass || 'None';
    const statusKey = quote.statusGroup || 'none';

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

const lasecGetProductDashboard = async (dashparams = defaultProductDashboardParams) => {

  logger.debug(`GET PRODUCT DASHBOARD QUERIED: ${JSON.stringify(dashparams)}`);

  let {
    period = 'this-week',
    periodStart = moment(dashparams.periodStart || moment()).startOf('week'),
    periodEnd = moment(dashparams.periodEnd || moment()).endOf('week'),
    agentSelection = 'me',
    teamIds = [],
    repIds = [],
    productClasses = [],
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

  let periodLabel = `Produc Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${global.user.firstName} ${global.user.lastName}`;

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
  let quotes = await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection, productClasses }).then();
  logger.debug(`QUOTES:: (${quotes.length})`);
  const targets = await getTargets({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
  logger.debug('Fetching Next Actions for User');
  const nextActionsForUser = await getNextActionsForUser({ periodStart, periodEnd, user: global.user }).then();
  logger.debug(`Fetching invoice data ${periodStart.format('YYYY-MM-DD HH:mm')} ${periodEnd.format('YYYY-MM-DD HH:mm')} ${global.user.firstName} ${global.user.lastName}`);
  const invoices = await getInvoices({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
  logger.debug('Fetching isos');
  const isos = await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();

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

  debugger;

  // TODO - REMOVE THIS. Adding a random product class.
  // const randomProductClasses = ['Product 1', 'Product 2', 'Product 3', 'Product 4'];
  // quotes.forEach(quote => {
  //   quote.productClass = randomProductClasses[Math.floor(Math.random() * randomProductClasses.length)];
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
    target: 0,
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
      quoteISOPie,
      quoteINVPie,
      quoteStatusComposed
    }
  };

  productDashboardResult.totalQuotes = quotes.length;
  productDashboardResult.productSummary = groupQuotesByProduct(quotes);
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
  targets.forEach((target) => {
    productDashboardResult.target += target.target;
    totalTargetValue += (target.target * 100) / (target.targetPercent || 100);
  });

  if (isNaN(productDashboardResult.target) && isNaN(totalTargetValue) === false) {
    productDashboardResult.targetPercent = totalTargetValue * 100 / productDashboardResult.target;
  }

  productDashboardResult.charts.quoteProductFunnel.data = lodash.reverse(productDashboardResult.charts.quoteProductFunnel.data);

  return productDashboardResult;

}

export default {
  QuoteReminder: {
    id: ({ id, _id }) => id || _id,
    who: ({ who = [] }) => {
      return who.map(whoObj => ObjectId.isValid(whoObj) ? User.findById(whoObj) : whoObj);
    },
    quote: ({ quote }) => {
      if (quote && ObjectId.isValid(quote)) return Quote.findById(quote);
      return quote;
    }
  },
  QuoteTimeLine: {
    who: (tl) => {
      if (ObjectId.isValid(tl.who)) {
        return User.findById(tl.who);
      }

      return null;
    },
    reminder: (tl) => {
      if (ObjectId.isValid(tl.reminder) === true) {
        return QuoteReminder.findById(tl.reminder);
      }

      return null;
    }

  },
  LasecQuoteItem: {
    id: ({ id, _id }) => (id || _id)
  },
  Quote: {
    id: ({ _id }) => {
      return `${_id}`;
    },
    code: (quote) => {
      const { meta, code } = quote;
      if (code && typeof code === 'string') return code;
      if (meta && meta.reference) return meta.reference;
      if (meta && meta.source.id) return meta.source.id;

      return null;
    },
    customer: async (quote) => {
      if (quote === null) throw new ApiError('Quote is null');
      const { customer } = quote;
      if (isNil(customer) === false) {
        if (customer && ObjectId.isValid(customer) === true) {
          const loadedCustomer = await User.findById(quote.customer).then();
          if (loadedCustomer !== undefined && loadedCustomer !== null) {
            return loadedCustomer;
          }
        }
      }

      if (quote.meta && quote.meta.source) {
        const { customer_full_name, customer_id } = quote.meta.source;

        if (customer_full_name && customer_id) {
          //check if a customer with this reference exists?
          let _customer = await User.findByForeignId(customer_id, global.partner.key).then();
          if (_customer !== null) {
            logger.debug(`Customer ${_customer.fullName()} found via foreign reference`);
            quote.customer = _customer._id;
            if (typeof quote.save === 'function') {
              try { await quote.save() } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }
            return _customer;
          }
          else {
            _customer = User.parse(customer_full_name);
            _customer = new User(_customer);
            _customer.setPassword(uuid());

            _customer.meta = {};
            _customer.meta.owner = global.partner.key;
            _customer.meta.reference = customer_id;
            _customer.meta.lastSync = null;
            _customer.meta.nextSync = new Date().valueOf();
            _customer.meta.mustSync = true;

            await _customer.save();
            quote.customer = _customer._id;

            if (typeof quote.save === 'function') {
              try { await quote.save(); } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }
            _customer.addRole(global.partner._id, 'CUSTOMER');
            amq.raiseWorkFlowEvent('startWorkFlow', {
              id: 'LasecSyncCustomer',
              version: 1,
              src: 'QuoteResolver:Quote.customer()',
              data: {
                reference: customer_id,
                id: _customer.id,
                owner: global.partner.key,
                user: global.user.id,
              },
            }, global.partner);

            return _customer;
          }
        }
      }

      return {
        id: new ObjectId(),
        firstName: 'NO',
        lastName: 'CUSTOMER',
        email: '404@customer.reactory.net'
      }
    },
    headers: async () => {

      let headers = [
        {
          id: new ObjectId(),
          text: 'No Header',
          headerId: 'default',
          items: [],
        }
      ];

      return headers;
    },
    lineItems: async (quote) => {
      const { code } = quote;
      const lineItems = await lasecApi.Quotes.getLineItems(code).then();
      logger.debug(`Found line items for quote ${code}`, lineItems);
      return om(lineItems, {
        'items.[].id': [
          '[].quote_item_id',
          '[].meta.reference',
          '[].line_id',
          {
            key: '[].id', transform: () => (new ObjectId())
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
    },
    statusName: (quote) => {
      const { source } = quote.meta;
      return quote.statusName || source.status_name;
    },
    status: ({ status, meta }) => {
      return status || meta.source ? meta.source.status_id : 'unset';
    },
    statusGroup: ({ meta }) => {
      return meta.source &&
        meta.source.substatus_id ? meta.source.substatus_id : '1';
    },
    statusGroupName: (quote) => {
      const { statusGroupName, meta } = quote;

      if (statusGroupName) return statusGroupName;

      if (meta && meta.source.substatus_id) {
        quote.statusGroupName = lookups.statusGroupName[`${meta.source.substatus_id}`];

        return quote.statusGroupName;
      }

      return null;
    },
    totals: (quote) => {
      const { meta, totals } = quote;

      if (totals) return totals;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);

        if (quote.save) {

          quote.totals = _totals;

          try {
            quote.save();
          } catch (parallelSaveError) {
            logger.warn(`Could not update quote`, parallelSaveError);
          }

        }

        return _totals;
      }

      return {
        totalVATExclusive: 0,
        totalVAT: 0,
        totalVATInclusive: 0,
        totalDiscount: 0,
        totalDiscountPercent: 0,
      };
    },
    allowedStatus: ({ meta }) => {
      return meta && meta.source && meta.source.allowed_status_ids
    },
    company: async (quote) => {
      const { meta } = quote;

      if (isNil(quote.company) === false) {
        if (ObjectId.isValid(quote.company) === true) {
          const loadedOrganization = await Organization.findById(quote.company).then();
          if (loadedOrganization === null || loadedOrganization === undefined) {
            logger.error(`Could not load the organization with the reference number ${quote.company}, will fallback to meta check`);
          } else {
            return loadedOrganization;
          }
        }
      }


      if (quote.meta && quote.meta.source) {
        logger.debug(`No organization, checking meta data`);
        const { company_id, company_trading_name } = meta.source;
        if (company_trading_name && company_id) {
          //check if a customer with this reference exists?
          logger.debug(`No organization, checking foreign reference ${company_id} ${global.partner.key}`);
          let _company = await Organization.findByForeignId(company_id, global.partner.key).then();
          if (_company !== null) {
            if (typeof quote.save === "function") {
              quote.company = _company._id;
              await quote.save();
            }

            return _company;
          }
          else {
            logger.debug(`No organization, checking meta data`);
            _company = new Organization({
              meta: {
                owner: global.partner.key,
                reference: company_id,
                mustSync: true,
                lastSync: null,
              },
              name: company_trading_name,
              tradingName: company_trading_name,
              clients: {
                active: [global.partner.key]
              },
              code: company_id,
              createdAt: new Date().valueOf(),
              updatedAt: new Date().valueOf(),
              public: false,
              updatedBy: global.user._id
            });

            await _company.save();

            if (typeof quote.save === "function") {
              quote.company = _company._id;
              try {
                await quote.save();
              } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }

            amq.raiseWorkFlowEvent('startWorkFlow', {
              id: 'LasecSyncCompany',
              version: 1,
              src: 'QuoteResolver:Quote.company()',
              data: {
                reference: company_id,
                id: _company._id,
                owner: global.partner.key,
                user: global.user.id,
              },
            }, global.partner);


            return _company;
          }
        }
      }

      throw new ApiError('No Company Info')
    },
    totalVATExclusive: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVATExclusive) return totals.totalVATExclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATExclusive;
      }

      return 0;
    },
    totalVAT: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVAT) return totals.totalVAT;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;

        return _totals.totalVAT;
      }

      return 0;
    },
    totalVATInclusive: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVATInclusive) return totals.totalVATInclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATInclusive;
      }

      return 0;
    },
    GP: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.GP) return totals.GP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.GP;
      }

      return 0;
    },
    actualGP: (quote) => {
      const { totals, meta } = quote;

      if (totals && totals.actualGP) return totals.actualGP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.actualGP;
      }

      return 0;
    },
    created: ({ created }) => { return moment(created); },
    modified: ({ modified }) => { return moment(modified); },
    expirationDate: ({ expirationDate, meta }) => {
      if (expirationDate) return moment(expirationDate);
      if (meta && meta.source && meta.source.expiration_date) return moment(meta.source.expiration_date);
      return null;
    },
    note: ({ note }) => (note),
    timeline: async (quote) => {

      const { timeline, id, meta, code } = quote;
      const _timeline: Array<any> = []; //create a virtual timeline

      if (isArray(timeline) === true && timeline.length > 0) {
        timeline.forEach(tl => _timeline.push(tl));
      }

      //create timeline from mails
      let mails: Array<any> = [];
      try {
        mails = await getQuoteEmails(quote.code).then();
      } catch (exc) {
        logger.error(`Could not read the user email due to an error, ${exc.message}`);
        mails = [];
      }

      if (mails && isArray(mails) === true && mails.length > 0) {

        mails.forEach((mail) => {
          if (mail.id !== 'no-id') {
            logger.debug('Transforming Email to timeline entry', mail);
            const entry = om(mail, {
              'createdAt': 'when',
              'from': {
                key: 'who',
                transform: (sourceValue: String) => {
                  //user lookup
                  return User.find({ email: sourceValue }).then()
                },
              },
              'message': 'notes'
            });
            entry.actionType = 'email',
              entry.what = `Email Communication from ${mail.from} to ${mail.to}`,
              logger.debug(`Transformed Email:\n ${mail} \n to timeline entry \n ${entry} \n`);
            _timeline.push(entry);
          }
        });
      }
      return lodash.sortBy(_timeline, ['when']);
    },
    meta: (quote) => {
      return quote.meta || {}
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
    target: (dashboard) => {

      if (dashboard.target) return dashboard.target;
      else return 1000000;
    },

    targetPercent: (dashboard) => {
      if (dashboard.targetPercent) return dashboard.targetPercent;
      return 50;
    }

  },
  // LasecQuoteProductDashboard: {
  //   id: ({
  //     period, periodStart, periodEnd, status,
  //   }) => {
  //     return `${period}.${moment(periodStart).valueOf()}.${moment(periodEnd).valueOf()}`;
  //   },
  //   target: (dashboard) => {

  //     if (dashboard.target) return dashboard.target;
  //     else return 1000000;
  //   },

  //   targetPercent: (dashboard) => {
  //     if (dashboard.targetPercent) return dashboard.targetPercent;
  //     return 50;
  //   }
  // },
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
        agentSelection = 'me',
        teamIds = [],
        repIds = [],
      } = dashparams;

      const date_period_keys = [
        { key: 'today', value: 'today', label: 'Today' },
        { key: 'yesterday', value: 'yesterday', label: 'Yesterday' },
        { key: 'this-week', value: 'this-week', label: 'This Week' },
        { key: 'last-week', value: 'last-week', label: 'Last Week' },
        { key: 'this-month', value: 'this-month', label: 'This Month' },
        { key: 'last-month', value: 'last-month', label: 'Last Month' },
        { key: 'this-year', value: 'this-year', label: 'This Year' },
        { key: 'last-year', value: 'last-year', label: 'Last Year' },
        { key: 'custom', value: 'custom', label: 'Custom' },
      ];

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

      let periodLabel = `Quotes Dashboard ${periodStart.format('DD MM YY')} till ${periodEnd.format('DD MM YY')} For ${global.user.firstName} ${global.user.lastName}`;



      /*
      let cacheKey = `quote.dashboard.${user._id}.${periodStart.valueOf()}.${periodEnd.valueOf()}`;
      let _cached = await getCacheItem(cacheKey);

      if(_cached) {
        logger.debug('Found results in cache');
        periodLabel = `${periodLabel} [cache]`;
        return _cached;
      }
      */

      logger.debug(`Fetching Lasec Dashboard Data`, dashparams);
      let palette = global.partner.colorScheme();

      logger.debug('Fetching Quote Data');
      const quotes = await getQuotes({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug('Fetching Target Data');
      const targets = await getTargets({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug('Fetching Next Actions for; User')
      const nextActionsForUser = await getNextActionsForUser({ periodStart, periodEnd, user: global.user }).then();
      logger.debug('Fetching invoice data');
      const invoices = await getInvoices({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();
      logger.debug('Fetching isos');
      const isos = await getISOs({ periodStart, periodEnd, teamIds, repIds, agentSelection }).then();


      const quoteStatusFunnel = {
        chartType: 'FUNNEL',
        data: [],
        options: {},
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/funnel`
      };

      const quoteStatusPie = {
        chartType: 'PIE',
        data: [],
        options: {
          multiple: false,
          outerRadius: 140,
          innerRadius: 70,
          fill: `#${palette[0]}`,
          dataKey: 'value',
        },
        key: `quote-status/dashboard/${periodStart.valueOf()}/${periodEnd.valueOf()}/pie`
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

      const dashboardResult = {
        period: period,
        periodLabel,
        periodStart,
        periodEnd,
        agentSelection,
        teamIds,
        repIds,
        target: 0,
        targetPercent: 0,
        nextActions: {
          owner: global.user,
          actions: nextActionsForUser
        },
        totalQuotes: 0,
        totalBad: 0,
        statusSummary: [],
        quotes,
        charts: {
          quoteStatusFunnel,
          quoteStatusPie,
          quoteISOPie,
          quoteINVPie,
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
          "name": entry.title,
          "fill": `#${palette[index + 1 % palette.length]}`
        });

        dashboardResult.charts.quoteStatusPie.data.push({
          "value": entry.totalVATExclusive,
          "name": entry.title,
          "outerRadius": 140,
          "innerRadius": 70,
          "fill": `#${palette[index + 1 % palette.length]}`
        });
      });

      lodash.sortBy(quotes, [q => q.modified]).forEach((quote) => {
        dashboardResult.charts.quoteStatusComposed.data.push({
          "name": quote.id,
          "modified": moment(quote.modified).format('YYYY-MM-DD'),
          "totalVATInclusive": quote.totals.totalVATInclusive / 100,
          "totalVATExclusive": quote.totals.totalVATExclusive / 100,
          "totalVAT": quote.grand_total_vat_cents
        });
      });

      let totalTargetValue = 0;
      targets.forEach((target) => {
        dashboardResult.target += target.target;
        totalTargetValue += (target.target * 100) / (target.targetPercent || 100);
      });

      if (isNaN(dashboardResult.target) && isNaN(totalTargetValue) === false) {
        dashboardResult.targetPercent = totalTargetValue * 100 / dashboardResult.target;
      }

      dashboardResult.charts.quoteStatusFunnel.data = lodash.reverse(dashboardResult.charts.quoteStatusFunnel.data);

      //setCacheItem(cacheKey, dashboardResult, 60 * 5);

      return dashboardResult;
    },
    LasecGetProductDashboard: async (obj, { dashparams }) => {
      return lasecGetProductDashboard(dashparams);
    },
    LasecGetQuoteById: async (obj, { quote_id }) => {
      if (isNil(quote_id) === true) throw new ApiError('This method requies a quote id to work');
      const result = await getLasecQuoteById(quote_id).then();
      return result;
    },
    LasecGetFilteredQuotes: async (obj, args) => {

      logger.info(`QUOTE RESOLVER - GETTING QUOTES::`, { args });

      const quotes = await getQuotes({
        periodStart: moment().subtract(1, 'month'),
        periodEnd: moment().endOf('month')
      }).then();
      return quotes;
      // return getQuotes();
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

      const quote = await getLasecQuoteById(quote_id).then();

      if (!quote) {
        const message = `Quote with quote id ${quote_id}, not found`;
        throw new ApiError(message, { quote_id, message, code: 404 });
      }

      if (!quote.note && input.note) {
        quote.note = input.note;
      }

      const { user } = global;

      let reminder = null;

      if (lodash.isArray(quote.timeline) === false) quote.timeline = [];

      const timelineEntry = {
        when: new Date().valueOf(),
        what: `Next actions updated by ${global.user.firstName} ${global.user.lastName} and a reminder set for ${moment().add(reminder || 3, 'days').format('YYYY-MM-DD HH:mm')}`,
        who: global.user._id,
        notes: input.note,
        reason: input.reason
      };


      if (input.reminder > 0) {
        reminder = new QuoteReminder({
          quote: quote._id,
          who: user._id,
          next: moment().add(input.reminder, 'days').valueOf(),
          actioned: false,
          actionType: input.nextAction || 'other',
          via: ['microsoft', 'reactory'],
          text: `Reminder, please ${input.nextAction} with customer regarding Quote ${quote_id}`,
          importance: 'normal',
        });
        await reminder.save().then();

        logger.debug(`SAVED REMINDER:: ${reminder}`);

        amq.raiseWorkFlowEvent('startWorkFlow', {
          id: 'LasecSetReminderForQuote',
          version: 1,
          src: 'QuoteResolver:LasecUpdateQuoteStatus',
          data: {
            reminder: reminder,
            partner: global.partner,
            user: global.user,
            quote: quote
          },
        }, global.partner);
        timelineEntry.reminder = reminder._id;
      }

      // quote.status = input.status,
      quote.timeline.push(timelineEntry);

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

      await quote.save();

      //create task via ms if the user has MS authentication
      let taskCreated = false;
      let _message = '.';
      if (user.getAuthentication("microsoft") !== null) {
        const taskCreateResult = await clientFor(user, global.partner).mutate({
          mutation: gql`
            mutation createOutlookTask($task: CreateTaskInput!) {
              createOutlookTask(task: $task) {
                Successful
                Message
                TaskId
              }
            }`, variables: {
            "task": {
              "id": `${user._id.toString()}`,
              "via": "microsoft",
              "subject": reminder.text,
              "startDate": moment(reminder.next).add(-6, "h").format("YYYY-MM-DD HH:MM"),
              "dueDate": moment(reminder.next).format("YYYY-MM-DD HH:MM")
            }
          }
        })
          .then()
          .catch(error => {
            logger.debug(`CREATE OUTLOOK TASK FAILED - ERROR:: ${error}`);
            _message = `. ${error.message}`
            return {
              quote,
              success: true,
              message: `Quote status updated${_message}`
            };
          });


        if (taskCreateResult.data && taskCreateResult.data.createOutlookTask) {

          logger.debug(`SYNCED:: ${JSON.stringify(taskCreateResult)}`);

          // Save the task id in meta on the quote reminder
          reminder.meta = {
            reference: {
              source: 'microsoft',
              referenceId: taskCreateResult.data.createOutlookTask.TaskId
            },
            lastSync: moment().valueOf(),
          }

          await reminder.save();

          taskCreated = true;
          _message = ' and task synchronized via Outlook task.'
        }
      }

      return {
        quote,
        success: true,
        message: `Quote status updated${_message}`
      };
    },
    LasecCreateClientEnquiry: async (parent, params) => {
      const { customerId: String } = params;

      return {
        id: new ObjectId(),
        customer: {
          id: new ObjectId(),
          fullName: 'Placeholder'
        },
        company: {
          id: new ObjectId(),
          tradingName: 'Trading Name'
        }
      }
    },
    SynchronizeNextActionsToOutloook: async (parent, { nextActions }) => {

      // TODO - at a later stage
      // Add categories to the task, so we can pull all tasks for that period and then delete
      // tasks that have been actioned

      const { user } = global;

      nextActions.forEach(async action => {
        const quoteReminder = await QuoteReminder.findById(action.id).then();

        if ((!quoteReminder.meta || !quoteReminder.meta.reference || !quoteReminder.meta.reference.source || quoteReminder.meta.reference.source != 'microsoft')) {
          logger.debug(`CREATING TASK FOR:: ${action.id}`);
          if (!quoteReminder.actioned) {
            if (user.getAuthentication("microsoft") !== null) {
              const taskCreateResult = await clientFor(user, global.partner).mutate({
                mutation: gql`
                  mutation createOutlookTask($task: CreateTaskInput!) {
                    createOutlookTask(task: $task) {
                      Successful
                      Message
                      TaskId
                    }
                  }`, variables: {
                  "task": {
                    "id": `${user._id.toString()}`,
                    "via": "microsoft",
                    "subject": action.text,
                    "startDate": moment(action.next).add(-6, "h").format("YYYY-MM-DD HH:MM"),
                    "dueDate": moment(action.next).format("YYYY-MM-DD HH:MM")
                  }
                }
              })
                .then()
                .catch(error => {
                  logger.debug(`CREATE OUTLOOK TASK FAILED - ERROR:: ${error}`);
                  return {
                    success: false,
                    message: `Error syncing actions`
                  };
                });

              if (taskCreateResult.data && taskCreateResult.data.createOutlookTask) {
                logger.debug(`TASK CREATED:: ${JSON.stringify(taskCreateResult)}`);
                quoteReminder.meta = {
                  reference: {
                    source: 'microsoft',
                    referenceId: taskCreateResult.data.createOutlookTask.TaskId
                  },
                  lastSync: moment().valueOf(),
                }
                await quoteReminder.save();
              }
            }
          }
        } else {

          // If is actioned delete task from outlook
          // This wont run as actioned items arent in the list
          if (action.actioned) {
            const taskDeleteResult = await clientFor(user, global.partner).mutate({
              mutation: gql`
                mutation deleteOutlookTask($task: DeleteTaskInput!) {
                  deleteOutlookTask(task: $task) {
                    Successful
                    Message
                  }
                }`, variables: {
                "task": {
                  "via": "microsoft",
                  "taskId": action.meta.reference.referenceId,
                }
              }
            })
              .then();

            if (taskDeleteResult.data && taskDeleteResult.data.deleteOutlookTask) {
              logger.debug(`TASK DELETED :: ${JSON.stringify(taskDeleteResult)}`);
              quoteReminder.meta = null;
              await quoteReminder.save();
            }
          }
        }

      });

      return {
        success: true,
        message: 'Actions successfully synced!'
      }

    },
    LasecMarkNextActionAsActioned: async (parent, { id }) => {
      const { user } = global;
      const quoteReminder = await QuoteReminder.findById(id).then();
      if (!quoteReminder) {
        return {
          success: false,
          message: `Could not find a matching quote reminder.`
        }
      }
      quoteReminder.actioned = true;
      const result = await quoteReminder.save()
        .then()
        .catch(error => {
          return {
            success: false,
            message: `Could not update this quote reminder.`
          }
        });


      if (quoteReminder.meta && quoteReminder.meta.reference && quoteReminder.meta.reference.source && quoteReminder.meta.reference.source == 'microsoft') {
        const taskDeleteResult = await clientFor(user, global.partner).mutate({
          mutation: gql`
              mutation deleteOutlookTask($task: DeleteTaskInput!) {
                deleteOutlookTask(task: $task) {
                  Successful
                  Message
                }
              }`, variables: {
            "task": {
              "via": "microsoft",
              "taskId": quoteReminder.meta.reference.referenceId,
            }
          }
        })
          .then();

        if (taskDeleteResult.data && taskDeleteResult.data.deleteOutlookTask) {
          logger.debug(`TASK DELETED :: ${JSON.stringify(taskDeleteResult)}`);
          quoteReminder.meta = null;
          await quoteReminder.save().then();
        }
      }

      return {
        success: true,
        message: `Quote reminder marked as actioned.`
      }
    }
  }
};
