import chai from 'chai';
import env from '../../env';
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

const request = require('supertest')(API_URI_ROOT);

describe('Lasec CRM Sales Orders', () => {  
  let logged_in_user: any = null;  

  before((done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err: Error, res: any) => {
        if(err) done (err);
        else {        
          logged_in_user = res.body.user;
          request.post('api')
          .set('Accept', 'application/json')
          .set('x-client-key', REACTORY_CLIENT_KEY)
          .set('x-client-pwd', REACTORY_CLIENT_PWD)
          .set('Authorization', `Bearer ${res.body.user.token}`)
          .send({ query: apiStatusQuery })
            .expect(200)
            .end((err: Error, res: any) => {        
              if(err) done(err);                    
              else {
                logged_in_user = {...logged_in_user, ...res.body.data.status}
                done();
              }
            });                             
        }
      });
  });


  it(`Should return a list of sales orders ${REACTORY_TEST_USER}`, (done) => {

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
          client
          crmClient {
            id
            registeredName
            customerStatus 
          }
          poNumber
          value,
          reserveValue
          quoteId,
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
        if(err) {
          logger.error(err);
          done(err);
        } 
        else {
          if(res.body && res.body.data) {
            const { LasecLoggedInUser } = res.body.data;
            logger.debug(`${JSON.stringify(res.body.data)}`);
            
            if(LasecLoggedInUser) {

            }

            done();
          } else {
            done(new Error('No Data Element on Response'));
          }
          
          
        }                
      });
  });      

  after('Loggin out user', (done) => {
    done()
  });

});