import env from '../env';
import { assert } from 'chai';

import { apiStatusQuery } from 'test/core/queries';
import logger from 'test/logger';
import { Context } from 'mocha';
import ApiError from '../../src/exceptions';
import { isArray } from 'lodash';
import { ttcBadge } from 'test/shared/utils';
import {
  LasecValidateCustomerEmailAddressQuery,
  LasecValidateCustomerEmailAddressVariables,
  LasecCreateNewClientMutation,
  LasecGetNewClientQuery,
} from './queries';


const moment = require('moment');
//do not use import with BTOA as it does not export the default function
const btoa = require('btoa');
const {
  API_URI_ROOT,
  REACTORY_CLIENT_KEY,
  REACTORY_CLIENT_PWD,
  REACTORY_TEST_USER,
  REACTORY_TEST_USER_PWD,
  REACTORY_ANON_TOKEN,
  REACTORY_CLIENT_URL,
} = env;

const request = require('supertest')(API_URI_ROOT);

describe('Lasec CRM Client', () => {

  let logged_in_user: any = null;
  let new_client_object: any = null;
  let titles: any[] = [];


  before(`Should log in the user and set our auth token`, (done) => {
    let token = btoa(`${REACTORY_TEST_USER}:${REACTORY_TEST_USER_PWD}`);
    const started = moment.utc();
    request.post('login')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Basic ${token}`)
      .send()
      .expect(200)
      .end((err: Error, res: any) => {
        const ttc = moment.utc().diff(started, 'millisecond')
        if (err) done(err);
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
              if (err) done(err);
              else {
                logged_in_user = { ...logged_in_user, ...res.body.data.apiStatus, logged_in_at: moment.utc() }
                logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): User ${logged_in_user.firstName} ${logged_in_user.lastName} logged into ${logged_in_user.applicationName}  `);
                done();
              }
            });
        }
      });
  });

  it('Should return a list of available titles per the LASEC API', async function () {



  });


  it('Should query for a user by email nonexisting@mail.com.', async function () {
    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();
    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send({ query: LasecValidateCustomerEmailAddressQuery, variables: LasecValidateCustomerEmailAddressVariables(`nonexisting@mail.com`) })
      .expect(200)
      .end((err: Error, res: any) => {

        const ttc = moment.utc().diff(started, 'millisecond')
        if (err) {
          logger.error(`Error executing graphql query`, { err, body: res.body });
          throw err;
        }
        else {
          if (res.body && res.body) {
            const { data, errors } = res.body;
            const { LasecGetClientList } = data;

            if (errors && errors.length) {
              throw new ApiError(`The response has errors`, errors);
            }

            assert.exists(LasecGetClientList, 'LasecGetClientList does not exist');
            assert.exists(LasecGetClientList.paging && LasecGetClientList.paging.total, 'LasecGetClientList does not have paging information');
            assert.exists(LasecGetClientList.paging && LasecGetClientList.clients && isArray(LasecGetClientList.clients) === true, 'LasecGetClientList does not have client information');
            assert.isTrue(LasecGetClientList.clients.length === 0, `The api returned an invalid number of client items (${LasecGetClientList.clients.length})`)

            logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Found (${LasecGetClientList.clients.length}) CLIENTS  `);

          } else {
            throw new Error('No Data Element on Response');
          }
        }
      });
  });


  it('Should query for a user by email sales@lasec.co.za and find 1 result', async function () {
    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();
    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send({ query: LasecValidateCustomerEmailAddressQuery, variables: LasecValidateCustomerEmailAddressVariables(`sales@lasec.co.za`) })
      .expect(200)
      .end((err: Error, res: any) => {

        const ttc = moment.utc().diff(started, 'millisecond')
        if (err) {
          logger.error(`Error executing graphql query`, { err, body: res.body });
          throw err;
        }
        else {
          if (res.body && res.body) {
            const { data, errors } = res.body;
            const { LasecGetClientList } = data;

            if (errors && errors.length) {
              throw new ApiError(`The response has errors`, errors);
            }

            assert.exists(LasecGetClientList, 'LasecGetClientList does not exist');
            assert.exists(LasecGetClientList.paging && LasecGetClientList.paging.total, 'LasecGetClientList does not have paging information');
            assert.exists(LasecGetClientList.paging && LasecGetClientList.clients && isArray(LasecGetClientList.clients) === true, 'LasecGetClientList does not have client information');
            assert.isTrue(LasecGetClientList.clients.length === 1, `The api returned an invalid number of client items (${LasecGetClientList.clients.length})`)

            logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Found (${LasecGetClientList.clients.length}) CLIENTS`);

          } else {
            throw new Error('No Data Element on Response');
          }
        }
      });
  });


  it('Should fetch the new customer data for the logged in user', async function () {
    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();

    request.post('api')
      .set('Accept', 'application/json')
      .set('x-client-key', REACTORY_CLIENT_KEY)
      .set('x-client-pwd', REACTORY_CLIENT_PWD)
      .set('Authorization', `Bearer ${logged_in_user.token}`)
      .send({
        query: LasecGetNewClientQuery, variables: {
          uploadContexts: [
            'lasec-crm::new-company::document::' + logged_in_user.id,
            'lasec-crm::company-document'
          ]
        }
      }).expect(200)
      .end((err: Error, res: any) => {
        const ttc = moment.utc().diff(started, 'millisecond');
        logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Fetched New Client  `);

        if (err) {
          logger.error(`Error executing graphql query`, { err, body: res.body });
          throw err;
        } else {
          if (res.body && res.body) {
            const { data, errors } = res.body;
            const { LasecGetNewClient } = data;

            if (errors && errors.length) {
              throw new ApiError(`The response has errors`, errors);
            }

            assert.isNotNull(LasecGetNewClient, `LasecGetNewClient is null`);
            new_client_object = { ...LasecGetNewClient };

          } else {
            throw new ApiError('LasecGetNewClient the response has no body');
          }
        }
      })

  });

  it('Should create a new COD customer using email werner.weber+lasec01@gmail.com', async function () {

    const self: Context = this;
    self.timeout(20000);

    const started = moment.utc();
    let newClient = {
      ...new_client_object
    };

    newClient.confirmed = true;

    newClient.personalDetails.title = 'Mr';
    newClient.personalDetails.accountType = 'cod';
    newClient.personalDetails.firstName = 'Werner';
    newClient.personalDetails.lastName = 'Weber';
    newClient.personalDetails.country = 'South Africa';
    newClient.personalDetails.repCode = 'LAB101';

    newClient.contactDetails.emailAddress = 'werner.weber+lasec01@gmail.com';
    newClient.contactDetails.confirmEmail = 'werner.weber+lasec01@gmail.com';
    newClient.contactDetails.alternateEmail = 'werner.weber+lasec02@gmail.com';
    newClient.contactDetails.confirmAlternateEmail = 'werner.weber+lasec02@gmail.com';
    newClient.contactDetails.mobileNumber = '+27 82 777 1692';
    newClient.contactDetails.alternateMobileNumber = '';
    newClient.contactDetails.officeNumber = '+27 82 777 1692';
    newClient.contactDetails.preferredMethodOfContact = 'email';

    newClient.jobDetails.jobTitle = '';
    newClient.jobDetails.jobType = '';
    newClient.jobDetails.salesTeam = '';
    newClient.jobDetails.lineManager = '';
    newClient.jobDetails.customerType = '';
    newClient.jobDetails.faculty = '';
    newClient.jobDetails.clientDepartment = '';
    newClient.jobDetails.ranking = '';

    newClient.customer.id = '';
    newClient.customer.registeredName = '';

    newClient.organization.id = '';
    newClient.organization.name = '';
    newClient.organization.description = '';

    newClient.address.physicalAddress.id = '';
    newClient.address.physicalAddress.fullAddress = '';

    newClient.address.deliveryAddress.id = '';
    newClient.address.deliveryAddress.fullAddress = '';

    newClient.address.billingAddress.id = '';
    newClient.address.billingAddress.fullAddress = '';

    newClient.clientDocuments = []

    /*
    request.post('api')
    .set('Accept', 'application/json')
    .set('x-client-key', REACTORY_CLIENT_KEY)
    .set('x-client-pwd', REACTORY_CLIENT_PWD)
    .set('Authorization', `Bearer ${logged_in_user.token}`)
    .send( { query: LasecCreateNewClientMutation, variables: {
      newClient: newClient
    }})
    .expect(200)
    .end((err: Error, res: any) => {

      const ttc = moment.utc().diff(started, 'millisecond');
      logger.debug(`${ttcBadge(ttc)} ( ${ttc} ms ): Created User`);

    });
    */


  });



  after('It should log out the logged in user', (done) => {

    done();
  });
});