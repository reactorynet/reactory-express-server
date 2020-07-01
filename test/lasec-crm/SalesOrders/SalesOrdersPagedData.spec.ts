import chai, { assert } from 'chai';
import env from '../../env';
const moment = require('moment');
//do not use import with BTOA as it does not exports the default function
const btoa = require('btoa');


const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN
} = env;

import { apiStatusQuery } from '../../core/queries';

import logger from '../../logger';
import { Context } from 'mocha';
import ApiError from '../../../src/exceptions';
import { isArray } from 'lodash';

const request = require('supertest')(API_URI_ROOT);

const ttcBadge = (ttc: number) => {
  let ttcBadge = '🎖'
  if(ttc < 2000) {
    ttcBadge = '🥉'
  }

  if(ttc < 1000) {
    ttcBadge = '🥈'
  }

  if(ttc < 500) {
    ttcBadge = '🥇'
  }

  if(ttc < 200) {
    ttcBadge = '🏆'
  }

  if(ttc < 150) {
    ttcBadge = '🏆🏆'
  }

  return ttcBadge;
}

describe('Lasec CRM Sales Orders', () => {  
  let logged_in_user: any = null;  
  const started = moment.utc();
  before(`Should log in the user and set our auth token`, (done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err: Error, res: any) => {
        const ttc = moment.utc().diff(started, 'millisecond')
        if(err) done (err);
        else {        
          logged_in_user = res.body.user;
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${logged_in_user.token}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err: Error, res: any) => {        
              if(err) done(err);                    
              else {                
                logged_in_user = {...logged_in_user, ...res.body.data.apiStatus, logged_in_at: moment.utc()}
                logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): User ${logged_in_user.firstName} ${logged_in_user.lastName} logged into ${logged_in_user.applicationName}  ` );
                done();
              }
            });                             
        }
      });
  });


  it(`Should return a list of sales orders for lasec user account ${REACTORY_TEST_USER}`, async function () {

    const self: Context = this;
    self.timeout(20000);
    
    let pagedQuery = `query LasecGetPagedCRMSalesOrders(
      $search: String!,
      $paging: PagingRequest,
      $filterBy: String,
      $filter: String
      $orderStatus: String
      $periodStart: String,
      $periodEnd: String,
      $dateFilter: String,
    ){
      LasecGetPagedCRMSalesOrders(
        search: $search,
        paging: $paging,
        filterBy: $filterBy,
        filter: $filter,
        orderStatus: $orderStatus,
        periodStart: $periodStart,
        periodEnd: $periodEnd,
        dateFilter: $dateFilter,
      ){
        paging {
          total
          page
          hasNext
          pageSize
        }
        salesOrders {
          id
          orderType
          orderStatus
          salesOrderNumber
          orderDate
          shippingDate
          quoteDate
          orderType
          orderStatus
          iso
          customer
          crmCustomer {
            id
            registeredName
            customerStatus
          }
          client          
          poNumber
          value
          reserveValue
          quoteId
          currency
          deliveryAddress
          warehouseNote
          deliveryNote
          salesTeam
          shipValue
          backorderValue
        }
      }
    }`;
    const started = moment.utc();
    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send( { 
        query: pagedQuery, variables: {  paging: { page: 1, pageSize: 10 },
        search: "",
        filterBy: "any_field",
        orderStatus: "1",
      } })
      .expect(200)
      .end((err: Error, res: any) => {        
        const ttc = moment.utc().diff(started, 'millisecond')
        if(err) {          
          logger.error(`Error executing graphql query`, { err, body: res.body });          
          throw err;
        } 
        else {
          if(res.body && res.body) {
            const { data, errors } = res.body;
            const { LasecGetPagedCRMSalesOrders } = data;

            if(errors && errors.length) {
              throw new ApiError(`The response has errors`, errors);
            }            
            
            assert.exists(LasecGetPagedCRMSalesOrders, 'LasecGetPagedCRMSalesOrders does not exist');
            assert.exists(LasecGetPagedCRMSalesOrders.paging && LasecGetPagedCRMSalesOrders.paging.total, 'LasecGetPagedCRMSalesOrders does not have paging information');
            assert.exists(LasecGetPagedCRMSalesOrders.paging && LasecGetPagedCRMSalesOrders.salesOrders && isArray(LasecGetPagedCRMSalesOrders.salesOrders) === true, 'LasecGetPagedCRMSalesOrders does not have salesOrders information');
                        
            logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Found (${LasecGetPagedCRMSalesOrders.salesOrders.length}) SALES ORDERS  ` );                        
            
          } else {
            throw new Error('No Data Element on Response');
          }                    
        }                
      });
  });      

  after('Loggin out user', (done) => {
    done()
  });

});