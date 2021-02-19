/**
 * Lasec CRM Quote Resolver.
 * 
 * Contains helpers, resolvers related to Lasec Quotes, international and local.
 */
import om from 'object-mapper';
import moment, { Moment } from 'moment';
import lodash, { isArray, isNil, isString, result } from 'lodash';
import { ObjectId } from 'mongodb';
import gql from 'graphql-tag';
import uuid from 'uuid';
import { Reactory } from '@reactory/server-core/types/reactory';
import lasecApi from '@reactory/server-modules/lasec/api';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';
import { Organization, User, Task } from '@reactory/server-core/models';
import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';
import amq from '@reactory/server-core/amq';
import { clientFor } from '@reactory/server-core/graph/client';
import { getCacheItem, setCacheItem } from '../models';
import { getProductById } from './ProductResolver';

import {
  LasecQuote,
  LasecNewQuoteInputArgs,
  LasecNewQuoteResult,
  LasecNewQuoteResponse,
  LasecQuoteItem,
  LasecQuoteHeader,
  LasecQuoteOption,
  LasecCreateSectionHeaderArgs,
  SimpleResponse,
  LasecDuplicateQuoteOptionArgs,
  LasecQuoteUpdateSectionHeaderArgs,
  LasecDeleteSectionHeaderArgs,
  ProductClass,
  LasecProduct,
  IQuoteService,
  LasecCreateQuoteOptionParams,
  LasecPatchQuoteOptionsParams,
  LasecDeleteQuoteOptionParams,
  LasecQuoteHeaderInput,
  LasecCRMCustomer,
  LasecClient,
  LasecGetFreightRequestQuoteParams,
  FreightRequestQuoteDetail,
  LasecTransportationMode,
  FreightRequestProductDetail,
  LasecCurrency,

} from '../types/lasec';

import CONSTANTS, { LOOKUPS, OBJECT_MAPS } from '../constants';
import {
  totalsFromMetaData,
  synchronizeQuote,
  getTargets,
  getQuotes,
  getQuoteEmails,
  getLasecQuoteById,
  LasecSendQuoteEmail,
  lasecGetProductDashboard,
  getSalesOrders,
  getPurchaseOrders,
  getPurchaseOrderDetails,
  getPagedQuotes,
  getPagedClientQuotes,
  lasecGetQuoteLineItems,
  getClientSalesOrders,
  getCRMSalesOrders,
  getISODetails,
  getClientInvoices,
  getClientSalesHistory,
  getCRMSalesHistory,
  getSODocuments,
  deleteSalesOrdersDocument,
  saveSalesOrderComment,
  //TODO: Werner Weber - Check why these imports are not found.
  //getSalesOrderDocBySlug,
  //uploadSalesOrderDoc,
  getCRMInvoices,
  getFreightRequetQuoteDetails,
  updateFreightRequestDetails,
  duplicateQuoteForClient,
  createNewQuote,
  saveQuoteComment,
  getQuoteComments,
  deleteQuoteComment,
  updateQuoteLineItems,
  updateQuote,
  getCompanyDetails,
  deleteQuote,
  getSalesHistoryMonthlyCount,
  lasecGetQuoteLineItem
} from './Helpers';
import { queryAsync as mysql, queryAsync } from '@reactory/server-core/database/mysql';
import { PagingRequest } from 'database/types';
import ReactoryUserModel from 'models/schema/User';

const QUOTE_SERVICE_ID = 'lasec-crm.LasecQuoteService@1.0.0';

const lookups = CONSTANTS.LOOKUPS;

const maps = { ...OBJECT_MAPS };

const totalsFromMeta = totalsFromMetaData;


