import { ObjectID, ObjectId } from "mongodb";
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

} from "./Helpers";
import { IQuoteService, Lasec360User, LasecClient, LasecCreateSalesOrderInput, LasecCRMCustomer, LasecQuote, LasecSalesOrder, SimpleResponse } from "../types/lasec";
import { execql } from "@reactory/server-core/graph/client";
import { LasecCompany } from "../constants";
import { getCacheItem, setCacheItem } from "../models";
import moment from "moment";

const SalesOrderResolver = {

  SalesOrder: {

    crmCustomer: async (salesOrder: any) => {

      try {
        logger.debug(`SalesOrderResolver.crmCustomer`, { salesOrder });

        const query = `      
          SELECT 
            qt.customer_id as id, 
            AC.Name as registeredName,
            AC.CustomerOnHold as customerStatus
          FROM Quote as qt
            INNER JOIN Customer as cust on qt.customer_id = cust.customerid
            LEFT JOIN ArCustomer AC on cust.company_id=AC.Customer
            WHERE qt.quoteid = '${salesOrder.quoteId}';`;

        let sqlresult: any = await mysql(query, 'mysql.lasec360').then()
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

    details: async (salesOrder: LasecSalesOrder, context: any, info: any) => {      
      return getISODetails({ orderId: salesOrder.id, quoteId: salesOrder.quoteId });
    }
  },
  Query: {
    LasecGetPagedCRMSalesOrders: async (obj, args) => {
      try {
        return getCRMSalesOrders(args);
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
        const quoteService: IQuoteService = getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
        const sales_order = await quoteService.getSalesOrder(sales_order_id).then();

        return sales_order;

      } catch (sales_order_fetch_error) {
        logger.error(`Error getting sales order details`, sales_order_fetch_error);

        throw new ApiError('Could not load the sales order, if this problem persists, contact your administrator')
      }

    },

    LasecGetCRMPurchaseOrders: async (obj, args) => {
      return getPurchaseOrders(args);
    },

    LasecGetCRMPurchaseOrderDetail: async (obj, args) => {
      return getPurchaseOrderDetails(args)
    },

    LasecGetCRMClientSalesOrders: async (obj, args) => {
      return getClientSalesOrders(args);
    },

    LasecGetSaleOrderDocument: async (obj, args) => {
      return getSODocuments(args);
    },
    LasecGetISODetail: async (obj, args) => {
      return getISODetails(args);
    },


    LasecGetPreparedSalesOrder: async (parent: any, params: { quote_id: string, active_option: string }): Promise<any> => {

      try {

        const {
          quote_id,
          active_option
        } = params;

        let quote: LasecQuote = null;
        let customer: LasecCRMCustomer = null;
        let client: LasecClient = null;
        let lasec_user: Lasec360User = null;

        let cache_key = `${quote_id}-${active_option}-SALESORDER`;

        let prepared_sales_order: any = await getCacheItem(cache_key).then()

        if (prepared_sales_order === null || prepared_sales_order === undefined) {

          try {
            lasec_user = await getLoggedIn360User().then();
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
            }).then();

            if (quote_detail.data) {
              if (quote_detail.data && quote_detail.data.LasecGetQuoteById) {
                quote = quote_detail.data.LasecGetQuoteById;
              }
            }

          } catch (quoteFetchError) {
            logger.error(`Error getting the quote details ${quoteFetchError.message}`);
          }

          const lasec_quote = quote.meta.source;

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
            }`, { id: lasec_quote.customer_id }).then();
            client = customer_query.data.LasecGetClientDetail;
            customer = client.customer;
            logger.debug(`LasecGetCompanyDetailsforQuote(id: $id)`, customer);
          } catch (customerLoadError) {
            logger.debug(`LasecGetCompanyDetailsforQuote(id: $id) ${customerLoadError.message}`, customerLoadError);
            throw new ApiError('Could load Company details for quote')
          }

          prepared_sales_order = {
            id: `${quote_id}-SALESORDER`,
            quote_id,
            sales_order_date: new Date().toISOString(),
            customer_name: lasec_quote.customer_full_name || "No Customer Found",
            company_name: lasec_quote.company_trading_name || "No Company Name",
            company_id: lasec_quote.company_id,
            rep_code: client.salesTeam,
            order_type: 'normal',
            vat_number: customer.taxNumber,
            quoted_amount: lasec_quote.grand_total_excl_vat_cents,
            delivery_address_id: customer.deliveryAddressId,
            delivery_address: customer.deliveryAddress,
            preferred_warehouse: '10',
            method_of_contact: 'call',
            shipping_date: moment().add(14, 'days').toISOString()
          }

          setCacheItem(cache_key, prepared_sales_order, 60);
        };

        return prepared_sales_order;
      } catch (error) {
        logger.error(`Unhandled exception ${error.message}`);
        throw new ApiError(`Unhandled Error Processing Sales Order Prep ${error.message}`);
      }
    },
    LasecGetIncoTermsForSalesOrder: async (parent: any, params: { sales_order_id: string }): Promise<any> => {
      try {

      } catch (inco_terms_error) {

      }
    },
    LasecCheckPurchaseOrderExists: async (parent: any, params: { company_id: string, purchase_order_number: string }): Promise<any> => {
      try {
        logger.debug('SalesOrderResolver.ts => LasecCheckPurchaseOrderExists ');
        const check_result = await LasecApi.SalesOrders.checkPONumberExists(params.company_id, params.purchase_order_number).then();
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
    LasecCertificateOfConformanceForSalesOrder: async (parent: any, params: { sales_order_id: string }): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecCertificateOfConformanceForSalesOrder`);
        const certificate = await LasecApi.SalesOrders.get_certificate_of_conformance(params.sales_order_id).then()
        logger.debug(`Returning sales order certificate`, certificate);

        return certificate;

      } catch (err) {
        logger.error(`Error while gettting certificate of conformance for sales order`, { error: err });
        return null;
      }
    },

    LasecCommercialInvoiceForSalesOrder: async (parent: any, params: { sales_order_id: string }): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecCertificateOfConformanceForSalesOrder`);
        const certificate = await LasecApi.SalesOrders.get_commercial_invoice(params.sales_order_id).then()
        logger.debug(`Error while gettting certificate of conformance for sales order`);

        return certificate
      } catch (err) {
        logger.error(`Error while gettting certificate of conformance for sales order`, { error: err });
        return null;
      }
    },

    LasecPackingListForSalesOrder: async (parent: any, params: { sales_order_id: string }): Promise<any> => {
      try {
        logger.debug(`SalesOrderResovler.ts => LasecCertificateOfConformanceForSalesOrder`);
        const certificate = await LasecApi.SalesOrders.get_packing_list(params.sales_order_id).then()
        logger.debug(`Error while gettting certificate of conformance for sales order`);

        return certificate.payload;
      } catch (err) {
        logger.error(`Error while gettting certificate of conformance for sales order`);
        return null;
      }
    }
  },
  Mutation: {
    LasecCreateSalesOrder: async (parent: any, params: { sales_order_input: LasecCreateSalesOrderInput }): Promise<SimpleResponse> => {

      const { sales_order_input } = params;
      logger.debug(`Sales Order Resolver ${sales_order_input.customer_name}`, sales_order_input);

      const quoteService: IQuoteService = getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
      const createResult = await quoteService.createSalesOrder(params.sales_order_input).then();

      return createResult;
    },
    /***
     * Create Certificate of Conformance 
     */
    LasecCreateCertificateOfConformance: async (parent: any, params: { sales_order_id: string, certificate: any }, context: any, info: any): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.post_certificate_of_conformance(params.sales_order_id, params.certificate).then();
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

    LasecUpdateCertificateOfConformance: async (parent: any, params: { sales_order_id: string, certificate: any }, context: any, info: any): Promise<any> => {

      try {

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

    LasecCreateCommericalInvoice: async (parent: any, params: { sales_order_id: string, invoice: any }): Promise<any> => {

      try {

        const result = await LasecApi.SalesOrders.post_commercial_invoice(params.sales_order_id, params.invoice).then();
        return {
          success: true,
          message: 'Certificate of conformance created',
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

    LasecUpdateCommericalInvoice: async (parent: any, params: { sales_order_id: string, invoice: any }): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.put_commercial_invoice(params.sales_order_id, params.invoice).then();
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

    LasecCreatePackingList: async (parent: any, params: { sales_order_id: string, packing_list: any }): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.post_packing_list(params.sales_order_id, params.packing_list).then();
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

    LasecUpdatePackingList: async (parent: any, params: { sales_order_id: string, packing_list: any }): Promise<any> => {
      try {

        const result = await LasecApi.SalesOrders.put_packing_list(params.sales_order_id, params.packing_list).then();
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

    }
  }
};

export default SalesOrderResolver