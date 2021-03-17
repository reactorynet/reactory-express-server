/**
 * Lasec CRM Sales Order Resolver.
 *
 * Contains most of the helpers, and functions for handling sales order related
 * data objects.
 *
 * Authors: W. Weber, D. Murphy
 */
import logger from "@reactory/server-core/logging";
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import LasecApi from '../api';
import ApiError from "exceptions";

import {

  getClientSalesOrders,
  getCRMSalesOrders,
  getISODetails,
  getLoggedIn360User,
  getPurchaseOrderDetails,
  getPurchaseOrders,
  getSODocuments,
  getSalesOrderComments,
  saveSalesOrderComment,
  getCustomerDocuments,
  deleteSalesOrderComment
} from "./Helpers";
import {
  IQuoteService,
  Lasec360Quote,
  Lasec360User, LasecCertificateOfConformance, LasecCertificateOfConformanceResponse, LasecClient, LasecCommercialInvcoice, LasecCommercialInvoiceResponse, LasecCreateSalesOrderInput, LasecCRMCustomer, LasecQuote, LasecSalesOrder, LasecSalesOrderCreateResponse, SimpleResponse
} from "../types/lasec";
import { execql } from "@reactory/server-core/graph/client";
import { getCacheItem, setCacheItem } from "../models";
import moment from "moment";
import { getProductById } from "./ProductResolver";
import { PagingRequest } from "@reactory/server-core/database/types";
import { Reactory } from "@reactory/server-core/types/reactory";
import { isNil } from "lodash";


const QUOTE_SERVICE_ID = 'lasec-crm.LasecQuoteService@1.0.0';

