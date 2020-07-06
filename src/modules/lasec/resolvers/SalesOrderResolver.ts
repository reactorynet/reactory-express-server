import { ObjectID, ObjectId } from "mongodb";
import logger from "@reactory/server-core/logging";
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import LasecApi from '../api';

const SalesOrderResolver = {

  SalesOrder: {

    crmCustomer: async ( salesOrder: any) => {
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
      
      if(customerObject === undefined || customerObject === null) return null;

      
      return {
        id: customerObject.id,
        registeredName: customerObject.registeredName  || 'Place Holder Name', 
        customerStatus: `${customerObject.customerStatus}`.toUpperCase() === 'Y' ? 'on-hold' : 'not-on-hold'
      }
    }
  },
  Query: {

  },
  Mutation: {

  }
};

export default SalesOrderResolver