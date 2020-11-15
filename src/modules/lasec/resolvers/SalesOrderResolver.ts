import { ObjectID, ObjectId } from "mongodb";
import logger from "@reactory/server-core/logging";
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import LasecApi from '../api';
import ApiError from "exceptions";
import { getCRMSalesOrders, getLasecQuoteById, getLoggedIn360User } from "./Helpers";
import { IQuoteService, Lasec360User, LasecClient, LasecCreateSalesOrderInput, LasecQuote, SimpleResponse } from "../types/lasec";
import { execql } from "@reactory/server-core/graph/client";
import { LasecCompany } from "../constants";

const SalesOrderResolver = {

  SalesOrder: {

    crmCustomer: async (salesOrder: any) => {
      logger.debug(`SalesOrderResolver.crmCustomer`, { salesOrder })

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

      let sqlresult = await mysql(query, 'mysql.lasec360').then()
      let customerObject = sqlresult[0];
      logger.debug(`SalesOrderResolver.crmCustomer Results from mysql query`, sqlresult)

      if (customerObject === undefined || customerObject === null) return null;


      return {
        id: customerObject.id,
        registeredName: customerObject.registeredName || 'Place Holder Name',
        customerStatus: `${customerObject.customerStatus}`.toUpperCase() === 'Y' ? 'on-hold' : 'not-on-hold'
      }
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
    LasecGetPreparedSalesOrder: async (parent: any, params: { quote_id: string, active_option: string }): Promise<any> => {



      try {

        let quote: LasecQuote = null;
        let customer: any = null;
        let lasec_user: Lasec360User = null;

        const {
          quote_id,
          active_option
        } = params;

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
          const customer_query: { errors: any[], data: { LasecGetCompanyDetailsforQuote: LasecClient } } = await execql(`query LasecGetCompanyDetailsforQuote($id: String!){
            LasecGetCompanyDetailsforQuote(id: $id){
              id
              registeredName
              tradingName
              deliveryAddress
              taxNumber
              importVATNumber
              creditLimit
              currentBalance
            }
          }`, { id: quote.company.id }).then();

          customer = customer_query.data.LasecGetCompanyDetailsforQuote;
        } catch (customerLoadError) {
          logger.debug(`LasecGetCompanyDetailsforQuote(id: $id) ${customerLoadError.message}`, customerLoadError);
          throw new ApiError('Could load Company details for quote')
        }

        return {
          id: `${quote_id}-SALESORDER`,
          quote_id,
          sales_order_date: new Date().toISOString(),
          customer_name: lasec_quote.customer_full_name || "No Customer Found",
          company_name: lasec_quote.company_trading_name || "No Company Name",
          company_id: lasec_quote.company_id,
          rep_code: user.repId,
          order_type: 'normal',
          vat_number: customer.taxNumber,
          quoted_amount: lasec_quote.grand_total_excl_vat_cents,
          delivery_address: customer.deliveryAddress,
        }
      } catch (error) {
        logger.error(`Unhandled exception ${error.message}`);
        throw new ApiError(`Unhandled Error Processing Sales Order Prep ${error.message}`);
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
  },
  Mutation: {
    LasecCreateSalesOrder: async (parent: any, params: { sales_order_input: LasecCreateSalesOrderInput }): Promise<SimpleResponse> => {
      
      const { sales_order_input } = params;
      logger.debug(`Sales Order Resolver ${sales_order_input.customer_name}`, sales_order_input);

      const quoteService: IQuoteService = getService('lasec-crm.LasecQuoteService@1.0.0') as IQuoteService;
      const createResult = await quoteService.createSalesOrder(params.sales_order_input).then();

      return createResult;
    }
  }
};

export default SalesOrderResolver