const SalesOrderResolver = {


  CRMSaleOrderComment: {
    // id: (parent: any) => {
    //   return parent._id ? parent._id.toString() : null;
    // }
    id: ({ id, _id }: any) => id || _id,
  },

  SalesOrder: {

    orderType: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {
      return `${salesOrder.orderType || 'none'}`.toUpperCase()
    },

    salesOrderNumber: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {
      return `${salesOrder.salesOrderNumber || salesOrder.iso}`.toUpperCase()
    },


    crmCustomer: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {

      try {
        logger.debug(`SalesOrderResolver.crmCustomer`, { salesOrder });

        if (isNil(salesOrder.quoteId) === true) return null;

        const query = `
          SELECT
            qt.customer_id as id,
            AC.Name as registeredName,
            AC.CustomerOnHold as customerStatus
          FROM Quote as qt
            INNER JOIN Customer as cust on qt.customer_id = cust.customerid
            LEFT JOIN ArCustomer AC on cust.company_id=AC.Customer
            WHERE qt.quoteid = '${salesOrder.quoteId}';
        `;

        let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
        let customerObject = sqlresult[0];

        logger.debug(`SalesOrderResolver.crmCustomer Results from mysql query`, sqlresult);
        if (customerObject === undefined || customerObject === null) return null;

        return {
          id: customerObject.id,
          registeredName: customerObject.registeredName || 'Place Holder Name',
          tradingName: customerObject.registeredName,
          customerStatus: `${customerObject.customerStatus}`.toUpperCase() === 'Y' ? 'on-hold' : 'not-on-hold'
        }
      } catch (crm_resolver_error) {
        logger.error(`Error getting customer for sales order`, crm_resolver_error)
      }
    },

    client: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {

      if (salesOrder.client && typeof salesOrder.client === 'string') return salesOrder.client;

      if (isNil(salesOrder.quoteId) === true) return 'No quote id';

      const query = `
          SELECT
            qt.customer_id as id,
            cust.first_name as firstName,
            cust.surname as lastName
          FROM Quote as qt
            INNER JOIN Customer as cust on qt.customer_id = cust.customerid
            WHERE qt.quoteid = '${salesOrder.quoteId}';
      `;

      let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
      let customerObject = sqlresult[0] || { firstName: 'NOT', lastName: 'FOUND' };

      return `${customerObject.firstName} ${customerObject.lastName} `
    },


    shipValue: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {

      if (salesOrder.shipValue && salesOrder.shipValue > 0) return salesOrder.shipValue;

      if (typeof salesOrder.poNumber === 'string' && isNil(salesOrder.poNumber) === false) {
        const query = `
              SELECT
                SalesOrderShippedValue as shipValue
              FROM SorMaster
              WHERE CustomerPoNumber = '${salesOrder.poNumber}';
        `;

        let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
        let resultObject = sqlresult[0] || { shipValue: 0 };

        salesOrder.shipValue = Math.floor((resultObject.shipValue || 0) * 100);

        return salesOrder.shipValue;
      }

      return 0;
    },

    reserveValue: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {

      if (salesOrder.reserveValue && salesOrder.reserveValue > 0) return salesOrder.reserveValue;

      if (typeof salesOrder.poNumber === 'string' && isNil(salesOrder.poNumber) === false) {
        const query = `
              SELECT
                SalesOrderReservedValue as reserveValue
              FROM SorMaster
              WHERE CustomerPoNumber = '${salesOrder.poNumber}';
      `;

        let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
        let resultObject = sqlresult[0] || { shipValue: 0 };

        salesOrder.reserveValue = Math.floor((resultObject.reserveValue || 0) * 100);

        return salesOrder.reserveValue;
      }

      return 0;
    },

    backorderValue: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext) => {

      if (salesOrder.backorderValue && salesOrder.backorderValue > 0) return salesOrder.backorderValue;


      if (typeof salesOrder.poNumber === 'string' && isNil(salesOrder.poNumber) === false) {
        const query = `
              SELECT
                SalesOrderBackOrderValue as backorderValue
              FROM SorMaster
              WHERE CustomerPoNumber = '${salesOrder.poNumber}';
      `;

        let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
        let resultObject = sqlresult[0] || { shipValue: 0 };

        salesOrder.backorderValue = Math.floor(((resultObject.backorderValue || 0) * 100));

        return salesOrder.backorderValue;
      }

      return 0;
    },

    details: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext, info: any) => {
      return getISODetails({ orderId: salesOrder.id, quoteId: salesOrder.quoteId }, context);
    },

    documents: async (sales_order: LasecSalesOrder, args: any, context: Reactory.IReactoryContext, info: any) => {

      try {
        return getCustomerDocuments({ ids: sales_order.documentIds, uploadContexts: [`lasec-crm::sales-order::document::${sales_order.quoteId}-${sales_order.id}`] }, context).then()
      } catch (exception) {
        logger.error('Could not get the document for the sales order', exception);
        throw exception;
      }
    },

    salesTeam: async (sales_order: LasecSalesOrder, args: any, context: Reactory.IReactoryContext, info: any) => {

      if (sales_order.salesTeam) return sales_order.salesTeam

      if (isNil(sales_order.quoteId) === true) return 'NO QUOTE ID';

      const query = `
          SELECT
            qt.sales_team_id as salesTeam
          FROM Quote as qt
            WHERE qt.quoteid = '${sales_order.quoteId}';
      `;

      let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
      if (sqlresult.length >= 1) {
        sales_order.salesTeam = sqlresult[0].salesTeam || 'NOT FOUND';
      }

      return sales_order.salesTeam;

    },

    deliveryAddress: async (salesOrder: LasecSalesOrder, args: any, context: Reactory.IReactoryContext, info: any) => {
      if (salesOrder.deliveryAddress && typeof salesOrder.deliveryAddress === 'string') return salesOrder.deliveryAddress;

      if (salesOrder.deliveryAddress && salesOrder.deliveryAddress.id) {
        const query = `
              SELECT
                formatted_address as deliveryAddress
              FROM Address
              WHERE addressid = ${salesOrder.deliveryAddress.id};
      `;

        let sqlresult: any = await mysql(query, 'mysql.lasec360', undefined, context).then()
        let resultObject = sqlresult[0] || { deliveryAddress: 'Not Found' };

        salesOrder.deliveryAddress = resultObject.deliveryAddress;

        return salesOrder.deliveryAddress;
      }

      return "No Address";
    }
  },
  SalesOrderLineItem: {

    product: async (lineItem: any, args: any) => {
      logger.debug(`Product for lineItem`, { lineItem, args });
      if (lineItem.productId) {

        return getProductById({ productId: lineItem.productId }, false);
      }
      return null;
    },

  },

  LasecSalesOrderCreateResponse: {
    salesOrder: async (response: LasecSalesOrderCreateResponse, args: any, context: Reactory.IReactoryContext) => {
      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
      if (response.success === true && response.salesOrder === null || response.salesOrder === undefined) return quoteService.getSalesOrder(response.iso_id);
      if (response.salesOrder) return response.salesOrder;
    }
  },
  Query: {
    LasecGetPagedCRMSalesOrders: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      try {
        return getCRMSalesOrders(args, context);
      } catch (err) {
        logger.error(`Error Fetching CRM SalesOrders`)
        throw new ApiError('Could not fetch sales order data', { error: err, displayInAppNotification: true });
      }

    },

    LasecGetISO: async (parent: any, params: { sales_order_id: string }, context: any, info: any): Promise<any> => {
      const {
        sales_order_id
      } = params;

      try {
        const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
        const sales_order = await quoteService.getSalesOrder(sales_order_id).then();

        return sales_order;

      } catch (sales_order_fetch_error) {
        logger.error(`Error getting sales order details`, sales_order_fetch_error);
        throw new ApiError('Could not load the sales order, if this problem persists, contact your administrator')
      }

    },

    LasecGetCRMPurchaseOrders: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getPurchaseOrders(args, context);
    },

    LasecGetCRMPurchaseOrderDetail: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getPurchaseOrderDetails(args, context)
    },

    LasecGetCRMClientSalesOrders: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getClientSalesOrders(args, context);
    },

    LasecGetSaleOrderDocument: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getSODocuments(args, context);
    },
    LasecGetISODetail: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getISODetails(args, context);
    },
    LasecGetSaleOrderComments: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return {
        orderId: args.orderId,
        comments: await getSalesOrderComments(args, context).then()
      }
    },
    LasecGetPreparedSalesOrder: async (parent: any, params: { quote_id: string, active_option: string }, context: Reactory.IReactoryContext): Promise<any> => {

      try {

        const {
          quote_id,
          active_option
        } = params;

        let quote: LasecQuote = null;
        let customer: LasecCRMCustomer = null;
        let client: LasecClient = null;
        let lasec_user: Lasec360User = null;

        let cache_key = `${quote_id}-${active_option || 'default'}-SALESORDER`;

        let prepared_sales_order: any = await getCacheItem(cache_key, null, 60, context.partner).then()

        if (prepared_sales_order === null || prepared_sales_order === undefined) {

          try {
            lasec_user = await getLoggedIn360User(false, context).then();
          } catch (loggedInUserError) {
            logger.error(`Error Getting the logged in user details ${loggedInUserError.message}`);
            throw new ApiError(`Could not get the logged in user.`);
          }


          try {
            const quote_detail: { errors: any[], data: any } = await execql(`query LasecGetQuoteById($quote_id: String!, $option_id: String, $item_paging: PagingRequest){
              LasecGetQuoteById(quote_id: $quote_id, option_id: $option_id, item_paging: $item_paging){
                  id
                  meta
                  customer {
                    firstName
                    lastName
                  }
                  company {
                    id
                    name
                  }
                  totals {
                    GP
                    totalVATInclusive
                    totalVATExclusive
                }
              }
            }`, {
              quote_id,
              option_id: active_option
            }, {}, context.user, context.partner).then();

            if (quote_detail.data) {
              if (quote_detail.data && quote_detail.data.LasecGetQuoteById) {
                quote = quote_detail.data.LasecGetQuoteById;
              }
            }

          } catch (quoteFetchError) {
            logger.error(`Error getting the quote details ${quoteFetchError.message}`);
          }

          const lasec_quote: Lasec360Quote = quote.meta.source;

          try {
            const customer_query: { errors: any[], data: { LasecGetClientDetail: LasecClient } } = await execql(`query LasecGetClientDetail($id: String!){
              LasecGetClientDetail(id: $id){
                id
                clientStatus
                fullName
                firstName
                lastName
                salesTeam
                customer {
                  id
                  registeredName
                  tradingName
                  deliveryAddress
                  deliveryAddressId
                  taxNumber
                  importVATNumber
                  creditLimit
                  currentBalance
                }
              }
            }`, { id: lasec_quote.customer_id }, {}, context.user, context.partner).then();
            client = customer_query.data.LasecGetClientDetail;
            customer = client.customer;
            logger.debug(`LasecGetCompanyDetailsforQuote(id: $id)`, customer);
          } catch (customerLoadError) {
            logger.debug(`LasecGetCompanyDetailsforQuote(id: $id) ${customerLoadError.message}`, customerLoadError);
            throw new ApiError('Could load Company details for quote')
          }

          prepared_sales_order = {
            id: `${cache_key}`,
            quote_id,
            sales_order_date: new Date().toISOString(),
            customer_name: lasec_quote.customer_full_name || "No Customer Found",
            company_name: lasec_quote.company_trading_name || "No Company Name",
            company_id: lasec_quote.company_id,
            rep_code: client.salesTeam,
            order_type: lasec_quote.quote_type,
            vat_number: customer.taxNumber,
            quoted_amount: lasec_quote.grand_total_excl_vat_cents,
            delivery_address_id: customer.deliveryAddressId,
            delivery_address: customer.deliveryAddress,
            preferred_warehouse: '10',
            method_of_contact: 'call',
            shipping_date: moment().add(14, 'days').toISOString()
          }

          setCacheItem(cache_key, prepared_sales_order, 60, context.partner);
        };

        return prepared_sales_order;
      } catch (error) {
        logger.error(`Unhandled exception ${error.message}`);
        throw new ApiError(`Unhandled Error Processing Sales Order Prep ${error.message}`);
      }
    },
    LasecIncoTerms: async (parent: any, args: any, context: Reactory.IReactoryContext): Promise<any> => {
      try {
        return (context.getService(QUOTE_SERVICE_ID) as IQuoteService).getIncoTerms();
      } catch (inco_terms_error) {
        logger.error(`Could not get the inco terms: ${inco_terms_error.message}`, inco_terms_error)
        return [];
      }
    },
    LasecCheckPurchaseOrderExists: async (parent: any, params: { company_id: string, purchase_order_number: string }, context: Reactory.IReactoryContext): Promise<any> => {
      try {
        logger.debug('SalesOrderResolver.ts => LasecCheckPurchaseOrderExists ');
        const check_result = await LasecApi.SalesOrders.checkPONumberExists(params.company_id, params.purchase_order_number, context).then();
        logger.debug('SalesOrderResolver.ts => LasecCheckPurchaseOrderExists => check_result ', check_result);
        return check_result;
      } catch (purchaseOrderError) {
        logger.error('SalesOrderResolver.ts => LasecCheckPurchaseOrderExists => Errored ', purchaseOrderError);
        throw purchaseOrderError;
      }
    },
    /***
     * Get Create Certificate of Conformance for Sales Order
     */
    LasecCertificateOfConformanceForSalesOrder: async (parent: any, params: { sales_order_id: string }, context: Reactory.IReactoryContext): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecCertificateOfConformanceForSalesOrder`);
        const certificate = await LasecApi.SalesOrders.get_certificate_of_conformance(params.sales_order_id, context).then()
        logger.debug(`Returning sales order certificate ${certificate.id}`);

        return certificate;

      } catch (err) {
        logger.error(`Error while gettting certificate of conformance for sales order`, { error: err });
        return null;
      }
    },

    LasecCommercialInvoiceForSalesOrder: async (parent: any, params: { sales_order_id: string }, context: Reactory.IReactoryContext): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecCertificateOfConformanceForSalesOrder`);
        const commercial_invoice = await LasecApi.SalesOrders.get_commercial_invoice(params.sales_order_id, context).then()
        logger.debug(`Commercial invoice for for sales order`, commercial_invoice);
        return commercial_invoice
      } catch (err) {
        logger.error(`Error while gettting certificate of commercial invoice for sales order`, { error: err });
        return null;
      }
    },

    LasecPackingListForSalesOrder: async (parent: any, params: { sales_order_id: string }, context: Reactory.IReactoryContext): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecPackingListForSalesOrder`);
        const packing_list = await LasecApi.SalesOrders.get_packing_list(params.sales_order_id, context).then()
        logger.debug(`Packing list for sales order`, packing_list);

        return packing_list;
      } catch (err) {
        logger.error(`Error while getting packing list for sales order`);
        return null;
      }
    },

    LasecGetSalesOrderDocuments: async (parent: any, params: { sales_order_id: string, paging: PagingRequest }, context: Reactory.IReactoryContext) => {

      try {
        const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
        const sales_order = await quoteService.getSalesOrder(params.sales_order_id).then();

        let document_context = `lasec-crm::sales-order::document-${sales_order.quoteId}-${sales_order.id.padStart(15, '0')}`
        return getCustomerDocuments({ ids: sales_order.documentIds, uploadContexts: [document_context], paging: params.paging }, context);

      } catch (exception) {
        logger.error('Could not get the document for the sales order', exception);
        throw exception;
      }

    }
  },
  Mutation: {
    LasecCreateSalesOrder: async (parent: any, params: { sales_order_input: LasecCreateSalesOrderInput }, context: Reactory.IReactoryContext): Promise<LasecSalesOrderCreateResponse> => {

      const { sales_order_input } = params;
      logger.debug(`Sales Order Resolver ${sales_order_input.customer_name}`, sales_order_input);

      let createResult: LasecSalesOrderCreateResponse = {
        iso_id: null,
        message: null,
        salesOrder: null,
        success: false,
      };

      const check_result = await LasecApi.SalesOrders.checkPONumberExists(params.sales_order_input.company_id, params.sales_order_input.purchase_order_number, context).then();

      if (check_result.exists) {
        createResult.iso_id = params.sales_order_input.purchase_order_number;
        createResult.message = `Purchase order number ${params.sales_order_input.purchase_order_number} for already exists`;
        createResult.success = false;

        return createResult;
      }

      const quoteService: IQuoteService = context.getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
      createResult = await quoteService.createSalesOrder(params.sales_order_input).then();

      return createResult;
    },

    /***
     * Create Certificate of Conformance
     */
    LasecCreateCertificateOfConformance: async (parent: any, params: { sales_order_id: string, certificate: LasecCertificateOfConformance }, context: Reactory.IReactoryContext, info: any): Promise<LasecCertificateOfConformanceResponse> => {

      const response: LasecCertificateOfConformanceResponse = {
        success: true,
        message: '',
        certificate: params.certificate
      }

      try {
        logger.debug("Creating certificate of conformance", { params });
        const result = await LasecApi.SalesOrders.post_certificate_of_conformance(params.sales_order_id, params.certificate, context).then();

        if (result.pdf_url === null || result.pdf_url === undefined || result.pdf_url === "") {
          response.message = 'No url / pdf document available for this document.'
          response.certificate.pdf_url = 'about:blank';
          response.success = false;
          response.certificate.id = result.id || `CERTIFICATE_OF_CONFORMANCE-${params.sales_order_id}`
        } else {
          response.certificate.pdf_url = result.pdf_url;
          response.message = `New Certificate of Conformance Created at ${result.pdf_url}`
        }
        return response;

      } catch (error) {
        return {
          success: false,
          message: `Could not create the certificate LASEC API ERROR: ${error.message}`,
          certificate: params.certificate
        }
      }
    },

    /***
     * Update a certificate of conformance
     */
    LasecUpdateCertificateOfConformance: async (parent: any, params: { sales_order_id: string, certificate: LasecCertificateOfConformance }, context: any, info: any): Promise<LasecCertificateOfConformanceResponse> => {

      const response: LasecCertificateOfConformanceResponse = {
        success: true,
        message: '',
        certificate: { ...params.certificate }
      }


      try {
        logger.debug("Updating certificate of conformance", { params });
        const result = await LasecApi.SalesOrders.put_certificate_of_conformance(params.sales_order_id, params.certificate).then();
        return {
          success: true,
          message: 'Certificate of conformance created',
          certificate: {
            ...params.certificate,
            pdf_url: result.payload
          }
        }

      } catch (error) {

        return {
          success: false,
          message: error.message,
          certificate: params.certificate
        }
      }

    },

    /***
     *
     */
    LasecCreateCommercialInvoice: async (parent: any, params: { sales_order_id: string, invoice: LasecCommercialInvcoice }, context: Reactory.IReactoryContext): Promise<LasecCommercialInvoiceResponse> => {

      try {

        const result = await LasecApi.SalesOrders.post_commercial_invoice(params.sales_order_id, params.invoice, context).then();

        if (result.error) {
          return {
            success: false,
            message: `Could not create the commercial invoice [${result.error.message}]`,
            commercial_invoice: { ...params.invoice }
          }
        }

        return {
          success: true,
          message: 'Certificate of conformance created',
          commercial_invoice: {
            ...params.invoice,
            pdf_url: result.pdf_url
          }
        }

      } catch (error) {
        logger.error('Error occured while creating the Commercial Invoice')
        return {
          success: false,
          message: error.message,
          commercial_invoice: params.invoice
        }
      }
    },

    /***
     *
     */
    LasecUpdateCommercialInvoice: async (parent: any, params: { sales_order_id: string, invoice: any }, context: Reactory.IReactoryContext): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.put_commercial_invoice(params.sales_order_id, params.invoice, context).then();
        return {
          success: true,
          message: 'Certificate of conformance updated',
          certificate: {
            ...params.invoice,
            pdf_url: result.payload
          }
        }

      } catch (error) {

        return {
          success: false,
          message: error.message,
          invoice: params.invoice
        }
      }

    },

    /**
     *
     */
    LasecCreatePackingList: async (parent: any, params: { sales_order_id: string, packing_list: any }, context: Reactory.IReactoryContext): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.post_packing_list(params.sales_order_id, params.packing_list, context).then();
        return {
          success: true,
          message: result.pdf_url === null || result.pdf_url === undefined ? "No valid pdf url returned from Lasec API" : 'Certificate of conformance created',
          packing_list: {
            ...params.packing_list,
            pdf_url: result.pdf_url || "about:blank"
          }
        }

      } catch (error) {

        return {
          success: false,
          message: error.message,
          packing_list: params.packing_list
        }
      }

    },

    /***
     *
     */
    LasecUpdatePackingList: async (parent: any, params: { sales_order_id: string, packing_list: any }, context: Reactory.IReactoryContext): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.put_packing_list(params.sales_order_id, params.packing_list, context).then();
        return {
          success: true,
          message: 'Certificate of conformance created',
          certificate: {
            ...params.packing_list,
            pdf_url: result.payload
          }
        }

      } catch (error) {

        return {
          success: false,
          message: error.message,
          invoice: params.packing_list
        }
      }

    },
    /***
     * Adds a comment to a Sales Order Document
     */
    LasecAddSaleOrderComment: async (parent: any, params: { orderId: string, comment: string }, context: Reactory.IReactoryContext) => {
      logger.debug('🟠 LasecAddSaleOrderComment', { ...params });
      return saveSalesOrderComment(params, context);
    },

    LasecDeleteSalesOrderComment: async (parent: any, params: { orderId: string, comment: string }, context: Reactory.IReactoryContext) => {
      logger.debug('🟠 LasecDeleteSaleOrderComment', { ...params });
      return deleteSalesOrderComment(params, context);
    },

    LasecAddSalesOrderDocument: async (parent: any, params: { file: any, sales_order_id: string }, context: Reactory.IReactoryContext) => {

      try {
        const fileService: Reactory.Service.IReactoryFileService = context.getService('core.ReactoryFileService@1.0.0') as Reactory.Service.IReactoryFileService;
        logger.debug(`Uploading File using Reactory File Service`, { filename: params.file.filename });
        let uploadResult = await fileService.uploadFile({ file: params.file, uploadContext: `lasec-crm::sales-order::${params.sales_order_id}` }).then();

        return uploadResult

      } catch (addDocumentError) {
        throw addDocumentError;
      }

    }
  }
};

export default SalesOrderResolver