const getQuoteTimeline = async (quote: any, args: any, context: Reactory.IReactoryContext, info: any) => {
  const { options = { bypassEmail: true } } = args;
  logger.debug(`Getting timeline for quote "${quote.code}" >> `, options);

  const { timeline, id, meta, code } = quote;
  const _timeline: Array<any> = []; //create a virtual timeline

  if (isArray(timeline) === true && timeline.length > 0) {
    timeline.forEach((tl: any) => _timeline.push(tl));
  }

  if (options && options.bypassEmail !== true) {
    let mails: Array<any> = [];
    try {
      mails = await getQuoteEmails(quote.code, context).then();
    } catch (exc) {
      logger.error(`Could not read the user email due to an error, ${exc.message}`);
      mails = [];
    }

    if (mails && isArray(mails) === true && mails.length > 0) {

      mails.forEach((mail) => {
        if (mail.id !== 'no-id') {
          logger.debug('Transforming Email to timeline entry', mail);
          const entry: any = om.merge(mail, {
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
            entry.what = `Email Communication from ${mail.from} ${mail.to ? 'to ' + mail.to : ''}`,
            logger.debug(`Transformed Email:\n ${JSON.stringify(mail)} \n to timeline entry \n ${entry} \n`);
          _timeline.push(entry);
        }
      });
    }
  }
  //create timeline from mails

  return lodash.sortBy(_timeline, ['when']);
}


interface LasecSendMailParams {
  code: string,
  mailMessage: Reactory.IEmailMessage
}

const $PagedLineItemsResponse = async (quote: any, context: Reactory.IReactoryContext, info: any) => {
  const { code, active_option, lineItems = [], $lineItems_meta = null } = quote;

  let $line_items: LasecQuoteItem[] = quote.lineItems || [];
  let item_paging: Reactory.IPagingRequest = {
    page: 1,
    pageSize: 25
  };

  logger.debug(`🟠 $PagedLineItemsResponse() =>  Paged Line Items Request ${quote.code || quote.id}`)

  if (quote && quote.item_paging_request) {
    item_paging = { ...item_paging, ...quote.item_paging_request };
  }



  if (!$lineItems_meta) {
    quote.lineItems = $line_items;

    const paged_results: { lineItems: LasecQuoteItem[], item_paging: Reactory.IPagingRequest } = await lasecGetQuoteLineItems(code, active_option, item_paging.page, item_paging.pageSize, context).then();
    quote.lineItems = paged_results.lineItems || [];
    quote.item_paging = paged_results.item_paging;

    logger.debug(`🟢 $PagedLineItemsResponse() =>  Paged Line Items Response ${quote.code || quote.id}`, { item_paging, paging_results: paged_results.item_paging })

    quote.$lineItems_meta = {
      when: new Date().valueOf(),
    };
  }

  return quote;
}

interface product_dimensions {
  length: number,
  height: number,
  width: number,
  volume: number,
  weight: number,
  unitOfMeasure: string
};

const PopulateProductDimensions = async ({ code }: FreightRequestProductDetail, context: Reactory.IReactoryContext): Promise<product_dimensions> => {

  if (code) {
    const result: any[] = await mysql(`
        SELECT
          product_length as length,
          product_weight as weight,
          product_height as height,
          product_volume as volume,
          product_width as width,
          pack_size as unitOfMeasure
        FROM Product WHERE code = '${code}';`, 'mysql.lasec360', undefined, context).then();

    if (result && result.length === 1) {
      return result[0];
    }
  };

  return {
    height: 0,
    length: 0,
    volume: 0,
    weight: 0,
    width: 0,
    unitOfMeasure: "none"
  }

}

export default {
  CRMSaleOrderComment: {
    id: ({ id, _id }: any) => id || _id,
    who: async ({ who }: any) => {
      if (ObjectId.isValid(who)) {
        return User.findById(who);
      }
    }
  },
  QuoteReminder: {
    id: ({ id, _id }: any) => id || _id,
    who: ({ id, who = [] }: any) => {
      if (who.length === 0) return null

      return who.map((whoObj: any) => ObjectId.isValid(whoObj) ? User.findById(whoObj) : null);
    },
    quote: ({ quote }: any) => {
      if (quote && ObjectId.isValid(quote) === true) return Quote.findById(quote);
      else return null;
    }
  },
  QuoteTimeLine: {
    who: (tl: any) => {
      if (ObjectId.isValid(tl.who)) {
        return User.findById(tl.who);
      }

      return null;
    },
    reminder: (tl: any) => {
      if (ObjectId.isValid(tl.reminder) === true) {
        return QuoteReminder.findById(tl.reminder);
      }

      return null;
    }

  },
  Invoice: {

    gp: async (invoice: any, params: any, context: Reactory.IReactoryContext): Promise<number> => {


      if (context && context.quote) {
        if (context.quote && context.quote.meta && context.quote.meta.source) return context.quote.meta.source.gp_percent || 0;
      }

      const quoteService: IQuoteService = context.getService(QUOTE_SERVICE_ID);

      const quote = await quoteService.getQuoteById(invoice.quoteId).then();

      context.quote = quote;

      if (quote && quote.meta && quote.meta.source) return quote.meta.source.gp_percent || 0;

      return 0;
    },

    mup: async (invoice: any, params: any, context: Reactory.IReactoryContext): Promise<number> => {


      if (context && context.quote) {
        if (context.quote && context.quote.meta && context.quote.meta.source) return context.quote.meta.source.mup_percent || 0;
      }

      const quoteService: IQuoteService = context.getService(QUOTE_SERVICE_ID);

      const quote = await quoteService.getQuoteById(invoice.quoteId).then();

      context.quote = quote;

      if (quote && quote.meta && quote.meta.source) return quote.meta.source.mup_percent || 0;

      return 0;
    },

  },
  LasecQuoteItem: {
    id: ({ id, _id }: any) => (id || _id),
    product: async (line_item: LasecQuoteItem, args: any, context: Reactory.IReactoryContext): Promise<LasecProduct> => {
      logger.debug('Resolving Product for Line Item', line_item)

      if (!line_item.product && line_item.meta.source.product_id) {
        line_item.product = await getProductById({ productId: line_item.meta.source.product_id }, true, context).then()
      }

      return line_item.product;
    },
    header: (line_item: LasecQuoteItem) => {
      let header: any = {
        id: null,
        heading: '',
      }
      if (line_item && line_item.meta && line_item.meta.source) {
        const quote_item = line_item.meta.source;

        return {
          id: quote_item.quote_heading_id,
          heading: '',
        }
      }

      return header;
    },
    position: (line_item: LasecQuoteItem) => {
      return parseInt(`${line_item.meta.source.position || 0}`)
    }
  },
  Quote: {
    id: ({ _id }) => {
      return `${_id}`;
    },
    quote_id: (quote: LasecQuote) => {
      return quote.code || quote.meta.source.id
    },
    lasec_client: async (quote: LasecQuote): Promise<LasecClient> => {

      return {
        fullName: quote.meta.source.customer_full_name,
        id: quote.meta.source.customer_id
      }

    },
    lasec_customer: async (quote: LasecQuote, args: any, context: { partner: Reactory.IReactoryClientDocument, item_paging?: Reactory.IPagingRequest }, info: any): Promise<LasecCRMCustomer> => {
      return null;
    },
    currencies: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext) => {
      try {
        const cacheKey = 'lasec-crm.Quote.Currencies.All';
        let results = await getCacheItem(cacheKey, null, 60, context.partner).then();
        if (!results) {
          results = await queryAsync(`SELECT currencyid as id, code, name, symbol, spot_rate, web_rate FROM Currency`, 'mysql.lasec360', null, context).then();
          if (results) setCacheItem(cacheKey, results, 60, context.partner);
        }

        return results;
      } catch (err) {
        return []
      }
    },
    code: (quote: LasecQuote) => {
      const { meta, code } = quote;
      if (code && typeof code === 'string') return code;
      if (meta && meta.reference) return meta.reference;
      if (meta && meta.source.id) return meta.source.id;

      return null;
    },
    customer: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext) => {
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
          // Check if a customer with this reference exists?          
          // eslint-disable-next-line / tslint:disable-next-line 
          let _customer = await User.findByForeignId(customer_id, context.partner.key).then();
          if (_customer !== null) {
            logger.debug(`Customer ${_customer.fullName(false)} found via foreign reference`);
            let $parsed = User.parse(customer_full_name);

            _customer.firstName = $parsed.firstName;
            _customer.lastName = $parsed.lastName;

            _customer.save()

            quote.customer = _customer._id;
            if (typeof quote.save === 'function') {
              try { await quote.save() } catch (parallelSaveError) {
                logger.warn(`Could not update quote`, parallelSaveError);
              }
            }
            return _customer;
          }
          else {
            // tslint:disable-next-line
            _customer = User.parse(customer_full_name);
            _customer = new User(_customer);
            _customer._id = new ObjectId();
            _customer.setPassword(uuid());

            _customer.meta = {};
            _customer.meta.owner = context.partner.key;
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
            _customer.addRole(context.partner._id, 'CUSTOMER');
            amq.raiseWorkFlowEvent('startWorkFlow', {
              id: 'LasecSyncCustomer',
              version: 1,
              src: 'QuoteResolver:Quote.customer()',
              data: {
                reference: customer_id,
                id: _customer.id,
                owner: context.partner.key,
                user: context.user.id,
              },
            }, context.partner);

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
    headers: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext): Promise<LasecQuoteHeader[]> => {

      let headers: LasecQuoteHeader[] = [];
      const quoteService: IQuoteService = context.getService(QUOTE_SERVICE_ID) as IQuoteService;
      let quote_headers = await quoteService.getQuoteHeaders(quote.code).then()

      headers = [{
        id: null,
        header_id: null,
        quote_item_id: -1,
        quote_id: quote.code,
        heading: 'Uncategorized',
        headerId: null,
        items: [],
      }];

      quote_headers.forEach((heading: LasecQuoteHeader) => {
        headers.push(heading)
      })

      return headers;
    },
    lineItems: async (quote: any, args: any, context: Reactory.IReactoryContext, info: any) => {
      if (!quote.lineItems || quote.lineItems.length === 0) quote = await $PagedLineItemsResponse(quote, context, info).then()
      return quote.lineItems;
    },
    item_paging: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext, info: any) => {
      if (!quote.item_paging) quote = await $PagedLineItemsResponse(quote, context, info).then()
      return quote.item_paging;
    },
    statusName: (quote: LasecQuote) => {
      const { source } = quote.meta;
      return quote.statusName || source.status_name;
    },
    status: ({ status, meta }: LasecQuote) => {
      return status || meta.source ? meta.source.status_id : 'unset';
    },
    statusGroup: ({ meta }: LasecQuote) => {
      return meta.source &&
        meta.source.substatus_id ? meta.source.substatus_id : '1';
    },
    allowed_statuses: (quote: LasecQuote) => {
      const { meta } = quote;

      if (meta && meta.source && meta.source.allowed_status_ids) {
        return meta.source.allowed_status_ids
      }

      return []
    },
    statusGroupName: (quote: LasecQuote) => {
      const { statusGroupName, meta } = quote;

      if (statusGroupName) return statusGroupName;

      if (meta && meta.source.substatus_id) {
        quote.statusGroupName = lookups.statusGroupName[`${meta.source.substatus_id}`];

        return quote.statusGroupName;
      }

      return null;
    },
    totals: (quote: LasecQuote) => {
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
    allowedStatus: ({ meta }: LasecQuote) => {
      return meta && meta.source && meta.source.allowed_status_ids
    },
    company: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext) => {
      const { meta } = quote;


      if (isNil(quote.company) === false && quote.company._bsontype === "ObjectID") {
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
        const { company_id, company_trading_name } = meta.source;
        if (company_trading_name && company_id) {
          //check if a customer with this reference exists?
          logger.debug(`No organization, checking foreign reference ${company_id} ${context.partner.key}`);
          let _company = await Organization.findByForeignId(company_id, context.partner.key).then();

          if (_company !== null) {
            if (typeof quote.save === "function") {
              quote.company = _company._id;
              await quote.save();
            }

            return _company;
          }
          else {
            logger.debug(`No organization found in meta reference, adding new organization ${company_id} ${company_trading_name}`);
            _company = new Organization({
              _id: new ObjectId(),
              meta: {
                owner: context.partner.key,
                reference: company_id,
                mustSync: true,
                lastSync: null,
              },
              name: company_trading_name,
              tradingName: company_trading_name,
              clients: {
                active: [context.partner.key]
              },
              code: company_id,
              createdAt: new Date().valueOf(),
              updatedAt: new Date().valueOf(),
              public: false,
              updatedBy: context.user._id
            });

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
                owner: context.partner.key,
                user: context.user.id,
              },
            }, context.partner);

            _company.save();

            return _company;
          }
        }
      }

      throw new ApiError('No Company Info')
    },
    totalVATExclusive: (quote: LasecQuote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVATExclusive) return totals.totalVATExclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATExclusive;
      }

      return 0;
    },
    totalVAT: (quote: LasecQuote) => {
      const { totals, meta } = quote;

      if (totals && totals.totalVAT) return totals.totalVAT;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;

        return _totals.totalVAT;
      }

      return 0;
    },
    totalVATInclusive: async (quote: LasecQuote, fieldArgs: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { totals, meta } = quote;
      const _totals = totalsFromMeta(meta);
      let _totalVATInclusive = _totals.totalVATInclusive;

      if (_totalVATInclusive === 0) return _totalVATInclusive;

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');
      const currencies = await quoteService.getCurrencies().then();

      if (currencies) {
        const currency_id = parseInt(meta.source.currency_id || "1");
        if (currency_id !== 1) {
          let activeCurrency = lodash.find(currencies, { id: currency_id });
          if (activeCurrency.web_rate) {
            logger.debug(`Currency is ${meta.source.currency_symbol} with rate ${activeCurrency.web_rate}`)
            _totalVATInclusive = _totals.totalVATInclusive / activeCurrency.web_rate;
          }
        }
      }

      logger.debug(`Total for Quote Inclusive ${meta.source.currency_symbol} ${_totalVATInclusive}`);
      return _totalVATInclusive;
    },
    totalVATExclusiveQuoteCurrency: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { totals, meta } = quote;
      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');
      const currencies = await quoteService.getCurrencies().then();

      if (currencies) {
        let activeCurrency = lodash.find(currencies, { code: quote.activeCurrency });
        if (activeCurrency.web_rate) {
          const _totals = totalsFromMeta(meta);
          return _totals.totalVATInclusive / activeCurrency.web_rate
        }
      }

      if (totals && totals.totalVATInclusive) return totals.totalVATInclusive;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.totalVATInclusive;
      }

      return 0;
    },
    totalVATInclusiveQuoteCurrency: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { totals, meta } = quote;

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');
      const _totals = totalsFromMeta(meta);


      const currencies = await quoteService.getCurrencies().then();

      if (currencies) {
        let activeCurrency = lodash.find(currencies, { symbol: quote.meta.source.currency_symbol });
        if (activeCurrency && activeCurrency.web_rate) {
          return _totals.totalVATExclusive / activeCurrency.web_rate
        }
      }


      if (totals && totals.totalVATExclusive) return totals.totalVATExclusive;

      if (meta.source) {
        quote.totals = _totals;
        return _totals.totalVATInclusive;
      }

      return 0;
    },
    GP: (quote: LasecQuote) => {
      const { totals, meta } = quote;

      if (totals && totals.GP) return totals.GP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.GP;
      }

      return 0;
    },
    actualGP: (quote: LasecQuote) => {
      const { totals, meta } = quote;

      if (totals && totals.actualGP) return totals.actualGP;

      if (meta.source) {
        const _totals = totalsFromMeta(meta);
        quote.totals = _totals;
        return _totals.actualGP;
      }

      return 0;
    },
    created: ({ created }: LasecQuote) => { return moment(created); },
    modified: ({ modified }: LasecQuote) => { return moment(modified); },
    expirationDate: ({ expirationDate, meta }: LasecQuote) => {
      if (expirationDate) return moment(expirationDate);
      if (meta && meta.source && meta.source.expiration_date) return moment(meta.source.expiration_date);
      return null;
    },
    note: ({ note }: LasecQuote) => (note),
    timeline: getQuoteTimeline,
    lastAction: async (quote: LasecQuote) => {
      let items = await getQuoteTimeline(quote, { bypassEmail: true }, null, null).then();
      if (items && items.length > 0) {
        return items[0];
      }
    },
    meta: (quote: LasecQuote) => {
      return quote.meta || {}
    },
    active_option: (quote: LasecQuote): String => {
      if (typeof quote.active_option === 'string') {
        return quote.active_option
      }

      if (quote.meta && quote.meta.source && quote.meta.source.quote_options) {
        if (isArray(quote.meta.source.quote_options) === true && quote.meta.source.quote_options.length > 0) {
          return quote.meta.source.quote_options[0]
        }
      }

      return null
    },
    incoterms: (quote: LasecQuote, args: any, context: Reactory.IReactoryContext) => {
      return (context.getService(QUOTE_SERVICE_ID) as IQuoteService).getIncoTerms();
    },
    options: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext): Promise<LasecQuoteOption[]> => {
      let result: LasecQuoteOption[] = [];


      const { source } = quote.meta;
      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');

      if (source.quote_option_ids.length > 0) {
        try {

          logger.debug(`🟠 Getting Options for quote ${source.id}`)


          result = await quoteService.getQuoteOptionsDetail(source.id, source.quote_option_ids).then()

          if (result && result.length > 0) {
            quote.options = result;
            //if (quote.save && typeof quote.save === 'function') quote.save();

            logger.debug(`🟢 Getting Options for quote ${source.id} return ${result.length}`, { result })

            return result;
          }
        } catch (optionFetchError) {
          logger.error(`🚨 Error Fetching Options for ${quote}`);
        }
      }

      return result;
    },
    activeCurrency: async (quote: LasecQuote, args: any, context: Reactory.IReactoryContext): Promise<LasecCurrency> => {

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0');
      const currencies = await quoteService.getCurrencies().then();

      if (currencies) {
        let activeCurrency = lodash.find(currencies, { symbol: quote.meta.source.currency_symbol });

        return activeCurrency;
      }

      throw new ApiError(`No active currency information found for quote ${quote.code}`)
    }
  },
  LasecCompany: {
    id: ({ id }: LasecQuote) => (id),
  },
  LasecCustomer: {
    id: ({ id }: LasecQuote) => (id),
    // fullName: (customer: any, args: any, context: Reactory.IReactoryContext) => {
    //   debugger

    //   if (customer.fullName && typeof customer.fullName === 'function') {
    //     return customer.fullName(false);
    //   }

    //   if (customer.fullName && typeof customer.fullName === 'string') return customer.fullName;

    //   return customer

    // }
  },
  LasecQuoteDashboard: {
    id: ({
      period, periodStart, periodEnd, status,
    }: any) => {
      return `${period}.${moment(periodStart).valueOf()}.${moment(periodEnd).valueOf()}`;
    },
  },
  LasecQuoteComment: {
    id: ({ id, _id }: any) => id || _id,
    who: async ({ who }: any) => {
      if (ObjectId.isValid(who)) {
        return User.findById(who);
      }
    }
  },
  LasecQuoteOption: {

  },
  FreightRequestProductDetail: {
    length: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { length } = item;

      if (length && length > 0) return length;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.length;
    },
    width: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { width } = item;

      if (width && width > 0) return width;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.width;
    },
    height: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { height } = item;

      if (height && height > 0) return height;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.height;
    },
    volume: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { volume } = item;

      if (volume && volume > 0) return volume;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.volume;
    },
    weight: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      const { weight } = item;

      if (weight && weight > 0) return weight;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.weight;
    },
    unitOfMeasure: async (item: FreightRequestProductDetail, args: any, context: Reactory.IReactoryContext): Promise<string> => {
      const { unitOfMeasure } = item;

      if (unitOfMeasure && unitOfMeasure !== "") return unitOfMeasure;


      if (!item._dimensions) {
        item._dimensions = await PopulateProductDimensions(item, context);
        item = { ...item, ...item._dimensions };
      }

      return item.unitOfMeasure;
    },
  },
  Query: {
    LasecTransportationModes: async (obj: any, params: any, context: Reactory.IReactoryContext): Promise<LasecTransportationMode[]> => {
      return (context.getService(QUOTE_SERVICE_ID, {}, context) as IQuoteService).getQuoteTransportModes();
    },
    LasecGetQuoteList: async (obj: any, { search }: any, context: Reactory.IReactoryContext) => {
      return getQuotes({ search }, context);
    },
    LasecGetProductDashboard: async (obj: any, { dashparams }: any, context: Reactory.IReactoryContext) => {
      return lasecGetProductDashboard(dashparams, context);
    },
    LasecGetQuoteById: async (obj: any, params: { quote_id: string, option_id?: string, item_paging: PagingRequest }, context: Reactory.IReactoryContext) => {

      const { quote_id, option_id, item_paging } = params;

      if (isNil(quote_id) === true) throw new ApiError('This method requies a quote id to work');
      const result = await getLasecQuoteById(quote_id, context.partner, context).then();

      result.active_option = option_id || result.meta.source.quote_option_ids[0]
      logger.debug(`QUOTE RESULT:: ${JSON.stringify(result)}`);

      result.item_paging_request = item_paging

      return result;
    },

    LasecGetQuoteComments: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getQuoteComments(args, context);
    },
    LasecGetCRMQuoteList: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getPagedQuotes(args, context);
    },
    LasecGetCRMClientQuoteList: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getPagedClientQuotes(args, context);
    },
    LasecGetCRMSalesOrders: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getSalesOrders(args, context);
    },

    LasecGetCRMClientInvoices: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getClientInvoices(args, context);
    },
    LasecGetCRMInvoices: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCRMInvoices(args, context);
    },

    // CLIENT SALES HISTORY
    LasecGetCRMClientSalesHistory: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getClientSalesHistory(args, context);
    },

    // ALL SALES HISTORY
    LasecGetCRMSalesHistory: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCRMSalesHistory(args, context);
    },

    // MONTHLY TOTALS
    // FOR ALL SALES HISTORY AND FOR CLIENT SPECIFIC SALES HISTORY
    LasecGetSalesHistoryMonthTotals: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getSalesHistoryMonthlyCount(args, context);
    },

    /**
     * It does not appear like this resolver is being called anywhere.
     * @param obj 
     * @param args 
     * @param context 
     */
    LasecGetSalesOrderDocumentBySlug: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      /// return getSalesOrderDocBySlug(args, context);

      throw new ApiError("NOT IMPLMENTED")
    },
    LasecGetFreightRequestQuoteDetail: async (obj: any, args: LasecGetFreightRequestQuoteParams, context: Reactory.IReactoryContext): Promise<FreightRequestQuoteDetail> => {
      try {
        const result: FreightRequestQuoteDetail = await getFreightRequetQuoteDetails(args, context).then();
        return result;
      } catch (unhandledError) {
        if (unhandledError instanceof ApiError) throw ApiError;

        logger.error(`Unhandled error while Getting Freight Request Detail for Quote ${args.quoteId}`, unhandledError);
        throw new ApiError('Unandled Error', unhandledError);
      }
    },
    LasecGetCompanyDetailsforQuote: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCompanyDetails(args, context);
    },
    LasecGetQuotePDFUrl: async (obj: any, args: { quote_id: string }, context: Reactory.IReactoryContext) => {

      const pdfresult = await lasecApi.Quotes.getQuotePDF(args.quote_id, false, context).then();

      let result = {
        id: args.quote_id,
        url: pdfresult.url,
      };

      logger.debug(`Returning Result for LasecGetQuotePDFUrl`, result)

      return result;
    },
    LasecGetQuoteProformaPDFUrl: async (obj: any, args: { quote_id: string }, context: Reactory.IReactoryContext) => {

      const pdfresult = await lasecApi.Quotes.getQuoteProforma(args.quote_id, false, context).then();

      let result = {
        id: args.quote_id,
        url: pdfresult.url,
      };

      logger.debug(`Returning Result for LasecGetQuoteProformaPDFUrl`, result)

      return result;
    },
    LasecGetCurrencies: async (parent: any, params: any, context: Reactory.IReactoryContext) => {

      try {
        return await queryAsync(`SELECT currencyid as id, code, name, symbol, spot_rate, web_rate FROM Currency`, 'mysql.lasec360', undefined, context).then();
      } catch (err) {
        return []
      }
    },
  },
  Mutation: {

    LasecUpdateQuoteStatus: async (parent: any, { quote_id, input }: any, context: Reactory.IReactoryContext) => {

      logger.debug('Mutation.LasecUpdateQuoteStatus(...)', { quote_id, input });

      let _message = 'Quote status updated.';

      const timelineEntry: any = {
        when: new Date().valueOf(),
        what: '',
        who: context.user._id,
        notes: input.note,
        reason: input.reason
      };

      if (input.status) {
        try {
          let status_update_result = await lasecApi.Quotes.updateQuote({ "item_id": quote_id, "values": { status_id: input.status } }, context).then()
          logger.debug(`Quote Status Update Result ${JSON.stringify(status_update_result)}`)
          _message = status_update_result.status !== "success" ? 'Quote status not updated' : _message;
          timelineEntry.what = `Quote status updated to ${input.status_name} by ${context.user.fullName(false)}`;
        } catch (apiError) {
          logger.error(`Api Error when updating quote status`);
        }
      }

      const quote = await getLasecQuoteById(quote_id, context.partner, context).then();

      if (!quote) {
        const message = `Quote with quote id ${quote_id}, not found`;
        throw new ApiError(message, { quote_id, message, code: 404 });
      }

      if (!quote.note && input.note) {
        quote.note = input.note;
      }

      const { user } = context;

      let reminder: any = null;

      if (lodash.isArray(quote.timeline) === false) quote.timeline = [];

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
            partner: context.partner,
            user: context.user,
            quote: quote
          },
        }, context.partner);
        timelineEntry.reminder = reminder._id;
      }
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

      if (reminder) {
        let taskCreated = false;

        if (user.getAuthentication("microsoft") !== null) {
          const taskCreateResult: any = await clientFor(user, context.partner).mutate({
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
            _message = '. Task synchronized via Outlook task.'
          }
        }
      }

      return {
        quote,
        success: true,
        message: `${_message}`
      };
    },

    LasecUpdateQuote: async (parent: any, args: any, context: Reactory.IReactoryContext) => {
      return updateQuote(args, context);
    },

    LasecCreateClientEnquiry: async (parent: any, params: any, context: Reactory.IReactoryContext) => {
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
    SynchronizeNextActionsToOutloook: async (parent: any, { nextActions }: any, context: Reactory.IReactoryContext) => {

      // TODO - at a later stage
      // Add categories to the task, so we can pull all tasks for that period and then delete
      // tasks that have been actioned

      const { user } = context;

      nextActions.forEach(async (action: any) => {
        const quoteReminder: any = await QuoteReminder.findById(action.id).then();

        if ((!quoteReminder.meta || !quoteReminder.meta.reference || !quoteReminder.meta.reference.source || quoteReminder.meta.reference.source != 'microsoft')) {
          logger.debug(`CREATING TASK FOR:: ${action.id}`);
          if (!quoteReminder.actioned) {
            if (user.getAuthentication("microsoft") !== null) {
              const taskCreateResult: any = await clientFor(user, context.partner).mutate({
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
            const taskDeleteResult = await clientFor(user, context.partner).mutate({
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
    LasecMarkNextActionAsActioned: async (parent: any, { id }: any, context: Reactory.IReactoryContext) => {
      const { user } = context;
      const quoteReminder: any = await QuoteReminder.findById(id).then();
      if (!quoteReminder) {
        return {
          success: false,
          message: `Could not find a matching quote reminder.`
        }
      }
      quoteReminder.actioned = true;
      const result = await quoteReminder.save()
        .then()
        .catch((error: Error) => {
          return {
            success: false,
            message: `Could not update this quote reminder.`
          }
        });


      if (quoteReminder.meta && quoteReminder.meta.reference && quoteReminder.meta.reference.source && quoteReminder.meta.reference.source == 'microsoft') {
        const taskDeleteResult = await clientFor(user, context.partner).mutate({
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
    },
    LasecSendQuoteEmail: async (obj: any, args: LasecSendMailParams, context: Reactory.IReactoryContext) => {

      try {

        logger.debug(`💌 Sending Quote Email for quote: ${args.code}`, { message: args.mailMessage });

        const quoteService: IQuoteService = context.getService("lasec-crm.LasecQuoteService") as IQuoteService;
        const fileService: Reactory.Service.IReactoryFileService = context.getService("core.ReactoryFileService") as Reactory.Service.IReactoryFileService;
        const { subject, contentType, body, saveToSentItems = true, to, via, userId, attachments, bcc = [], cc = [], id } = args.mailMessage;

        const response: Reactory.EmailSentResult = await quoteService.sendQuoteEmail(args.code, subject, body, to, cc, bcc, attachments).then();

        if (response.success === true) {
          if (`${args.mailMessage.context}`.trim() !== '') {
            //cleaning up context files.
            fileService.removeFilesForContext(args.mailMessage.context).then();
          }
        }

        logger.debug(`🟢 Sent email sucessfully to ${to.length + cc.length + bcc.length} recipients`)

        return response;

      } catch (sendError) {

        logger.error(`🚨 Could not send the email due to an error`, sendError);

        return {
          success: false,
          message: `🚨 Could not send the email do to an error, please try again later.`
        } as Reactory.EmailSentResult
      }

      //return LasecSendQuoteEmail(args);
    },
    LasecDeleteSaleOrderDocument: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return deleteSalesOrdersDocument(args, context);
    },
    LasecUploadSaleOrderDocument: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      // return uploadSalesOrderDoc(args, context);
    },

    LasecCRMUpdateFreightRequestDetails: async (obj: any, args: { freightRequestDetailInput: FreightRequestQuoteDetail }, context: Reactory.IReactoryContext) => {
      return updateFreightRequestDetails(args);
    },
    LasecCRMDuplicateQuoteForClient: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return duplicateQuoteForClient(args, context);
    },
    LasecCreateNewQuoteForClient: async (obj: any, args: LasecNewQuoteInputArgs, context: Reactory.IReactoryContext): Promise<LasecNewQuoteResponse> => {

      const { newQuoteInput } = args;
      const { clientId, repCode } = newQuoteInput;

      logger.debug(`LasecCreateNewQuoteForClient()`, newQuoteInput);

      try {
        const response = await createNewQuote({ clientId, repCode }, context).then();

        logger.debug(`[RESOLVER] NEW QUOTE RESPONSE ${JSON.stringify(response)}`);

        return {
          success: response.success,
          message: response.message,
          quoteId: response.quoteId,
          quoteOptionId: response.quoteOptionId,
        };

      } catch (err) {

        return {
          success: false,
          quoteId: '',
          quoteOptionId: '',
          message: err.message
        };

      }
    },
    LasecSaveQuoteComment: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return saveQuoteComment(args, context);
    },
    LasecDeleteQuoteComment: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return deleteQuoteComment(args, context);
    },
    LasecDuplicateQuoteOption: async (obj: any, params: LasecDuplicateQuoteOptionArgs): Promise<LasecQuoteOption> => {
      let result: LasecQuoteOption = null;
      const { quote_id, option_id } = params

      return result;
    },
    LasecQuoteCreateSectionHeader: async (obj: any, params: LasecCreateSectionHeaderArgs): Promise<LasecQuoteHeader> => {
      let result: LasecQuoteHeader = null;
      const { quote_id, header } = params

      return result;
    },
    LasecQuoteUpdateSectionHeader: async (obj: any, params: LasecQuoteUpdateSectionHeaderArgs): Promise<LasecQuoteHeader> => {
      let result: LasecQuoteHeader = null;
      const { quote_id, header_id, header } = params


      return result;
    },
    LasecQuoteDeleteSectionHeader: async (obj: any, params: LasecDeleteSectionHeaderArgs): Promise<SimpleResponse> => {
      let result: SimpleResponse = null;
      const { quote_id, header_id } = params

      return result;
    },
    LasecQuoteAddProductToQuote: async (obj: any, params: { quote_id: string, option_id: string, product_id: string }, context: Reactory.IReactoryContext): Promise<[LasecQuoteItem]> => {
      try {
        const { quote_id, option_id, product_id } = params;
        let result: [LasecQuoteItem] = null;
        result = await lasecApi.Quotes.addProductToQuote(quote_id, option_id, product_id, context).then();
        return result;
      } catch (err) {
        logger.error(`Error communicating with Lasec API`);
        return null;
      }

    },
    LasecQuoteItemUpdate: async (obj: any, params: { quote_id: string, option_id: string, quote_item_input: LasecQuoteItem }, context: Reactory.IReactoryContext): Promise<LasecQuoteItem> => {

      try {
        let result: LasecQuoteItem = null;

        if (params.quote_item_input === null || params.quote_item_input === undefined) throw new ApiError(`LasecQuoteItemUpdate (item) parameter cannot be null`)

        let fields = {
          quantity: params.quote_item_input.quantity,
          unit_price_cents: params.quote_item_input.unit_price_cents || params.quote_item_input.price,
          position: params.quote_item_input.position,
          quote_heading_id: params.quote_item_input.quote_heading_id,
          included_in_quote_option: params.quote_item_input.included_in_quote_option,
          note: params.quote_item_input.note,
          comment: params.quote_item_input.comment,
          mark_up: params.quote_item_input.markup,
          agent_commission: params.quote_item_input.agent_commission,
          gp_percent: params.quote_item_input.GP || params.quote_item_input.gp_percent,
          freight: params.quote_item_input.freight
        }

        if (fields.quantity === null) delete fields.quantity;
        if (fields.unit_price_cents === null) delete fields.unit_price_cents;
        if (fields.position === null) delete fields.position;
        if (fields.quote_heading_id === null) delete fields.quote_heading_id;
        if (fields.included_in_quote_option === null) delete fields.included_in_quote_option;
        if (fields.note === null) delete fields.note;
        if (fields.mark_up === null) delete fields.mark_up;
        if (fields.agent_commission === null) delete fields.agent_commission;
        if (fields.gp_percent === null) delete fields.gp_percent;
        if (fields.freight === null) delete fields.freight;

        const apiResult = await lasecApi.Quotes.updateQuoteItems({
          item_id: params.quote_item_input.quote_item_id,
          values: fields
        }, context);

        logger.debug(`LasecQuoteItemUpdate result from apiResult`, { apiResult })

        result = {
          ...params.quote_item_input,
          quote_item_id: params.quote_item_input.quote_item_id,
        }

        result = await lasecGetQuoteLineItem(params.quote_item_input.quote_item_id, context).then()

        return result;

      } catch (error) {
        logger.debug(`Error updateding LasecQuoteItemUpdate ${error.message}`, { error })
      }
    },
    LasecQuoteDeleteQuoteItem: async (obj: any, params: { quote_item_id: string }, context: Reactory.IReactoryContext): Promise<SimpleResponse> => {
      let result: SimpleResponse = null;

      try {
        result = await lasecApi.Quotes.deleteQuoteItem(params.quote_item_id, context).then();
      } catch (deleteError) {
        logger.error(`🚨 Error deleting quote item`, { deleteError });
      }

      return result;
    },
    LasecSetQuoteHeader: async (parent, params: { quote_id: string, input: LasecQuoteHeaderInput }, context: Reactory.IReactoryContext): Promise<LasecQuoteHeader> => {

      const { input, quote_id } = params

      switch (input.action) {
        case 'NEW': {
          return lasecApi.Quotes.createQuoteHeader({ quote_id, header_text: input.heading, quote_item_id: input.quote_item_id }, context);
        }
        case 'REMOVE_HEADER': {
          await lasecApi.Quotes.removeQuoteHeader({ quote_id, quote_heading_id: input.quote_header_id }, context).then();
          return {
            header_id: input.quote_header_id,
            heading: input.heading,
            quote_id: quote_id,
            quote_item_id: input.quote_item_id as string
          }
        }
        case 'UPDATE_TEXT': {
          return lasecApi.Quotes.setQuoteHeadingText({ quote_id, ...input }, context);
        }
        default: {
          throw new ApiError(`The ${input.action} action is not supported`);
        }
      }
    },


    LasecDeleteQuote: async (parent: any, params: any, context: Reactory.IReactoryContext) => {
      return deleteQuote(params, context);
    },

    LasecDeleteQuotes: async (parent: any, params: any, context: Reactory.IReactoryContext) => {
      const { quoteIds } = params;


      let response: SimpleResponse = {
        message: `Deactivated ${params.quoteIds.length} quotes`,
        success: true
      };

      try {
        const promises: Promise<any>[] = quoteIds.map((id: string) => deleteQuote({ id }, context))
        const results = await Promise.all(promises).then();
        let successCount: number, failCount: number = 0;

        results.forEach((patchResult) => {
          if (patchResult.success === true) successCount += 1;
          else failCount += 1;
        });

        if (failCount > 0) {
          if (successCount > 0) {
            response.message = `🥈 Deactivated ${successCount} clients and failed to deactivate ${failCount} clients.`;
          } else {
            response.message = ` 😣 Could not deactivate any client accounts.`;
            response.success = false;
          }
        } else {
          if (successCount === promises.length) {
            response.message = `🥇 Deactivated all ${successCount} clients.`
          }
        }
      } catch (err) {
        response.message = `😬 An error occurred while changing the client status. [${err.nessage}]`;
        logger.error(`🧨 Error deactivating the client account`, err)
      }


    },

    LasecCreateNewQuoteOption: async (parent: any, params: LasecCreateQuoteOptionParams, context: Reactory.IReactoryContext) => {
      const { quote_id, copy_from } = params;

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;

      if (copy_from) {
        return quoteService.copyQuoteOption(quote_id, copy_from)
      } else {
        return quoteService.createNewQuoteOption(quote_id)
      }
    },

    LasecPatchQuoteOption: async (parent: any, params: LasecPatchQuoteOptionsParams, context: Reactory.IReactoryContext): Promise<LasecQuoteOption> => {

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
      const { option, quote_id, option_id } = params

      const response = await quoteService.patchQuoteOption(quote_id, option_id, option).then();

      // need to get the updated option

      if (response) {
        let result: LasecQuoteOption = null;
        result = await quoteService.getQuoteOptionsDetail('', [response.quote_option_id]).then()

        logger.debug(`PATCHING - GOT QUOTE OPTION DETAILS :: ${JSON.stringify(result)}`);

        if (result && result.length > 0)
          return result[0]

        return null;
      }

      throw new ApiError('Could not update this quote option');
    },

    LasecDeleteQuoteOption: async (parent: any, params: LasecDeleteQuoteOptionParams, context: Reactory.IReactoryContext): Promise<SimpleResponse> => {

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0', {}) as IQuoteService;

      const { quote_id, option_id } = params;

      try {
        await quoteService.deleteQuoteOption(quote_id, option_id).then();

        return {
          message: `Deleted quote option ${option_id}`,
          success: true
        }
      } catch (err) {
        logger.error(`Error MutationLasecDeleteQuoteOption() ${err.message}`, { quote_id, option_id })

        return {
          message: `Deleted quote option ${option_id} failed`,
          success: false
        }
      }
    }
  }
};
