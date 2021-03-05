import om from 'object-mapper';
import {
  Lasec360User,
  LasecQuote,
  IQuoteService,
  LasecQuoteOption,
  SimpleResponse,
  LasecCreateSalesOrderInput,
  LasecSalesOrder,
  LasecCurrency
} from '@reactory/server-modules/lasec/types/lasec';

import {
  getCacheItem,
  setCacheItem
} from '@reactory/server-modules/lasec/models'

import {
  getLasecQuoteById,
} from '@reactory/server-modules/lasec/resolvers/Helpers'
import LAPI from '@reactory/server-modules/lasec/api';
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';
import ApiError from '@reactory/server-core/exceptions';

import { Quote, QuoteReminder } from '@reactory/server-modules/lasec/schema/Quote';

import LasecDatabase from '../../database';
import { MongooseDocument } from 'mongoose';

class LasecQuoteService implements IQuoteService {

  name: string = 'LasecQuoteService';
  nameSpace: string = 'lasec-crm';
  version: string = '1.0.0';

  registry: Reactory.IReactoryServiceRegister
  context: Reactory.IReactoryContext

  constructor(props: Reactory.IReactoryServiceProps, context: Reactory.IReactoryContext) {
    this.registry = props.$services;
    this.context = {
      partner: context.partner,
      user: context.user,
      getService: context.getService
    }
  }
  getExecutionContext(): Reactory.ReactoryExecutionContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.ReactoryExecutionContext): boolean {
    this.context = executionContext;
    return true;
  }

  async createSalesOrder(sales_order_input: LasecCreateSalesOrderInput): Promise<any> {

    try {
      const result = await LAPI.SalesOrders.createSalesOrder(sales_order_input, this.context).then();

      logger.debug('Create new sales order api result', result);

      return {
        message: `Sales order ${result.id} has been created. `,
        success: true,
        salesOrder: null,
        iso_id: result.id
      };

    } catch (createSalesOrderError) {
      logger.error(`Create new sales order ${createSalesOrderError.message} failed due to an error`, createSalesOrderError);
      return {
        message: createSalesOrderError.message,
        success: false,
        salesOrder: null,
        iso_id: null,
      }
    }

  }

  async getQuoteHeaders(quote_id: string): Promise<any> {
    try {
      return await LAPI.Quotes.getQuoteHeaders(quote_id, this.context).then();
    } catch (err) {
      logger.error(`Error returning headers`);
      return [];
    }

  }
  async getQuoteTransportModes(): Promise<any> {
    try {
      let cache_key = 'lasec-crm.data.all-transport-modes';
      let items = await getCacheItem(cache_key, null, 180 * 3, this.context.partner).then()



      if (!items) {
        items = await LAPI.Quotes.getQuoteTransportModes(this.context).then()
        logger.debug(`↔ [FETCHED] lasec-crm.QuoteService getQuoteTransportModes()`, { fetched: items });
        setCacheItem(cache_key, items, 180 * 3, this.context.partner);
      } else {
        logger.debug(`🔄[CACHED] lasec-crm.QuoteService getQuoteTransportModes()`, { cached: items });
      }

      return items || [];
    } catch (err) {
      logger.error(`getIncoTerms() ${err.messag}`)
      return [];
    }
  }

  async getQuoteOptionDetail(quote_id: string, option_id: string): Promise<LasecQuoteOption> {
    try {
      logger.debug(`Calling LAPI.Quote.getQuoteOption(${option_id})`);
      const payload = await LAPI.Quotes.getQuoteOption(option_id, this.context).then()

      return om.merge(payload, {
        "id": ["id", "quote_option_id"],
        "name": "option_name",
        "inco_terms": "incoterm",
        "named_place": "named_place",
        "special_comment": "special_comment",
        "grand_total_discount_cents": "discount",
        "grand_total_discount_percent": "discount_percent",
        "grand_total_excl_vat_cents": "total_ex_vat",
        "grand_total_incl_vat_cents": "total_incl_vat",
        "grant_total_vat_cents": "vat",
        "gp_percent": "gp_percent",
        "actual_gp_percent": "gp",
      }) as LasecQuoteOption; // eslint-disable-line
    } catch (convertError) {
      logger.error(`💥 Could not get quote option details ${convertError.message}`, { error: convertError })
    }
  }
  async getQuoteOptionsDetail(quote_id: string, option_ids: string[]): Promise<LasecQuoteOption[]> {
    try {
      logger.debug(`Calling LAPI.Quote.getQuoteOption(${option_ids})`);
      const payload = await LAPI.Quotes.getQuoteOptions(option_ids, this.context).then()

      logger.debug(`Payload received LAPI.Quote.getQuoteOption(${option_ids})`, { payload })

      let converted = om.merge(payload, {
        "items[].id": ["[].id", "[].quote_option_id"],
        "items[].name": "[].option_name",
        "items[].inco_terms": "[].inco_terms",
        "items[].named_place": "[].named_place",
        "items[].special_comment": "[].special_comment",
        "items[].grand_total_discount_cents": "[].discount",
        "items[].grand_total_discount_percent": "[].discount_percent",
        "items[].grand_total_excl_vat_cents": "[].total_ex_vat",
        "items[].grand_total_incl_vat_cents": "[].total_incl_vat",
        "items[].grant_total_vat_cents": "[].vat",
        "items[].gp_percent": "[].gp_percent",
        "items[].actual_gp_percent": "[].gp",
        "items[].transport_mode": "[].transport_mode",
      }) as LasecQuoteOption[];

      logger.debug(`Returning getQuoteOptionsDetail(${option_ids})`, { converted })

      return converted;
    } catch (convertError) {
      logger.error(`💥 Could not get quote option details ${convertError.message}`, { error: convertError })
    }
  }
  async getIncoTerms(): Promise<string[]> {
    try {
      let cache_key = 'lasec-crm.data.all-incoterms';
      let items = await getCacheItem(cache_key, null, 180 * 3, this.context.partner).then()
      logger.debug(`lasec-crm.QuoteService getIncoterms()`, { cached: items });

      if (!items) {
        const payload = await LAPI.Quotes.getIncoTerms(this.context).then()
        items = payload || [];

        logger.debug(`lasec-crm.QuoteService getIncoterms()`, { fetched: items });
        setCacheItem(cache_key, items, 180 * 3, this.context.partner);
      }

      return items || [];
    } catch (err) {
      logger.error(`getIncoTerms() ${err.messag}`)
      return [];
    }
  }
  async createNewQuoteOption(quote_id: string): Promise<LasecQuoteOption> {
    const payload = await LAPI.Quotes.createQuoteOption(quote_id, this.context).then()

    return {
      id: payload.id,
      quote_id: quote_id,
      quote_option_id: payload.id,
      gp: 0,
      gp_percent: 0
    }
  }
  async patchQuoteOption(quote_id: string, quote_option_id: string, option: LasecQuoteOption): Promise<LasecQuoteOption> {


    logger.debug(`STARTING!!! ==> patchQuoteOption ${quote_id}, ${quote_option_id},  ${JSON.stringify(option)}`);


    const payload = await LAPI.Quotes.patchQuoteOption(quote_id, quote_option_id, {
      name: option.option_name,
      inco_terms: option.inco_terms,
      named_place: option.named_place,
      transport_mode: option.transport_mode,
      currency: option.currency
    }, this.context).then();


    const quote: any = await Quote.find({ code: quote_id }).then();

    let patched: boolean = null;
    if (quote && quote.options) {
      quote.options.forEach(($option: LasecQuoteOption) => {
        if ($option.quote_option_id === quote_option_id) {
          if (option.inco_terms) $option.incoterm = option.inco_terms;
          if (option.named_place) $option.named_place = option.named_place;
          if (option.transport_mode) $option.transport_mode = option.transport_mode;
          if (option.currency) $option.currency;
          if (option.vat_exempt) $option.vat_exempt = option.vat_exempt;
          if (option.from_sa) $option.from_sa = option.from_sa;

          patched = true;
        }
      });

      if (patched === true) {
        quote.save().then()
      }
    }

    logger.debug(`Payload Response ==> patchQuoteOption`, payload);
    return payload;
  }
  async deleteQuoteOption(quote_id: string, quote_option_id: string): Promise<SimpleResponse> {

    try {
      await LAPI.Quotes.deleteQuoteOption(quote_id, quote_option_id, this.context);

      return {
        message: `Deleted quote option ${quote_option_id}`,
        success: true,
      };
    } catch (error) {
      logger.error(error.message);
      throw new ApiError('Could not delete quote option', error);
    }

  }
  async copyQuoteOption(quote_id: string, quote_option_id: string): Promise<LasecQuoteOption> {

    try {
      const payload = await LAPI.Quotes.copyQuoteOption(quote_id, quote_option_id, this.context).then();
      logger.debug(`Payload Response ==> copyQuoteOption`, payload);

      return {
        id: payload.new_quote_option_id,
        quote_option_id: payload.new_quote_option_id,
        quote_id: quote_id,
        gp: 0,
        gp_percent: 0
      };

    } catch (apiError) {
      logger.error(apiError.message, apiError)
      throw new ApiError('Could not copy quote option', apiError);
    }

  }
  async getCurrencies(): Promise<LasecCurrency[]> {
    return LasecDatabase.Read.LasecGetCurrencies(null, this.context);
  }
  sendQuoteEmail = async (quote_id: string, subject: string, message: string,
    to: Reactory.ToEmail[], cc: Reactory.ToEmail[], bcc: Reactory.ToEmail[],
    attachments: Reactory.EmailAttachment[], from: Lasec360User): Promise<Reactory.EmailSentResult> => {

    let result: Reactory.EmailSentResult = {
      message: `Email for quote ${quote_id} sent to`,
      success: true
    }

    const { user, getService } = this.context;

    const emailService: Reactory.Service.ICoreEmailService = getService('core.EmailService@1.0.0') as Reactory.Service.ICoreEmailService;

    try {
      const sent_result = await emailService.sendEmail({
        body: message,
        contentType: 'html',
        attachments,
        saveToSentItems: true,
        subject,
        userId: user.id,
        via: 'microsoft',
        to,
        cc,
        bcc,
      }).then();

      if (sent_result.success) {
        result.message = `${result.message} ${to.length} recipients`;
      }

    } catch (mailError) {
      logger.error(`Error occured while send the email ${mailError.message}`)
      return
    }

    return result;
  }
  getQuoteById = async (quote_id: string): Promise<LasecQuote> => {
    return await getLasecQuoteById(quote_id, this.context.partner, this.context).then();
  }
  getQuoteEmail = async (quote_id: string, email_type: string): Promise<Reactory.IEmailMessage> => {
    return await getCacheItem(`${email_type}::${quote_id}::${user._id}`, null, (24 * 60 * 60), this.context.partner).then() as Reactory.IEmailMessage;
  }
  setQuoteEmail = async (quote_id: string, email_type: string, message: Reactory.IEmailMessage): Promise<Reactory.IEmailMessage> => {
    return await setCacheItem(`${email_type}::${quote_id}::${user._id}`, message, (24 * 60 * 60), this.context.partner).then() as Reactory.IEmailMessage;
  }

  getSalesOrder = async (sales_order_id: string): Promise<LasecSalesOrder> => {
    try {
      logger.debug(`QuoteService.ts getSalesOrders ${sales_order_id} 🟠`);
      const sales_order_result = await LAPI.SalesOrders.item(sales_order_id, this.context).then();
      logger.debug(`QuoteService.ts getSalesOrders ${sales_order_id} 🟢`, sales_order_result);
      return sales_order_result;
    } catch (get_error) {
      logger.error(`QuoteService.ts getSalesOrders ${sales_order_id} 🔴`, get_error);
      throw get_error;
    }
  }
};

const service_definition: Reactory.IReactoryServiceDefinition = {
  id: 'lasec-crm.LasecQuoteService@1.0.0',
  name: 'Lasec Quote Service 💱',
  description: 'Service class for all quote related services.',
  dependencies: [],
  serviceType: 'Lasec.Quote.IQuoteService',
  service: (props: Reactory.IReactoryServiceProps, context: any) => {
    return new LasecQuoteService(props, context);
  }
};

export default service_definition;
