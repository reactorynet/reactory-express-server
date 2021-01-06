import fs from 'fs';
import path from 'path';
import sha1 from 'sha1';
import lasecApi from '../api';
import om from 'object-mapper';
import moment from 'moment';
import logger from '../../../logging';
import lodash, { isArray, isNil, orderBy, isString } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';
import Hash from '@reactory/server-core/utils/hash';
import iz from '@reactory/server-core/utils/validators';
import { execql } from '@reactory/server-core/graph/client';
import ReactoryFileModel from '@reactory/server-modules/core/models/CoreFile';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import ApiError from 'exceptions';
import { ObjectID, ObjectId } from 'mongodb';
import LasecAPI from '@reactory/server-modules/lasec/api';
import CRMClientComment from '@reactory/server-modules/lasec/models/Comment';
import { User } from '@reactory/server-core/models';
import {
  Lasec360User,
  LasecApiResponse,
  LasecCRMCustomer,
  LasecNewClientInput,
  SimpleResponse,
  LasecAddress,
  LasecAddressUpdateResponse,
} from '../types/lasec';

import { Reactory } from '@reactory/server-core/types/reactory';

import { getLoggedIn360User, getCustomerDocuments } from './Helpers';
import deepEquals from '@reactory/server-core/utils/compare';
import { queryAsync } from '@reactory/server-core/database/mysql';
import LasecCRMClientJobDetails from '../forms/CRM/Client/JobDetail';

const fieldMaps: any = {
  "fullName": "first_name",
  "firstName": "first_name",
  "lastName": "surname",
  "emailAddress": "email",
  "salesTeam": "sales_team_id",
  "accountNumber": "account_number",
  "customer": "company_trading_name",
  "company_rep_code": "company_sales_team",
  "country": "country"
};

export interface GetClientsParams {
  search?: string;
  paging?: {
    page: number; pageSize: number;
  };
  filterBy?: string;
  orderBy?: string;
  orderDirection?: string | "asc" | "desc";
  iter?: number;
  filter: any;
  repCode?: any;
  selectedClient?: any;
};

const getClients = async (params: GetClientsParams) => {

  let logged_in: Lasec360User = await getLoggedIn360User().then();

  if (logged_in === null) throw new ApiError('No Valid Lasec User Logged In');

  const {
    search = "",
    paging = { page: 1, pageSize: 10 },
    filterBy = "any_field",
    orderBy = "fullName",
    orderDirection = "asc",
    iter = 0,
    filter,
    repCode = undefined,
    selectedClient = undefined
  } = params;

  logger.debug(`Getting Clients using search ${search}`, {
    filter,
    search,
    paging,
    filterBy,
    iter,
    repCode,
    selectedClient,
    orderBy,
    orderDirection
  });

  let ordering: { [key: string]: string } = {}

  if (orderBy) {
    let fieldKey: string = fieldMaps[orderBy];
    ordering[fieldKey] = orderDirection
  }

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let _filter: any = {};

  switch (filterBy) {
    case "sales_team_id": {
      _filter['sales_team_id'] = filter || logged_in.repId;
      if (search.trim().length > 0) _filter.any_field = search;
      break;
    }
    case "country":
    case "company_on_hold":
    case "activity_status": {
      _filter[filterBy] = filter;
      if (search.trim().length > 0) _filter.any_field = search;
      break;
    }
    case "any_field":
    default: {
      if (search.trim().length > 0) _filter.any_field = search;

      _filter['sales_team_id'] = logged_in.repId;
      break;
    }
  }
  // NOTE
  // LEAVING THE BELOW FILTER IN PLACE SEEMS TO RESULT IN NO CLIENTS BEING RETURNED

  if (typeof repCode === 'string') {
     _filter.sales_team_id = repCode;
  }

  if (typeof repCode === 'array' && repCode.length > 0) {
     _filter.sales_team_ids = repCode;
  }

  if (!_filter.sales_team_id && !_filter.sales_team_ids) {
    _filter.sales_team_id = logged_in.repId
  }


  if (isString(search) === false || search.length < 3 && filter === undefined) return {
    paging: pagingResult,
    clients: [],
    repCode: repCode ? { title: repCode, value: repCode } : {},
    selectedClient
  };

  const cachekey = Hash(`client_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = false; //await getCacheItem(cachekey);

  if (_cachedResults) {

    if (iter === -99) {
      //client request and we have a cache so we fire off the next fetch anyway
      execql(`query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int, $filter: String, $repCode: String){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter, filter: $filter, repCode: $repCode){
          paging {
            total
            page
            hasNext
            pageSize
          }
          repCode
          selectedClient
          clients {
            id
          }
        }
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1, filter, repCode }).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }

  logger.debug(`Sending query to lasec API with filter`, { filter: _filter })
  const clientResult = await lasecApi.Customers.list({ filter: _filter, pagination: { enabled: true,  page_size: paging.pageSize || 10, current_page: paging.page }, ordering }).then();

  let ids: any[] = [];

  if (isArray(clientResult.ids) === true) {
    ids = [...clientResult.ids];
  }

  if (clientResult.pagination && clientResult.pagination.num_pages > 1) {
    logger.debug('Paged Result From Lasec API', { pagination: clientResult.pagination });
    pagingResult.total = clientResult.pagination.num_items;
    pagingResult.pageSize = clientResult.pagination.page_size || 10;
    pagingResult.hasNext = clientResult.pagination.has_next_page === true;
    pagingResult.page = clientResult.pagination.current_page || 1;
  }

  logger.debug(`Loading (${ids.length}) client ids`);

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: ids }, ordering: {  }, pagination: { enabled: false, current_page: paging.page, page_size: paging.pageSize } });
  logger.debug(`Fetched Expanded View for (${clientDetails.items.length}) Clients from API`);
  let clients = [...clientDetails.items];
  clients = clients.map(client => {
    let _client = om(client, {
      'id': 'id',
      'first_name': [{
        "key": 'fullName',
        "transform": (sourceValue, sourceObject) => `${sourceValue} ${sourceObject.surname}`,
      }, "firstName"],
      'surname': 'lastName',
      'sales_team_id': 'salesTeam',
      'activity_status': { key: 'clientStatus', transform: (sourceValue) => `${sourceValue}`.toLowerCase() },
      'email': 'emailAddress',
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
      'duplicate_name_flag': { key: 'isNameDuplicate', transform: (src) => src == true },
      'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src) => src == true },
      'company_on_hold': {
        'key': 'customer.customerStatus',
        'transform': (val) => (`${val === true ? 'on-hold' : 'not-on-hold'}`)
      },
      'currency_code': 'customer.currencyCode',
      'currency_symbol': 'customer.currencySymbol',
      'country': ['country', 'customer.country']
    });


    return _client;
  });

  //clients = orderBy(clients, ['fullName', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    repCode: repCode ? { title: repCode, value: repCode } : {},
    selectedClient,
    clients,
  };

  if (result.paging.pageSize >= 10 && result.paging.hasNext === true) {
    // cache the next result

    // create segments for page size 5 and 10
    if (result.paging.pageSize === 20) {
      const cachekeys_10 = `client_list_${search}_page_${paging.page || 1}_page_size_10`.toLowerCase();
      setCacheItem(cachekeys_10, { paging: { ...result.paging, pageSize: 10, hasNext: true }, clients: lodash.take(result.products, 10) });
    }

    const cachekeys_5 = `client_list_${search}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: { ...result.paging, pageSize: 5, hasNext: true }, clients: lodash.take(result.products, 5) });
  }

  if (result.paging.hasNext === true && iter === 0) {
    try {
      execql(`query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          repCode
          selectedClient
          clients {
            id
          }
        }
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  // setCacheItem(cachekey, result, 60 * 10);

  logger.debug(`GETCLIENTLIST RETURN  (${result.repCode})`);

  return result;
}

export const getClient = async (params: any) => {

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: [params.id] } });

  let clients = [...clientDetails.items];
  if (clients.length === 1) {

    logger.debug(`CLIENT::: ${JSON.stringify(clients[0])}`);

    let clientResponse = om(clients[0], {
      'id': 'id',
      'title_id': ['title', 'titleLabel'],
      'first_name': [{
        "key":
          'fullName',
        "transform": (sourceValue, sourceObject) => `${sourceValue} ${sourceObject.surname}`,
      }, "firstName"],
      'surname': 'lastName',
      'activity_status': { key: 'clientStatus', transform: (sourceValue) => `${sourceValue}`.toLowerCase() },
      'email': 'emailAddress',
      'alternate_email': 'alternateEmail',
      'mobile_number': 'mobileNumber',
      'office_number': 'officeNumber',
      'alternate_office_number': 'alternateOfficeNumber',
      'special_notes': 'note',
      'sales_team_id': 'salesTeam',
      'duplicate_name_flag': { key: 'isNameDuplucate', transform: (src) => src == true },
      'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src) => src == true },
      'department': ['department', 'jobTitle'],
      'ranking_id': 'customer.ranking',

      'faculty': 'faculty',
      'customer_type': 'customerType',
      'line_manager_id': 'lineManager',
      'line_manager_name': 'lineManagerLabel',
      'role_id': 'jobType',
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
      'customer_class_id': 'customer.customerClass',
      'account_type': ['accountType', 'customer.accountType'],
      'company_on_hold': {
        'key': 'customer.customerStatus',
        'transform': (val) => (`${val === true ? 'On-hold' : 'Active'}`)
      },
      'currency_code': 'customer.currencyCode',
      'currency_symbol': 'customer.currencySymbol',
      'physical_address_id': 'customer.physicalAddressId',
      'physical_address': 'customer.physicalAddress',
      'delivery_address_id': 'customer.deliveryAddressId',
      'delivery_address': 'customer.deliveryAddress',
      'billing_address': "customer.billingAddress",
      'country': ['country', 'customer.country']
    });

    try {
      let hashkey = Hash(`LASEC_COMPANY::${clientResponse.customer.id}`);
      let found = await getCacheItem(hashkey).then();
      logger.debug(`Found Cached Item for LASEC_COMPANY::${clientResponse.customer.id} ==> ${found}`)
      if (found === null || found === undefined) {
        let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [clientResponse.customer.id] } }).then()

        logger.debug(`LASEC_COMPANY DETAILS::${JSON.stringify(companyPayloadResponse.items[0])}`);

        if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
          if (companyPayloadResponse.items.length === 1) {
            let customerObject = {
              ...clientResponse.customer, ...om(companyPayloadResponse.items[0], {
                'company_id': 'id',
                'registered_name': 'registeredName',
                'description': 'description',
                'trading_name': 'tradingName',
                "registration_number": 'registrationNumber',
                "vat_number": "taxNumber",
                'organization_id': 'organizationId',
                'currency_code': 'currencyCode',
                'currency_symbol': 'currencySymbol',
                'currency_description': 'currencyDescription',
                "credit_limit_total_cents": "creditLimit",
                "current_balance_total_cents": "currentBalance",
                "current_invoice_total_cents": "currentInvoice",
                "30_day_invoice_total_cents": "balance30Days",
                "60_day_invoice_total_cents": "balance60Days",
                "90_day_invoice_total_cents": "balance90Days",
                "120_day_invoice_total_cents": "balance120Days",
                "credit_invoice_total_cents": "creditTotal",
                'special_requirements': { key: 'specialRequirements', transform: (srcVal) => srcVal == null || srcVal == '' ? 'No special requirements set.' : srcVal },
              })
            };
            // "special_requirements": "specialRequirements"

            setCacheItem(hashkey, customerObject, 10);
            clientResponse.customer = customerObject;
          }
        }
      } else {
        clientResponse.customer = found;
      }
    } catch (companyLoadError) {
      logger.error(`Could not laod company data ${companyLoadError.message}`);
    }

    // SET PERSON TITLE STRING VALUE
    const titles = await getPersonTitles();
    const setTitle = titles.find(t => t.id == clientResponse.titleLabel)
    clientResponse.titleLabel = setTitle ? setTitle.title : clientResponse.titleLabel;

    // SET ROLE STRING VALUE
    const roles = await getCustomerRoles({}).then();
    const employeeRole = roles.find(t => t.id == clientResponse.jobType);
    clientResponse.jobTypeLabel = employeeRole ? employeeRole.name : clientResponse.jobType;

    // CUSTOMER CLASS

    const customerClasses = await getCustomerClass().then();
    const customerClass = customerClasses.find(c => c.id == clientResponse.customer.customerClass);

    clientResponse.customerClassLabel = customerClass ? customerClass.name : clientResponse.customer.customerClass;

    logger.debug(`CompanyResolver.ts getClient(${params.id})`, clientResponse);
    return clientResponse;
  }

  return null;
};


/**
 *

interface ClientUpdateInput {
  clientId: string
  clientStatus?: string
  title: string
  firstName: string
  lastName: string
  country: string
  mobileNumber: string
  officeNumber: string
  alternateOfficeNumber: string
  email: string
  alternateEmail: string
  accountType: string
  repCode: string
  jobTitle: string
  clientDepartment: string
  clientClass: string
  ranking: string

  faculty: string
  customerType: string
  lineManager: string
  jobType: string
};

/**
 * @param args client object
 */
const updateClientDetail = async (args: { clientInfo: ClientUpdateInput }) => {

  logger.debug(`CompanyResolver.ts >> updateClientDetail(args)`, args);

  try {
    const params = args.clientInfo;

    const preFetchClientDetails = await lasecApi.Customers.list({ filter: { ids: [params.clientId] } });

    let clients = [...preFetchClientDetails.items];
    if (clients.length === 1) {

      const client = clients[0];

      let updateParams = {
        // first_name: params.firstName || (client.first_name || ''),
        first_name: params.personalDetails && params.personalDetails.firstName || (client.first_name || ''),

        // surname: params.lastName || (client.surname || ''),
        surname: params.personalDetails && params.personalDetails.lastName || (client.surname || ''),

        activity_status: params.clientStatus || (client.activity_status || ''),

        // country: params.country || (client.country || ''),
        country: params.personalDetails && params.personalDetails.country || (client.country || ''),

        // department: params.department || (client.department || 'NONE'),
        department: params.jobDetails && params.jobDetails.department || (client.department || 'NONE'),

        // title_id: client.title_id,
        title_id: params.personalDetails && params.personalDetails.title || (client.title_id || ''),

        // mobile_number: params.mobileNumber || (client.mobile_number || ''),
        mobile_number: params.contactDetails && params.contactDetails.mobileNumber || (client.mobile_number || ''),

        // office_number: params.officeNumber || (client.office_number || ''),
        office_number: params.contactDetails && params.contactDetails.officeNumber || (client.office_number || ''),

        // alternate_office_number: params.alternateNumber || (client.alternate_office_number || ''),
        alternate_office_number: params.contactDetails && params.contactDetails.alternateNumber || (client.alternate_office_number || ''),

        // email: params.email || (client.email || ''),
        email: params.contactDetails && params.contactDetails.emailAddress || (client.email || ''),

        // confirm_email: params.email || (client.email || ''),
        confirm_email: params.contactDetails && params.contactDetails.confirmEmail || (client.email || ''),

        // alternate_email: params.alternateEmail || (client.alternate_email || ''),
        alternate_email: params.contactDetails && params.contactDetails.alternateEmail || (client.alternate_email || ''),

        // ranking_id: params.ranking || (client.ranking_id || ''),
        ranking_id: params.ranking || (client.ranking_id || ''), // come back to this

        // account_type: params.accountType || (client.account_type || ''),
        account_type: params.personalDetails && params.personalDetails.accountType || (client.account_type || ''),

        // customer_class_id: params.clientClass || (client.customer_class_id || ''),
        // customer_class_id: params.jobDetails && params.jobDetails.customerClass || (client.customer_class_id || ''),
        customer_class_id: params.clientClass ? params.clientClass : params.jobDetails && params.jobDetails.customerClass || (client.customer_class_id || ''),

        // sales_team_id: params.repCode || (client.sales_team || ''),
        sales_team_id: params.personalDetails && params.personalDetails.repCode || (client.sales_team || ''),


        faculty: params.faculty || (client.faculty || ''),
        customer_type: params.customerType || (client.customer_type || ''),
        line_manager_id: params.lineManager || (client.line_manager_id || ''),
        role_id: params.jobType || (client.role_id || ''),// role_id: client.role_id,

      }

      logger.debug(`UPDATE PARAMS:: ${JSON.stringify(updateParams)}`);

      const apiResponse = await lasecApi.Customers.UpdateClientDetails(params.clientId, updateParams);

      if (apiResponse.success && apiResponse.customer) {
        // map customer
        let clientResponse = om(apiResponse.customer, {
          'id': 'id',
          'title_id': ['title', 'titleLabel'],
          'first_name': [{
            "key":
              'fullName',
            "transform": (sourceValue, sourceObject) => `${sourceValue} ${sourceObject.surname}`,
          }, "firstName"],
          'surname': 'lastName',
          'activity_status': { key: 'clientStatus', transform: (sourceValue) => `${sourceValue}`.toLowerCase() },
          'email': 'emailAddress',
          'alternate_email': 'alternateEmail',
          'mobile_number': 'mobileNumber',
          'office_number': 'officeNumber',
          'alternate_office_number': 'alternateOfficeNumber',
          'special_notes': 'note',
          'sales_team_id': 'salesTeam',
          'duplicate_name_flag': { key: 'isNameDuplucate', transform: (src) => src == true },
          'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src) => src == true },
          'department': ['department', 'jobTitle'],
          'ranking_id': 'customer.ranking',

          'faculty': 'faculty',
          'customer_type': 'customerType',
          'line_manager_id': 'lineManager',
          'line_manager_name': 'lineManagerLabel',
          'role_id': 'jobType',
          'company_id': 'customer.id',
          'company_account_number': 'customer.accountNumber',
          'company_trading_name': 'customer.tradingName',
          'company_sales_team': 'customer.salesTeam',
          'customer_class_id': 'customer.customerClass',
          // 'customer_class_id': ['customer.classId',
          //   {
          //     key: 'customer.customerClass',
          //     transform: (sourceValue) => `${sourceValue} => Lookup Pending`
          //   }
          // ],
          'account_type': ['accountType', 'customer.accountType'],
          'company_on_hold': {
            'key': 'customer.customerStatus',
            'transform': (val) => (`${val === true ? 'on-hold' : 'not-on-hold'}`)
          },
          'currency_code': 'customer.currencyCode',
          'currency_symbol': 'customer.currencySymbol',
          'physical_address_id': 'customer.physicalAddressId',
          'physical_address': 'customer.physicalAddress',
          'delivery_address_id': 'customer.deliveryAddressId',
          'delivery_address': 'customer.deliveryAddress',
          'billing_address': "customer.billingAddress",
          'country': ['country', 'customer.country']
        });

        try {
          let hashkey = Hash(`LASEC_COMPANY::${clientResponse.customer.id}`);
          let found = await getCacheItem(hashkey).then();
          logger.debug(`Found Cached Item for LASEC_COMPANY::${clientResponse.customer.id} ==> ${found}`)
          if (found === null || found === undefined) {
            let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [clientResponse.customer.id] } }).then()
            if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
              if (companyPayloadResponse.items.length === 1) {

                let customerObject = {
                  ...clientResponse.customer, ...om(companyPayloadResponse.items[0], {
                    'company_id': 'id',
                    'registered_name': 'registeredName',
                    'description': 'description',
                    'trading_name': 'tradingName',
                    "registration_number": 'registrationNumber',
                    "vat_number": "taxNumber",
                    'organization_id': 'organizationId',
                    'currency_code': 'currencyCode',
                    'currency_symbol': 'currencySymbol',
                    'currency_description': 'currencyDescription',
                    "credit_limit_total_cents": "creditLimit",
                    "current_balance_total_cents": "currentBalance",
                    "current_invoice_total_cents": "currentInvoice",
                    "30_day_invoice_total_cents": "balance30Days",
                    "60_day_invoice_total_cents": "balance60Days",
                    "90_day_invoice_total_cents": "balance90Days",
                    "120_day_invoice_total_cents": "balance120Days",
                    "credit_invoice_total_cents": "creditTotal"
                  })
                };

                setCacheItem(hashkey, customerObject, 10);
                clientResponse.customer = customerObject;
              }
            }
          } else {
            clientResponse.customer = found;
          }
        } catch (companyLoadError) {
          logger.error(`Could not laod company data ${companyLoadError.message}`);
        }

        // SET PERSON TITLE STRING VALUE
        const titles = await getPersonTitles();
        const setTitle = titles.find(t => t.id == clientResponse.titleLabel)
        clientResponse.titleLabel = setTitle ? setTitle.title : clientResponse.titleLabel;

        // SET ROLE STRING VALUE
        const roles = await getCustomerRoles({}).then();
        const employeeRole = roles.find(t => t.id == clientResponse.jobType);
        clientResponse.jobTypeLabel = employeeRole ? employeeRole.name : clientResponse.clientResponse.jobType;

        // CUSTOMER CLASS

        const customerClasses = await getCustomerClass({}).then();
        const customerClass = customerClasses.find(c => c.id == clientResponse.customer.customerClass);
        clientResponse.customerClassLabel = customerClass ? customerClass.name : clientResponse.clientResponse.customer.customerClass;

        return {
          Success: apiResponse.success,
          Client: clientResponse
        };

      }

      return {
        Success: apiResponse.success,
        Client: null
      };
    }

    throw new ApiError('Could not update client details. Please try again.');
  }
  catch (ex) {
    logger.error(`ERROR UPDATING CLIENT DETAILS::  ${ex}`);
    throw new ApiError('Error updating client details. Please try again');
  }
}

const LASEC_ROLES_KEY = 'LASEC_CUSTOMER_ROLES';

const getCustomerRoles = async () => {

  const cached = await getCacheItem(Hash(LASEC_ROLES_KEY)).then();
  if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerRoles();

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerRoles({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem(Hash(LASEC_ROLES_KEY), details, 60);
      return details.items;
    }
  }

  return [];

};

const getCustomerRanking = async () => {

  const cached = await getCacheItem(Hash('LASEC_CUSTOMER_RANKING')).then();

  if (cached && cached.items) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerRankings();

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerRankings({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem('LASEC_CUSTOMER_RANKING', details, 60);
      return details.items;
    }
  }

  return [];

};

const getCustomerClass = async () => {
  //if (cached && cached.items) return cached.items;
  const idsResponse = await lasecApi.Customers.GetCustomerClass();

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerClass({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem(Hash('LASEC_CUSTOMER_CLASS'), details, 60);
      return details.items;
    }
  }

  return [];
};

const getFacultyList = async () => {


  try {
    const faculty_list: { faculty: string }[] = await mysql(`SELECT faculty FROM CustomerFaculty ORDER by faculty ASC`, 'mysql.lasec360').then();
    logger.debug(`Results from Faculty Query`, { faculty_list })

    if (faculty_list && faculty_list.length > 0) {
      return faculty_list.map((faculty_row: { faculty: string }) => ({
        id: faculty_row.faculty,
        key: faculty_row.faculty,
        name: faculty_row.faculty,
        description: faculty_row.faculty,
      }));
    }

  } catch (databaseError) {
    logger.error(`Could not retrieve the Faculty List: ${databaseError.message}`, { databaseError });
    return [];
  }

  /*
  logger.debug(`[RESOLVER] GET FACULTY RESPONSE:: ${JSON.stringify(idsResponse)}`);

  //if (cached && cached.items) return cached.items;
  const idsResponse = await lasecApi.Customers.GetFacultyList().then();


  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetFacultyList({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem(Hash('LASEC_FACULTY'), details, 60);
      return details.items;
    }
  }
*/


};

const getCustomerTypeList = async () => {


  try {
    const type_list: { customer_type: string }[] = await mysql(`SELECT type as customer_type FROM CustomerType ORDER by customer_type ASC`, 'mysql.lasec360').then();
    logger.debug(`Results from CustomerType Query`, { customer_type_list: type_list })

    if (type_list && type_list.length > 0) {
      return type_list.map((customer_type_row: { customer_type: string }) => ({
        id: customer_type_row.customer_type,
        key: customer_type_row.customer_type,
        name: customer_type_row.customer_type,
        description: customer_type_row.customer_type,
      }));
    }

  } catch (databaseError) {
    logger.error(`Could not retrieve the Customer Type List: ${databaseError.message}`, { databaseError });
    return [];
  }


  /*
  //if (cached && cached.items) return cached.items;
  const idsResponse = await lasecApi.Customers.GetCustomerType().then();
  logger.debug(`[RESOLVER] GET CUSTOMER TYPE RESPONSE:: ${JSON.stringify(idsResponse)}`);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerType({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem(Hash('LASEC_CUSTOMER_TYPE'), details, 60);
      return details.items;
    }
  }

  return [];
  */
};

const getCustomerLineManagerOptions = async (params) => {

  //if (cached && cached.items) return cached.items;
  const response = await lasecApi.Customers.GetCustomerLineManagers(params).then();
  logger.debug(`[RESOLVER] GET LINE MANAGERS RESPONSE:: ${JSON.stringify(response)}`);

  if (response.items) {
    return response.items.map(item => {
      return { id: item.line_manager_id, name: item.line_manager_name };
    });
  }

  return [];
};

const getCustomerClassById = async (id) => {
  const customerClasses = await getCustomerClass({}).then();
  logger.debug(`Searching in ${customerClasses.length} classes for id ${id}`)
  const found = lodash.find(customerClasses, { id: id });
  return found;
};

const getCustomerCountries = async () => {
  try {
    logger.info("Retrieving countries from remote api")
    let countries = await lasecApi.get(lasecApi.URIS.customer_country.url, undefined, { 'country[]': ['[].id', '[].name'] }).then();
    logger.debug("Retrieved and mapped remote data to ", { countries });
    return lodash.uniqWith(countries, lodash.isEqual);
  } catch (countryListError) {
    logger.error("Could not get the country list from the remote API", countryListError);
    return []
  }
};

const getCustomerRepCodes = async () => {
  const idsResponse = await lasecApi.Customers.GetRepCodes();

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetRepCodes({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      return details.items;
    }
  }

  return [];
};


const CLIENT_TITLES_KEY = "LasecClientTitles";

const getPersonTitles = async () => {
  logger.debug(`CompanyResolver.ts getPersonTitles()`);

  const cached = await getCacheItem(Hash(CLIENT_TITLES_KEY)).then();
  if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetPersonTitles();

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetPersonTitles({ filter: { ids: [...idsResponse.ids] }, pagination: { enabled: false, page_size: 10 } });
    if (details && details.items) {
      setCacheItem(Hash(CLIENT_TITLES_KEY), details, 60);
      return details.items;
    }
  }

  return [];

}

const getPersonTitle = async (params) => {
  logger.debug(`Looking for title with id ${params.id}`)
  const titles = await getPersonTitles(params).then();

  if (titles.length > 0) {
    const found = lodash.find(titles, { id: params.id });
    return found;
  }

  return null;
};

const CLIENT_JOBTYPES_KEY = "LasecClientJobTypesLookup";

const getCustomerJobTypes = async () => {

  //const cached = await getCacheItem(Hash(CLIENT_JOBTYPES_KEY)).then();

  //if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerJobTypes();
  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerJobTypes({ filter: { ids: [...idsResponse.ids] }, pagination: {} });
    if (details && details.items) {
      setCacheItem(Hash(CLIENT_JOBTYPES_KEY), details, 60);
      return details.items;
    }
  }
  return [];
}

const getLasecSalesTeamsForLookup = async () => {
  logger.debug(`GETTING SALES TEAMS`);
  // const salesTeamsResults = await lasecApi.get(lasecApi.URIS.groups, undefined).then();
  const teamsPayload = await LasecAPI.Teams.list().then();
  logger.debug(`SALES TEAM PAYLOAD :: ${JSON.stringify(teamsPayload)}`);
  if (teamsPayload.status === "success") {
    const { items } = teamsPayload.payload || [];
    logger.debug(`SALES TEAM:: ${JSON.stringify(items[0])}`);
    const teams = items.map((sales_team) => {
      return {
        id: sales_team.id,
        name: sales_team.sales_team_id,
      };
    });

    return teams;
  }
  logger.debug('SalesTeamsLookupResult >> ', salesTeamsResults);
}

const getCustomerList = async (params) => {

  const { search = "", paging = { page: 1, pageSize: 10 }, filterBy = "", iter = 0, filter } = params;

  logger.debug(`Getting Customers using search ${search}`, { search, paging, filterBy, iter });

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let _filter = {};

  _filter[filterBy] = filter || search;

  if (isString(search) === false || search.length < 3 && filter === undefined) return {
    paging: pagingResult,
    customers: []
  };

  const cachekey = Hash(`company_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = await getCacheItem(cachekey);

  if (_cachedResults) {

    if (iter === 0) {
      //client request and we have a cache so we fire off the next fetch anyway
      execql(`query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
            accountNumber
          }
        }
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1 }).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }

  logger.debug(`Calling companies api`);

  let filterParams = {
    filter: {
      account_type: "",
      any_field: search,
    },
    format: {
      ids_only: true,
    },
    ordering: {},
    pagination: {
      current_page: pagingResult.page,
      page_size: pagingResult.pageSize,
    }
  };

  const companyResult = await lasecApi.Company.list(filterParams).then();

  logger.debug(`Returning ids ${companyResult.ids}`);

  let ids = [];

  if (isArray(companyResult.ids) === true) {
    ids = [...companyResult.ids];
  }

  if (companyResult.pagination && companyResult.pagination.num_pages > 1) {
    logger.debug('Paged Result From Lasec API', { pagination: companyResult.pagination });
    pagingResult.total = companyResult.pagination.num_items;
    pagingResult.pageSize = companyResult.pagination.page_size || 10;
    pagingResult.hasNext = companyResult.pagination.has_next_page === true;
    pagingResult.page = companyResult.pagination.current_page || 1;
  }

  logger.debug(`Loading (${ids.length}) company ids`);

  const companyDetails = await lasecApi.Company.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${companyDetails.items.length}) Companies from API`);
  let customers = [...companyDetails.items];

  logger.debug(`CUSTOMER RESOLVER - CUSTOMER:: Found (${customers.length}) for request`, customers);

  customers = customers.map(customer => {
    let _customer = om(customer, {
      'id': ['id', 'accountNumber'],
      'registered_name': 'registeredName',
      'trading_name': 'tradingName',
      'sales_team_id': 'salesTeam',
      'account_terms': 'accountType',
      'customer_class_id': 'customerClass',
      'company_on_hold': { key: 'customerStatus', transform: (company_on_hold: boolean) => (company_on_hold === true ? 'ON HOLD' : 'NOT ON HOLD') },
      'credit_limit_total_cents': {
        key: 'availableBalance', transform: (limit: string | number) => {
          let _limit = 0;
          if (typeof limit === 'number' && limit > 0) _limit = limit;
          if (typeof limit === 'string') {
            if (limit.indexOf(".") > 0) {
              try {
                _limit = parseFloat(limit)
              } catch (parseError) {
                logger.error(`Could not parse credit_limit_total "${limit}" as float`);
              }
            } else {
              try {
                _limit = parseInt(limit)
              } catch (parseError) {
                logger.error(`Could not parse credit_limit_total "${limit}" as number`);
              }
            }
          }

          if (_limit > 0) return Math.fround(_limit / 100);

          return _limit;

        }
      },
      'currency_symbol': 'currencySymbol',
      'vat_number': ['taxNumber', 'vatNumber'],
    });
    return _customer;
  });

  customers = orderBy(customers, ['registeredName', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    customers,
  };

  if (result.paging.pageSize >= 10 && result.paging.hasNext === true) {
    if (result.paging.pageSize === 20) {
      const cachekeys_10 = `company_list_${search}_page_${paging.page || 1}_page_size_10`.toLowerCase();
      setCacheItem(cachekeys_10, { paging: { ...result.paging, pageSize: 10, hasNext: true }, clients: lodash.take(result.products, 10) });
    }

    const cachekeys_5 = `company_list_${search}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: { ...result.paging, pageSize: 5, hasNext: true }, clients: lodash.take(result.products, 5) });
  }

  if (result.paging.hasNext === true && iter === 0) {
    try {
      execql(`query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
            accountNumber
          }
        }
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  setCacheItem(cachekey, result, 60 * 10);

  return result;

};

const getCustomerById = async (id: string) => {
  const companyDetails = await lasecApi.Company.list({ filter: { ids: [id] } }).then();
  logger.debug(`Fetched Expanded View for (${companyDetails.items.length}) Companies from API`);
  if (companyDetails.items[0]) return companyDetails.items[0];
};

const getOrganisationList = async (params) => {

  const { search = "", paging = { page: 1, pageSize: 10 }, filterBy = "", iter = 0, filter } = params;

  logger.debug(`Getting Organization using search ${search}`, { search, paging, filterBy, iter });

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let _filter = {};

  _filter[filterBy] = filter || search;

  if (isString(search) === false || search.length < 3 && filter === undefined) return {
    paging: pagingResult,
    organisations: []
  };

  const cachekey = Hash(`organization_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = await getCacheItem(cachekey);

  if (_cachedResults) {

    if (iter === 0) {
      //client request and we have a cache so we fire off the next fetch anyway
      execql(`query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
          }
        }
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1 }).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }

  logger.debug(`Calling Organisations api`);

  let filterParams = {
    filter: {
      any_field: search,
    },
    format: {
      ids_only: true,
    },
    ordering: {},
    pagination: {
      current_page: pagingResult.page,
      page_size: pagingResult.pageSize,
    },
  };

  const organisationResult = await lasecApi.Organisation.list(filterParams).then();

  logger.debug(`Returning ids ${organisationResult.ids}`);

  let ids: string[] = [];

  if (isArray(organisationResult.ids) === true) {
    ids = [...organisationResult.ids];
  }

  if (organisationResult.pagination && organisationResult.pagination.num_pages > 1) {
    logger.debug('Paged Result From Lasec API', { pagination: organisationResult.pagination });
    pagingResult.total = organisationResult.pagination.num_items;
    pagingResult.pageSize = organisationResult.pagination.page_size || 10;
    pagingResult.hasNext = organisationResult.pagination.has_next_page === true;
    pagingResult.page = organisationResult.pagination.current_page || 1;
  }

  logger.debug(`Loading (${ids.length}) company ids`);

  let organisations: any[] = [];

  if (ids.length > 0) {

    const organisationDetails = await lasecApi.Organisation.list({ filter: { ids: ids } }).then();

    logger.debug(`Fetched Expanded View for (${organisationDetails.organisations.length}) ORGANISATIONS from API`);
    organisations = [...organisationDetails.organisations];

    logger.debug(`ORGANISATION RESOLVER - ORGANISATION:: Found (${organisations.length}) for request`);

    organisations = organisations.map(organisation => {
      let _organisation = om.merge(organisation, {
        'id': 'id',
        'name': 'name',
        'description': 'description',
      });
      return _organisation;
    });
  }

  logger.debug(`ORGANISATIONS:: (${JSON.stringify(organisations)})`);

  if (organisations.length > 1) organisations = orderBy(organisations, ['name', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    organisations,
  };

  if (result.paging.hasNext === true && iter === 0) {
    try {
      execql(`query LasecGetCustomerList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetCustomerList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          customers {
            id
            registeredName
          }
        }
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  setCacheItem(cachekey, result, 60 * 10);

  return result;

};

const createNewOrganisation = async (args) => {

  // Required:: customer_id name description
  // Possibly also needs "onboarding_step_completed"

  try {

    const apiResponse = await lasecApi.Organisation.createNew({
      customer_id: args.customerId,
      name: args.name,
      description: args.description,
    }).then();

    logger.debug(`RESOLVER API RESPONSE:: ${JSON.stringify(apiResponse)}`);

    return {
      success: apiResponse.status === 'success',
      id: apiResponse.payload.id,
    }
  }
  catch (ex) {
    logger.error(`ERROR CREATING ORGANISATION::  ${ex}`);
    return {
      success: false,
      id: 0,
    }
  }
};


// Gets a filename extension.
const getExtension = (filename: string) => {
  return filename.split('.').pop();
}

const allowedExts = ['txt', 'pdf', 'doc', 'zip'];
const allowedMimeTypes = ['text/plain', 'application/msword', 'application/x-pdf', 'application/pdf', 'application/zip'];

// Test if a file is valid based on its extension and mime type.


const uploadDocument = async (args: any) => {
  return new Promise(async (resolve, reject) => {

    const { createReadStream, filename, mimetype, encoding } = await args.file;
    logger.debug(`UPLOADED FILE:: ${filename} - ${mimetype} ${encoding}`);

    const stream: NodeJS.ReadStream = createReadStream();

    const randomName = `${sha1(new Date().getTime().toString())}.${getExtension(filename)}`;

    const link = `${process.env.CDN_ROOT}content/files/${randomName}`;


    // Flag to tell if a stream had an error.
    let hadStreamError: boolean = null;

    //ahndles any errors during upload / processing of file
    const handleStreamError = (error: any) => {
      // Do not enter twice in here.
      if (hadStreamError) {
        return;
      }

      hadStreamError = true;

      // Cleanup: delete the saved path.
      if (saveToPath) {
        // eslint-disable-next-line consistent-return
        return fs.unlink(saveToPath, () => {
          reject(error)
        });
      }

      // eslint-disable-next-line consistent-return
      reject(error)
    }


    const catalogFile = () => {
      // Check if image is valid
      const fileStats: fs.Stats = fs.statSync(saveToPath);

      logger.debug(`SAVING FILE:: DONE ${filename} ${fileStats.size} --> CATALOGGING`);

      const reactoryFile: any = {
        id: new ObjectID(),
        filename,
        mimetype,
        alias: randomName,
        partner: new ObjectID(global.partner.id),
        owner: global.user,
        // owner: new ObjectID(global.user.id),
        uploadedBy: global.user,
        // uploadedBy: new ObjectID(global.user.id),
        size: fileStats.size,
        hash: Hash(link),
        link: link,
        path: 'content/files/',
        uploadContext: args.uploadContext || 'lasec-crm::company-document',
        public: false,
        published: false,
      };

      if (reactoryFile.uploadContext === 'lasec-crm::new-company::document') {
        reactoryFile.uploadContext = `lasec-crm::new-company::document::${global.user._id}`;
      }

      const savedDocument = new ReactoryFileModel(reactoryFile);

      savedDocument.save().then();

      logger.debug(`SAVING FILE:: DONE ${filename} --> CATALOGGING`);

      resolve(savedDocument);
    }

    // Generate path where the file will be saved.
    // const appDir = path.dirname(require.main.filename);
    const saveToPath = path.join(process.env.APP_DATA_ROOT, 'content', 'files', randomName);

    logger.debug(`SAVING FILE:: ${filename} --> ${saveToPath}`);

    const diskWriterStream: NodeJS.WriteStream = fs.createWriteStream(saveToPath);
    diskWriterStream.on('error', handleStreamError);

    // Validate image after it is successfully saved to disk.
    diskWriterStream.on('finish', catalogFile);

    // Save image to disk.
    stream.pipe(diskWriterStream);
  });
};

const deleteDocuments = async (args: any) => {

  const { fileIds } = args;

  let files = await ReactoryFileModel.find({ id: { $in: fileIds } }).then()

  files.forEach((fileDocument) => {
    const fileToRemove = path.join(process.env.APP_DATA_ROOT, 'content', 'files', fileDocument.alias);
    try {
      if (fs.existsSync(fileToRemove)) fs.unlinkSync(fileToRemove);

      fileDocument.remove().then();
    } catch (unlinkError) {
      logger.debug(`Could not unlink file`)
    }
  });

  return {
    description: `Successfully deleted (${fileIds.length}) files`,
    text: 'Files deleted',
    status: 'success',
  }

};

export interface NewClientResponse {
  client: any,
  success: Boolean,
  messages: any[]
}

const clientDocuments: any[] = [];

export const DEFAULT_NEW_CLIENT = {
  __typename: 'LasecNewClient',
  id: new ObjectId(),
  clientId: '',
  personalDetails: {
    title: '',
    firstName: '',
    lastName: '',
    country: '',
    repCode: 'LAB101',
    accountType: ''
  },
  contactDetails: {
    emailAddress: '',
    confirmEmail: '',
    alternateEmail: '',
    confirmAlternateEmail: '',
    mobileNumber: '',
    alternateMobile: '',
    officeNumber: '',
    alternateOfficeNumber: '',
    prefferedMethodOfContact: 'email',
  },
  jobDetails: {
    jobTitle: '',
    jobType: '',
    jobTypeLabel: '',
    salesTeam: '',
    lineManager: '',
    customerType: '',
    customerClass: '',
    faculty: '',
    clientDepartment: '',
    ranking: '',
  },
  customer: {
    id: '',
    registeredName: '',
  },
  organization: {
    id: '',
    name: '',
  },
  address: {
    id: new ObjectId(),
    physicalAddress: {
      id: '',
      fullAddress: '',
      map: {}
    },
    deliveryAddress: {
      id: '',
      fullAddress: '',
      map: {}
    },
    billingAddress: {
      id: '',
      fullAddress: '',
      map: {}
    },
  },
  clientDocuments,
  confirmed: false,
  saved: false,
};

interface LasecPagedAddressResults {
  paging: Reactory.IPagingResult,
  addresses: LasecAddress[]
}

const getAddress = async (args: { searchTerm: string, paging: Reactory.IPagingRequest }): Promise<LasecPagedAddressResults> => {

  const { paging } = args;

  try {
    logger.debug(`GETTING ADDRESS:: ${JSON.stringify(args)}`);
    const addressIds = await lasecApi.Customers.getAddress({ filter: { any_field: args.searchTerm }, format: { ids_only: true }, pagination: { enabled: true, page_size: paging.pageSize || 10, current_page: paging.page } });

    let _ids = [];
    if (isArray(addressIds.ids) === true && addressIds.ids.length > 0) {
      _ids = [...addressIds.ids];
      const addressDetails = await lasecApi.Customers.getAddress({ filter: { ids: _ids }, pagination: { enabled: true, page_size: paging.pageSize || 10, current_page: paging.page } });
      const addresses = [...addressDetails.items];
      logger.debug(`Found ${addresses.length || 0} that matches the search term "${args.searchTerm}"`, { addressDetails });
      return {
        paging: {
          hasNext: addressIds.pagination.has_next_page === true,
          page: addressIds.pagination.current_page,
          pageSize: addressIds.pagination.page_size,
          total: addressIds.pagination.num_pages
        },
        addresses
      }
    }

    return {
      paging: {
        hasNext: false,
        page: 1,
        pageSize: args.paging.pageSize,
        total: 0
      },
      addresses: []
    };

  } catch (getAddressError) {
    logger.error(`Error Getting the address details`, { error: getAddressError })
    throw new ApiError("Could not process query", getAddressError);
  }





}

const createNewAddress = async (args) => {
  // {
  //   "building_description_id": "1",
  //   "building_floor_number_id": "2",
  //   "unit": "1",
  //   "map": {
  //     "lat": -33.932568,
  //     "lng": 18.4933,
  //     "formatted_address": "1, 1 Test Location 11 Test Street Test Suburb Test Metro Test City 1234 Test State Test Country",
  //     "address_components": []
  //   },
  //   "confirm_pin": true,
  //   "address_fields": {
  //     "0": "1", ------------------> UNIT NUMBER
  //     "1": "Test Location", ------> UNIT NAME
  //     "2": "11", -----------------> STREET NUMBER
  //     "3": "Test Street", --------> STREE NAME
  //     "4": "Test Suburb", --------> SUBURB
  //     "5": "Test Metro", ---------> METRO / MUNICIPALITY
  //     "6": "Test City", ----------> CITY
  //     "7": "1234", ---------------> POST CODE
  //     "8": "Test State", ---------> PROVINCE / STATE
  //     "9": "Test Country" --------> COUNTRY
  //   },
  //   "confirm_address": true
  // }

  try {
    const { addressDetails } = args;
    const addressParams = {
      building_description_id: addressDetails.buildingDescriptionId || '',
      building_floor_number_id: addressDetails.buildingFloorNumberId || '',
      unit: addressDetails.unit || '',
      address_fields: {
        0: addressDetails.addressFields.unitNumber || '',
        1: addressDetails.addressFields.unitName || '',
        2: addressDetails.addressFields.streetNumber || '',
        3: addressDetails.addressFields.streetName || '',
        4: addressDetails.addressFields.suburb || '',
        5: addressDetails.addressFields.metro || '',
        6: addressDetails.addressFields.city || '',
        7: addressDetails.addressFields.postalCode || '',
        8: addressDetails.addressFields.province || '',
        9: addressDetails.addressFields.country || '',
      },
      map: {
        lat: addressDetails.lat || 0,
        lng: addressDetails.lng || 0,
        formatted_address: `${addressDetails.addressFields.unitNumber || ''}, ${addressDetails.addressFields.unitName || ''} ${addressDetails.addressFields.streetNumber || ''} ${addressDetails.addressFields.streetName || ''} ${addressDetails.addressFields.suburb || ''} ${addressDetails.addressFields.metro || ''} ${addressDetails.addressFields.city || ''} ${addressDetails.addressFields.postalCode || ''} ${addressDetails.addressFields.province || ''} ${addressDetails.addressFields.country || ''}`,
        address_components: []
      },
      confirm_pin: true,
      confirm_address: true,
    };

    const existingAddress = await getAddress({ searchTerm: addressParams.map.formatted_address, paging: { page: 1, pageSize: 100 } }).then();

    logger.debug(`Found ${existingAddress.addresses.length} matches: ${existingAddress}`);

    if (existingAddress && existingAddress.addresses.length > 0) {
      return {
        success: true,
        message: 'Existing address found, matching the address selected',
        id: existingAddress.addresses[0].id,
        fullAddress: existingAddress.addresses[0].formatted_address
      };
    }

    //not found create it
    const apiResponse = await lasecApi.Customers.createNewAddress(addressParams).then();

    if (apiResponse) {
      return {
        success: apiResponse.status === 'success',
        message: apiResponse.status === 'success' ? 'Address added successfully' : 'Could not add new address.',
        id: apiResponse.status === 'success' ? apiResponse.payload.id : 0,
        fullAddress: apiResponse.status === 'success' ? addressParams.map.formatted_address : ''
      };
    }

    return {
      success: false,
      message: 'No Response from API',
      id: 0,
      fullAddress: ''
    };

  } catch (ex) {
    logger.error(`ERROR CREATING ADDRESS::  ${ex}`);
    return {
      success: false,
      message: ex,
      id: 0,
    };
  }
};

interface ILasecGetPlaceParams { placeId: string, lat?: number, lng?: number }
const getPlaceDetails = async (args: ILasecGetPlaceParams) => {
  const apiResponse = await lasecApi.Customers.getPlaceDetails(args.placeId);

  logger.debug(`Results from Google GetPlaceDetails 🌍`, { apiResponse })

  if (apiResponse && apiResponse.status === 'OK') {
    const addressObj = {
      streetName: '',
      streetNumber: '',
      suburb: '',
      city: '',
      metro: '',
      province: '',
      postalCode: '',
      country: '',
      lat: args.lat || 0,
      lng: args.lng || 0,
    };

    apiResponse.result.address_components.forEach((comp: any) => {
      if (comp.types.includes('street_number')) addressObj.streetNumber = comp.long_name;
      if (comp.types.includes('route')) addressObj.streetName = comp.long_name;
      if (comp.types.includes('sublocality') || comp.types.includes('sublocality_level_1')) addressObj.suburb = comp.long_name;
      if (comp.types.includes('locality')) addressObj.city = comp.long_name;
      if (comp.types.includes('administrative_area_level_2')) addressObj.metro = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) addressObj.province = comp.long_name;
      if (comp.types.includes('postal_code')) addressObj.postalCode = comp.long_name;
      if (comp.types.includes('country')) addressObj.country = comp.long_name;
    });

    return addressObj;
  }

  return {
    streetName: '',
    streetNumber: '',
    suburb: '',
    city: '',
    metro: '',
    province: '',
    postalCode: '',
    lat: args.lat || 0,
    lng: args.lng || 0
  };
};

const getRepCodesForFilter = async () => {
  const teamsPayload = await LasecAPI.Teams.list().then();
  if (teamsPayload.status === "success") {
    const { items } = teamsPayload.payload || [];
    logger.debug(`SALES TEAM:: ${JSON.stringify(items[0])}`);
    const teams = items.map((sales_team) => {
      return {
        id: sales_team.id,
        name: sales_team.sales_team_id,
      };
    });

    return teams;
  }
}

const getRepCodesForLoggedInUser = async () => {

  let me = await getLoggedIn360User().then();

  logger.debug(`LOGGED IN USER DATA ${JSON.stringify(me)}`);

  const teams = me.sales_team_ids.map((team: any) => {
    return {
      id: team,
      name: team,
      title: team,
    };
  });

  return teams;
}

const getUsersRepCodes = async () => {

  const { user } = global;

  logger.debug(`LOGGED IN USER DATA ${JSON.stringify(user)}`);

  return [];

}

const getClientComments = async (args) => {

  logger.debug(`FIND COMMENTS:: ${JSON.stringify(args)}`);

  const comments = await CRMClientComment.find({ client: args.clientId }).sort({ when: -1 });

  logger.debug(`COMMENTS:: ${JSON.stringify(comments)}`);

  return comments;
}

const saveComment = async (args) => {

  logger.debug(`NEW COMMENT:: ${JSON.stringify(args)}`);

  try {
    let newComment = new CRMClientComment({
      who: global.user._id,
      client: args.clientId,
      comment: args.comment,
      when: new Date()
    });

    await newComment.save().then();

    return {
      success: true,
      message: 'Comment successfully saved.'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error saving comment.'
    }
  }
}

const deleteComment = async (args) => {

  logger.debug(`DELETE COMMENT:: ${JSON.stringify(args)}`);

  try {

    const comment = await CRMClientComment.findByIdAndDelete(args.commentId);

    logger.debug(`DELETED COMMENT:: ${JSON.stringify(comment)}`);

    return {
      success: comment ? true : false,
      message: comment ? 'Comment successfully deleted.' : 'Could not delete this comment'
    }
  } catch (error) {
    return {
      success: false,
      message: 'Error deleting comment.'
    }
  }
}

const updateClientSpecialRequirements = async (args) => {
  try {
    let updateParams = { special_requirements: args.requirement == 'No special requirements set.' ? '' : args.requirement }
    const apiResponse = await lasecApi.Customers.UpdateClientSpecialRequirements(args.id, updateParams);

    return {
      success: apiResponse.success,
      message: apiResponse.success ? 'Special requirements updated successfully.' : 'Error updating special requirments.'
    };
  }
  catch (ex) {
    logger.error(`ERROR UPDATING CLIENT DETAILS::  ${ex}`);
    throw new ApiError('Error updating client details. Please try again');
  }
}

export default {
  LasecAddress: {
    building_description: async (address: LasecAddress) => {

      if (address.building_description && address.building_description.length > 0) return address.building_description

      if (lodash.isNil(address)) return null;
      if (lodash.isNil(address.building_description_id)) return "";

      let build_id = 0;
      try {
        build_id = address.building_description_id
      } catch (pErr) {
        logger.warn("Could not parse building id as integer", { address, error: pErr });
        return "";
      }

      let building_description_id = address.building_description_id;

      try {
        let result_rows: any[] = await mysql(`
          SELECT
            floor_number as description
          FROM
            BuildingFloorNumber WHERE buildingfloornumberid = ${building_description_id}`, 'mysql.lasec360').then();
        logger.debug(`LasecAddress.building_description`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].description || "";

        logger.warn(`LasecAddress.building_description no DB result`);
        return "";
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return ""
      }
    },
    linked_companies_count: async (address: LasecAddress): Promise<number> => {
      let count = 0;

      if (lodash.isNil(address)) return count;
      if (lodash.isNil(address.id)) return count;

      const query = ``

      try {
        let result_rows: any[] = await mysql(query, 'mysql.lasec360').then();
        logger.debug(`LasecAddress linked_companies_count`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].description || "";

        logger.warn(`LasecAddress linked_companies_count no DB result`);
        return count;
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return count
      }
    },
    linked_clients_count: async (address: LasecAddress): Promise<number> => {
      let count = 0;

      if (lodash.isNil(address)) return count;
      if (lodash.isNil(address.id)) return count;

      const query = `
      SELECT
        COUNT(*) as linked_customers
      FROM
        Address as a inner join Customer as c
          on a.addressid  = CAST(c.delivery_address_id as unsigned)
        WHERE a.addressid = ${parseInt(address.id)};`;

      try {
        let result_rows: any[] = await mysql(query, 'mysql.lasec360').then();
        logger.debug(`LasecAddress linked_clients_count`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].linked_customers || 0;

        logger.warn(`LasecAddress  no DB result`);
        return count;
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return count
      }
    },
    linked_sales_orders_count: async (address: LasecAddress): Promise<number> => {
      let count = 0;

      if (lodash.isNil(address)) return count;
      if (lodash.isNil(address.id)) return count;

      const query = `
      SELECT
        COUNT(*) linked_sales_orders_count
      FROM
        Address as a inner join SalesOrder as s
          on a.addressid  = CAST(s.delivery_address_id as unsigned)
      WHERE a.addressid = ${parseInt(address.id)};
      `;

      try {
        let result_rows: any[] = await mysql(query, 'mysql.lasec360').then();
        logger.debug(`LasecAddress linked_sales_orders_count`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].linked_sales_orders_count || 0;

        logger.warn(`LasecAddress linked_sales_orders_count no DB result`);
        return count;
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return count
      }
    },
  },
  LasecDocument: {
    owner: async ({ owner }) => {
      if (ObjectId.isValid(owner)) {
        const _owner = await User.findById(owner).then();
        logger.debug(`OWNER:: ${owner} ${_owner ? _owner.email : 'no-owner'}`);
        return _owner;
      }
    }
  },
  CRMClientComment: {
    id: ({ id, _id }) => id || _id,
    who: async ({ who }) => {
      if (ObjectId.isValid(who)) {
        return User.findById(who);
      }
    }
  },
  LasecCRMClient: {
    availableBalance: async (parent: any, { currentBalance = 0 }) => currentBalance,
  },
  LasecNewClient: {
    customer: async (parent) => {
      logger.debug('Finding new Customer for LasecNewClient', parent);

      if (parent.customer && parent.customer.id) return getCustomerById(parent.customer.id);

      return {
        id: '',
        registeredName: ''
      };
    }
  },
  LasecCRMCustomer: {
    customerClass: async (parent) => {
      if (parent.classId) {
        try {
          const customerClass = getCustomerClassById(parent.classId);
          return customerClass.name;
        } catch (dbError) {
          return parent.customerClass;
        }
      }
      return parent.customerClass;
    },
    currencyDisplay: (customerObject) => {
      let code = '???', symbol = '?';
      if (customerObject) {
        code = customerObject.currencyCode || code;
        symbol = customerObject.currencySymbol || symbol;
      }

      return `${code} (${symbol})`;
    },
    documents: async (parent) => {
      return getCustomerDocuments({ id: parent.id });
    },
    registeredName: (parent) => {
      return parent.registered_name || parent.registeredName
    },
    deliveryAddress: (parent: LasecCRMCustomer) => {
      if (!parent.deliveryAddress) {
        parent.deliveryAddress = 'Not Available'
      }

      return parent.deliveryAddress;
    },
    deliveryAddressId: (parent: LasecCRMCustomer) => {
      if (!parent.deliveryAddressId) {
        parent.deliveryAddressId = -1
      }

      return parent.deliveryAddressId
    }
  },
  Query: {
    LasecGetClientList: async (obj: any, args: GetClientsParams) => {
      return getClients(args);
    },
    LasecGetClientDetail: async (obj, args) => {
      return getClient(args);
    },
    LasecGetClientComments: async (obj, args) => {
      return getClientComments(args);
    },
    LasecGetCustomerRoles: async (obj, args) => {
      return getCustomerRoles(args);
    },
    LasecGetCustomerClass: async (obj, args) => {
      return getCustomerClass(args);
    },
    LasecGetFacultyList: async () => {
      return getFacultyList();
    },

    LasecGetCustomerType: async () => {
      return getCustomerTypeList();
    },

    LasecGetCustomerLineManagerOptions: async (obj, args) => {
      return getCustomerLineManagerOptions(args);
    },

    LasecGetCustomerClassById: async (obj, args) => {
      return getCustomerClassById(args.id);
    },
    LasecGetCustomerRanking: async (object, args) => {
      return getCustomerRanking(args);
    },
    LasecGetCustomerRankingById: async (object, args) => {
      switch (args.id) {
        case "1": return {
          id: '1',
          name: 'A - High Value'
        };
        case "2": return {
          id: '2',
          name: 'B - Medium Value',
        };
        case "3":
        default: return {
          id: '3',
          name: 'C - Low Value',
        };
      }

    },
    LasecGetCustomerCountries: async (object: anty, params: any) => {
      return getCustomerCountries();
    },
    LasecGetCustomerRepCodes: async (object, args) => {
      return getCustomerRepCodes(args);
    },
    LasecGetCustomerDocuments: async (object, args) => {
      return getCustomerDocuments(args);
    },
    LasecSalesTeams: async () => {
      return getRepCodesForLoggedInUser();
    },
    LasecGetCustomerFilterLookup: async (object, args) => {
      switch (args.filterBy) {
        case 'country': {
          return getCustomerCountries(args);
        }
        case 'activity_status': {
          return [
            { id: 'activated', name: 'Active' },
            { id: 'unfinished', name: 'Unfinished' },
            { id: 'deactivated', name: 'Deactivated' },
          ];
        }
        case 'quote_type': {
          return [
            { id: 'normal', name: 'Normal' },
            { id: 'unknown', name: 'Unknown' },
          ];
        }
        case 'order_status': {
          return [
            { id: '1', name: 'Open Order' },
            { id: '2', name: 'Open Back Order' },
            { id: '3', name: 'Released Back Order' },
            { id: '4', name: 'In Warehouse' },
            { id: '9', name: 'Completed' },
            { id: '\\', name: 'Cancelled' },
            { id: 'S', name: 'Suspense' },
          ];
        }
        case 'quote_status': {
          return [
            { id: 'Draft - Pending Submission', name: 'Draft - Pending Submission' },
            { id: 'Draft - Awaiting Approval', name: 'Draft - Awaiting Approval' },
            { id: 'Draft - Approved', name: 'Draft - Approved' },
            { id: 'Draft - Declined', name: 'Draft - Declined' },
            // { id: 'awaitingFreight', name: 'Draft - Awaiting Freight' },

            { id: 'Open - Submitted Quote', name: 'Open - Submitted Quote' },
            { id: 'Open - Under Assessement', name: 'Open - Under Assessement' },
            { id: 'Open - Budget Timeline', name: 'Open - Budget Timeline' },
            { id: 'Open - Price Negotiation', name: 'Open - Price Negotiation' },
            { id: 'Open - Awaiting PO', name: 'Open - Awaiting PO' },
            { id: 'Open - PO Received', name: 'Open - PO Received' },

            { id: 'Lost - Price', name: 'Lost - Price' },
            { id: 'Lost - No Funds', name: 'Lost - No Funds' },
            { id: 'Lost - No Stock', name: 'Lost - No Stock' },
            { id: 'Lost - No Info', name: 'Lost - No Info' },
            { id: 'Lost - Lead Time', name: 'Lost - Lead Time' },
            { id: 'Lost - Other', name: 'Lost - Other' },

            { id: 'Accepted', name: 'Accepted' },
            { id: 'Accepted - Fully', name: 'Accepted - Fully' },
            { id: 'Accepted - Partially', name: 'Accepted - Partially' },
            { id: 'Accepted - Jobcard', name: 'Accepted - Jobcard' },

            { id: 'Expired', name: 'Expired' },
            { id: 'Expired - Waiting Feedback', name: 'Expired - Waiting Feedback' },
            { id: 'Expired - Waiting Budget', name: 'Expired - Waiting Budget' },

            { id: 'Deleted', name: 'Deleted' },
          ];
        }
        case 'order_type': {
          return [
            { id: 'Normal', name: 'Normal' },
            { id: 'Appro', name: 'Appro' },
            { id: 'Standing Order 3', name: 'Standing Order 3' },
            { id: 'Standing Order 4', name: 'Standing Order 4' },
            { id: 'DNPS', name: 'DNPS' },
            { id: 'Consolidation', name: 'Consolidation' },
          ];
        }
        case 'company_sales_team': {
          return getLasecSalesTeamsForLookup();
        }
        case 'rep_code': {
          return getRepCodesForFilter();
        }
        case 'sales_team_id': {
          return getRepCodesForLoggedInUser();
        }
        case 'user_sales_team_id': {
          return getRepCodesForLoggedInUser();
        }
        case 'users_repcodes': {
          return getUsersRepCodes();
        }
        default: {
          return [];
        }
      }
    },
    LasecGetCurrencyLookup: async (object, args) => {
      try {
        const currencies = await queryAsync(`SELECT currencyid as id, code, name, symbol, spot_rate, web_rate FROM Currency`, 'mysql.lasec360').then();
        logger.debug(`CURRENCIES - ${JSON.stringify(currencies)}`);
        return currencies.map(currency => { return { id: currency.code, name: currency.name } });

      } catch (err) {
        logger.debug(`ERROR GETTING CURRENCIES`);
        return []
      }
    },
    LasecGetPersonTitles: async (object, args) => {
      return getPersonTitles(args);
    },
    LasecGetPersonTitleById: async (object, args) => {
      return getPersonTitle(args);
    },
    LasecGetCustomerList: async (obj, args) => {
      return getCustomerList(args);
    },
    LasecGetOrganisationList: async (obj, args) => {
      return getOrganisationList(args);
    },
    LasecGetCustomerJobTypes: async (obj, args) => {
      return getCustomerJobTypes(args);
    },
    LasecGetCustomerJobTypeById: async (obj, args) => {
      const jobtypes = await getCustomerJobTypes().then()

      const lookupItem = lodash.find(jobtypes, { id: args.id });

      return lookupItem;
    },
    /**
      Returns the currently cached object that is associated with the new client onboarding
      screen.  The data can be used in the context of an existing client that is either
      unfinished or deactivated.

      id - The id of the object to load.  if the id can be parsed as a number it will load
       the remote client object from the Lasec API.  This data is merged with the
       new object id that is in the cache

      reset - If true, the current data will be reset in the cache and a default new
       customer object is returned
     */
    LasecGetNewClient: async (obj: any, args: { id?: string, reset?: boolean }) => {

      logger.debug(`[LasecGetNewClient] NEW CLIENT PARAMS:: ${JSON.stringify(args)}`);
      let existingCustomer: any = null;
      let remote_fetched: boolean = false;
      let remote_client: any = lodash.cloneDeep(DEFAULT_NEW_CLIENT);
      let hash;

      const cacheLifeSpan = 60 * 60 * 12; //12 hours

      hash = Hash(`__LasecNewClient::${global.user._id}`);


      //check if the call requires a clean slate
      if (args.reset === true) {
        await setCacheItem(hash, lodash.cloneDeep(remote_client), cacheLifeSpan).then();
        logger.debug(`Reset requested - new client data cache data overwrite`, { remote_client: remote_client });
        return lodash.cloneDeep(remote_client);
      }

      let cachedClient = await getCacheItem(hash).then(); //get whatever is in the cache;
      let hasCached = !iz.nil(cachedClient);

      logger.debug(`CompanyResolver.ts LasecGetNewClient => CACHED CLIENT ${hasCached === true ? `FOUND [last fetch: ${cachedClient.fetched ? moment(cachedClient.fetched).toString() : 'NO FETCHED TIME STAMP'}]` : 'NONE'}`, { cachedClient });

      //there is no cache and there is no ID, just return the new blank item
      if (hasCached === false && !args.id) {
        //set the cache item and return the new empty state
        await setCacheItem(hash, remote_client, cacheLifeSpan).then();
        return remote_client;
      }

      //there is an id, we need to check whether or not we need
      //to fetch the remote data
      if (args.id) {
        let intcheck = false;
        let objectIdCheck = false;

        let must_fetch = true; //by default we enable a fetch of a remote record
        //before we fetch the existing customer, check if our cache item has an id that matches
        //the arg.id if we have a cached item.
        //if the cached item is fresh or recently modified we don't fetch the remote,
        //as it could overwrite our current changes.
        if (hasCached === true) {
          if (cachedClient.clientId && cachedClient.clientId === args.id) {
            //we already have the remote client loaded we want to work on
            if (cachedClient.updated) {
              if (moment(cachedClient.updated).add(5, "minutes").isAfter(moment())) {
                //this cached record was updated less than 5 minutes ago, don't fetch a fresh one
                must_fetch = false;
              }
            }
            if (cachedClient.fetched) {
              if (cachedClient)
                if (moment(cachedClient.fetched).add(15, "minutes").isAfter(moment())) {
                  must_fetch = false;
                }
            }
          }
        }

        if (must_fetch === true) {
          try {
            //we check if the id can be parsed as an int even it is a string.  the remote api stores the ids as long integers
            intcheck = parseInt(args.id) > 0;
          } catch (parseErr) { }

          if (!intcheck) {
            try {
              objectIdCheck = ObjectID.isValid(args.id); //no integer, see if we have a object ID here
            } catch (objectCheckErr) { }
          }

          if (intcheck === true && objectIdCheck === false) {
            logger.debug(`Fetching remote customer data for client id: ${args.id}`)
            existingCustomer = await getClient({ id: args.id });
            logger.debug(`Response for Client Id ${args.id} Result`, { existingCustomer });
            //sanity check
            if (existingCustomer && existingCustomer.id === args.id) {
              remote_fetched = true;
              logger.debug('mapping existing customer data to api client data object 🔀')
              remote_client.id = existingCustomer.id || '';

              remote_client.fetched = new Date().valueOf();
              remote_client.remote_id = existingCustomer.id;

              remote_client.personalDetails.title = existingCustomer.title || '1';
              remote_client.personalDetails.firstName = existingCustomer.firstName || '';
              remote_client.personalDetails.lastName = existingCustomer.lastName || '';
              remote_client.personalDetails.country = existingCustomer.country || '';
              remote_client.personalDetails.repCode = existingCustomer.salesTeam || '';
              remote_client.personalDetails.accountType = existingCustomer.accountType || '';

              remote_client.contactDetails.emailAddress = existingCustomer.emailAddress || '';
              remote_client.contactDetails.confirmEmail = existingCustomer.emailAddress || '';
              remote_client.contactDetails.alternateEmail = existingCustomer.alternateEmail || '';
              remote_client.contactDetails.confirmAlternateEmail = existingCustomer.alternateEmail || '';
              remote_client.contactDetails.mobileNumber = existingCustomer.mobileNumber || '';
              remote_client.contactDetails.alternateMobile = existingCustomer.alternateMobile || '';
              remote_client.contactDetails.officeNumber = existingCustomer.officeNumber || '';
              remote_client.contactDetails.alternateOfficeNumber = existingCustomer.alternateOfficeNumber || '';
              remote_client.contactDetails.prefferedMethodOfContact = existingCustomer.prefferedMethodOfContact || '';


              remote_client.jobDetails.jobTitle = existingCustomer && existingCustomer.jobTitle ? existingCustomer.jobTitle.trim() : '';
              remote_client.jobDetails.salesTeam = existingCustomer.customer.salesTeam || '';
              remote_client.jobDetails.clientDepartment = existingCustomer.customer.department || '';
              remote_client.jobDetails.ranking = existingCustomer.customer.ranking || '';
              remote_client.jobDetails.customerClass = existingCustomer.customer.customerClass || '';
              remote_client.jobDetails.faculty = existingCustomer.customer.faculty || '';
              remote_client.jobDetails.customerType = existingCustomer.customer.accountType || '';
              remote_client.jobDetails.lineManager = existingCustomer.lineManager || '';
              remote_client.jobDetails.jobType = existingCustomer.jobType || '';

              const roles = await getCustomerRoles().then();
              const employeeRole = roles.find((t: any) => (t.id == existingCustomer.jobType));
              remote_client.jobDetails.jobTypeLabel = employeeRole ? employeeRole.name : existingCustomer.jobType;

              remote_client.customer.id = existingCustomer.customer.id || '';
              remote_client.customer.registeredName = existingCustomer.customer.registeredName || '';
              remote_client.organization.id = (existingCustomer.organization && existingCustomer.organization.id) ? existingCustomer.organization.id : '';
              remote_client.organization.name = (existingCustomer.organization && existingCustomer.organization.name) ? existingCustomer.organization.name : '';

              remote_client.address.physicalAddress.id = existingCustomer.customer.physicalAddressId || '';
              remote_client.address.physicalAddress.fullAddress = existingCustomer.customer.physicalAddress || '';
              remote_client.address.deliveryAddress.id = existingCustomer.customer.deliveryAddressId || '';
              remote_client.address.billingAddress.id = existingCustomer.customer.deliveryAddressId || '';
              remote_client.address.deliveryAddress.fullAddress = existingCustomer.customer.deliveryAddress || '';
              remote_client.address.billingAddress.fullAddress = existingCustomer.customer.billingAddress || '';

              logger.debug(`Mapped Item Api Client Data`, { apiClient: remote_client });
            }
          }

          //if we have an object id, load another cached "New Client" object
          if (objectIdCheck === true) {
            logger.warn("🟠 Object Id lookup not supported yet");
          }
        }
      }

      let client_to_return = { ...remote_client };

      if (hasCached === true) {

        if (remote_fetched === true && cachedClient.id && cachedClient.id !== existingCustomer.id) {
          client_to_return = { ...remote_client }
        }

        //we have a cached item and remote fetched item.
        if (remote_fetched === true && cachedClient.id && cachedClient.id === existingCustomer.id) {
          logger.debug(`IDS MATCH:: ${cachedClient.personalDetails.id} ${existingCustomer.id} and merging`);

          client_to_return = {
            ...remote_client,
            ...cachedClient
          };

          client_to_return.id = remote_client.id;
          client_to_return.jobDetails.jobTitle = client_to_return.jobDetails.jobTitle.trim();
          client_to_return.updated = new Date().valueOf();
          logger.debug(`MERGED CLIENT:: ${JSON.stringify(client_to_return)}`);
        }
        //we did not fetch a remote item, we have a cache at the ready
        if (remote_fetched === false) client_to_return = { ...cachedClient };



      } else {
        //no cache available
        client_to_return.clientDocuments = await getCustomerDocuments({ id: 'new', uploadContexts: ['lasec-crm::new-company::document'] }).then();
      }

      setCacheItem(hash, client_to_return, cacheLifeSpan).then();

      return client_to_return;

    },
    LasecGetAddressById: async (obj: any, args: { id: string }): Promise<LasecAddress> => {

      let result = await lasecApi.Customers.getAddress({ filter: { ids: [args.id] } }).then();

      if (result.items && result.items.length === 1) {
        return result.items[0];
      }

      return null;
    },
    LasecGetAddress: async (obj: any, args: { searchTerm: string, paging: Reactory.IPagingRequest }) => {
      const search_results = await getAddress(args);

      return {
        paging: search_results.paging,
        addresses: search_results.addresses.map((address: LasecAddress) => {
          /**
           * {
              "id": "35593",
              "building_description_id": "6",
              "building_floor_number_id": "1",
              "province_id": "",
              "country_id": "",
              "formatted_address": "Portion 163, Farm 811 1 Main Tesselaarsdal Overberg District Municipality Caledon 7523 Western Cape South Africa",
              "lat": "0.000000",
              "lng": "0.000000",
              "created_by": "Werner Weber",
              "last_edited_by": "Werner Weber"
            },
          */

          return {
            ...address,
            fullAddress: address.formatted_address,
            map: {
              lat: address.lat,
              long: address.lng,
            }
          }
        })
      }
    },
    LasecGetPlaceDetails: async (obj, args) => {
      return getPlaceDetails(args);
    },
  },
  Mutation: {
    LasecUpdateClientDetails: async (obj, args) => {
      logger.debug(`UPDATING CLIENT DETAILS WITH ARGS ${JSON.stringify(args)}`);
      return updateClientDetail(args);
    },
    LasecCreateNewOrganisation: async (onj, args) => {
      return createNewOrganisation(args);
    },
    LasecUploadDocument: async (obj, args) => {
      return uploadDocument(args);
    },
    LasecDeleteNewClientDocuments: async (obj, args) => {
      return deleteDocuments(args);
    },
    LasecUpdateNewClient: async (obj: any, args: { id: string, newClient: any }) => {

      const { newClient } = args;
      logger.debug('Updating new client address details with input', { args });
      // logger.debug('Updating new client address details with input', { newClient });

      let touched = false;
      let hash;
      hash = Hash(`__LasecNewClient::${global.user._id}`);

      let _newClient = await getCacheItem(hash).then();

      if (isNil(newClient.personalDetails) === false && Object.keys(newClient.personalDetails).length > 0) {
        if (deepEquals(newClient.personalDetails, _newClient.personalDetails) === false) {
          touched = true;
          _newClient.personalDetails = { ..._newClient.personalDetails, ...newClient.personalDetails };
        }
      }

      if (isNil(newClient.contactDetails) === false && Object.keys(newClient.contactDetails).length > 0) {
        if (deepEquals(newClient.contactDetails, _newClient.contactDetails) === false) {
          touched = true;
          _newClient.contactDetails = { ..._newClient.contactDetails, ...newClient.contactDetails };
        }
      }

      if (isNil(newClient.jobDetails) === false && Object.keys(newClient.jobDetails).length > 0) {

        if (deepEquals(newClient.jobDetails, _newClient.jobDetails) === false) {
          touched = true;
          _newClient.jobDetails = { ..._newClient.jobDetails, ...newClient.jobDetails };

          const roles = await getCustomerRoles().then();
          const employeeRole = roles.find((t: any) => t.id == _newClient.jobDetails.jobType);
          _newClient.jobDetails.jobTypeLabel = employeeRole ? employeeRole.name : _newClient.jobDetails.jobType;

          _newClient.jobDetails.faculty = "Science";
          _newClient.jobDetails.customerType = "Science";

        }
      }

      if (isNil(newClient.customer) === false && Object.keys(newClient.customer).length > 0) {

        if (deepEquals(newClient.customer, _newClient.customer) === false) {
          touched = true;
          _newClient.customer = { ..._newClient.customer, ...newClient.customer };
        }
      }

      if (isNil(newClient.organization && Object.keys(newClient.organization).length > 0) === false) {
        if (deepEquals(newClient.organization, _newClient.organization) === false) {
          touched = true;
          _newClient.organization = { ..._newClient.organization, ...newClient.organization };
        }
      }

      if (isNil(newClient.address && Object.keys(newClient.address).length > 0) === false) {
        if (deepEquals(newClient.address, _newClient.address) === false) {
          touched = true;
          _newClient.address = {
            physicalAddress: { ..._newClient.address.physicalAddress, ...newClient.address.physicalAddress },
            deliveryAddress: { ..._newClient.address.deliveryAddress, ...newClient.address.deliveryAddress },
          };
        }
      }

      logger.debug('New Client Details', _newClient, 'debug');

      if (touched) {
        _newClient.clientId = newClient.id;
        _newClient.updated = new Date().valueOf()
        await setCacheItem(hash, _newClient, 60 * 60 * 12).then();
      }

      return _newClient;
    },
    LasecUpdateCustomerCompany: async (obj: any, args: any) => {

      logger.debug(`UPDATING CUSTOMER DETAILS (COMPANY) --  ${JSON.stringify(args)}`);

      return { success: true, message: 'Updated successfully' };

    },
    LasecCreateNewClient: async (obj: any, args: { id: string, newClient: LasecNewClientInput }) => {

      let hash = Hash(`__LasecNewClient::${global.user._id}`);
      const _newClient: LasecNewClientInput = await getCacheItem(hash).then();

      logger.debug(`Current Data Stored In NewClientCache:\n ${JSON.stringify({ client_data: _newClient, newClientParam: args.newClient }, null, 2)}`)



      let response: NewClientResponse = {
        client: _newClient,
        success: true,
        messages: [
        ],
      };

      let isExistingClient = false;
      let existing_client_id = null;

      //check if the customer exist using email address
      if (iz.email(args.newClient.contactDetails.emailAddress) === true) {
        const customer_ids: string[] = await mysql(`SELECT customerid, first_name, surname FROM Customer C where C.email = '${args.newClient.contactDetails.emailAddress.trim()}';`, 'mysql.lasec360').then()
        if (customer_ids.length > 0) {
          if (customer_ids.length > 1) throw new ApiError(`Multiple Email Addresses are registered with email ${args.newClient.contactDetails.emailAddress}`);
          existing_client_id = customer_ids[0];
          if (iz.nil(existing_client_id) === false) {
            isExistingClient = true;
          }
        }
      } else {
        throw new ApiError("User contact details does not have a valid email address");
      }

      if (isExistingClient === true) {
        // CLIENT EXISTS AND IS DEACTIVATED - REACTIVATE CLIENT
        logger.debug(`Existing customer with id found ${existing_client_id} using parameters tp update customer`);
        if (args.id) {
          try {
            const updateArgs = {

            }
            //Patch the remote data with the data from the form input
            await updateClientDetail({
              clientInfo: {
                clientId: existing_client_id,
                accountType: _newClient.personalDetails.accountType,
                alternateEmail: _newClient.contactDetails.alternateEmail,
                email: _newClient.personalDetails.emailAddress,
                country: _newClient.personalDetails.country,
                title: _newClient.personalDetails.title,
                alternateOfficeNumber: _newClient.contactDetails.alternateOfficeNumber,
                clientDepartment: _newClient.jobDetails.clientDepartment,
                clientClass: _newClient.jobDetails.customerClass,
                repCode: _newClient.jobDetails.salesTeam,
                customerType: _newClient.jobDetails.customerType,
                faculty: _newClient.jobDetails.faculty,
                firstName: _newClient.personalDetails.firstName,
                jobTitle: _newClient.jobDetails.jobTitle,
                jobType: _newClient.jobDetails.jobType,
                lastName: _newClient.personalDetails.lastName,
                lineManager: _newClient.personalDetails.lineManager,
                mobileNumber: _newClient.contactDetails.mobileNumber,
                officeNumber: _newClient.contactDetails.officeNumber,
                ranking: _newClient.jobDetails.ranking
              }
            });
            //toggle the active status
            await mysql(`
            UPDATE Customer SET
              activity_status = 'active',
              organisation_id = ${args.newClient.organization.id},
              company_id = '${args.newClient.customer.id}'
            WHERE customerid = ${existing_client_id}`, 'mysql.lasec360').then()

            response.client = args;
          } catch (setStatusError) {
            logger.error("Error Setting The Status and Customer details", setStatusError);
            response.client = args;
            response.messages = ['There was an error reactivating this client.'];
            response.success = false;
          }

          return response;
        }
      }

      //Not an existing customer we can create the customer
      logger.debug(`No existing customer with email ${args.newClient.contactDetails.emailAddress} found, creating new from args`, { newClient: _newClient })

      const { post, URIS } = lasecApi;
      /**
       *
       *
       * $this->CustomerCreateInfo = array(
        "title_id" => array("Required" => "Yes", "MaxLength" => "45", "ErrorField" => "Title", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "first_name" => array("Required" => "Yes", "MaxLength" => "150", "ErrorField" => "First name", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "surname" => array("Required" => "Yes", "MaxLength" => "150", "ErrorField" => "Surname", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "role_id" => array("Required" => "Yes", "MaxLength" => "45", "ErrorField" => "Role", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "office_number" => array("Required" => "Yes", "MaxLength" => "45", "ErrorField" => "Office number", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "alternate_office_number" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "Office number", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "mobile_number" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "Mobile number", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "email" => array("Required" => "Yes", "MaxLength" => "150", "ErrorField" => "Email", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "confirm_email" => array("Required" => "Yes", "MaxLength" => "150", "ErrorField" => "Confirm Email", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => "email"),
            "alternate_email" => array("Required" => "No", "MaxLength" => "150", "ErrorField" => "Email", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "onboarding_step_completed" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "modified" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "", "Value" => $this->DateTimeNow, "Convert" => false, "Lookup" => false, "Matches" => false),
            "created" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "", "Value" => $this->DateTimeNow, "Convert" => false, "Lookup" => false, "Matches" => false),
            "account_type" => array("Required" => "Yes", "MaxLength" => "45", "ErrorField" => "Account type", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "sales_team_id" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "Customer class", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "company" => array("Required" => "No", "MaxLength" => "45", "ErrorField" => "Company", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "ranking_id" => array("Required" => "Yes", "MaxLength" => "45", "ErrorField" => "Ranking", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "department" => array("Required" => "Yes", "MaxLength" => "150", "ErrorField" => "Department", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "country" => array("Required" => "No", "MaxLength" => "50", "ErrorField" => "Department", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false),
            "customer_class_id" => array("Required" => "No", "MaxLength" => "150", "ErrorField" => "Department", "Value" => "", "Convert" => false, "Lookup" => false, "Matches" => false)
            );
       *
       */



      const _map = {
        'personalDetails.title': 'title_id',
        'personalDetails.firstName': "first_name",
        'personalDetails.lastName': "surname",
        'personalDetails.country': "country",
        'personalDetails.accountType': 'account_type',
        'personalDetails.repCode': 'sales_team_id',

        'contactDetails.officeNumber': 'office_number',
        'contactDetails.alternateModile': 'alternate_office_number',
        'contactDetails.mobileNumber': 'mobile_number',
        'contactDetails.emailAddress': 'email',
        'contactDetails.confirmEmail': 'confirm_email',
        'contactDetails.alternateEmail': 'alternate_email',

        'jobDetails.jobTitle': 'role_id',
        'jobDetails.clientDepartment': 'department',
        'jobDetails.ranking': 'ranking_id',
        'jobDetails.customerClass': 'customer_class_id',

        'organization.id': { key: 'oranisation_id', transform: (v: string) => Number.parseInt(`${v}`) },
        'address.physicalAddress.id': 'physical_address_id',
        'address.deliveryAddress.id': 'delivery_address_id',
      };

      let customer: any = null;

      let customerCreated = false;
      let inputData: any;

      const doCreate = async () => {
        try {
          inputData = om.merge(_newClient, _map);
          inputData.onboarding_step_completed = 6;
          inputData.activity_status = 'active';

          logger.debug(`🟠 Create new client on LasecAPI using input data:`, inputData)
          customer = await post(URIS.customer_create.url, inputData, null, true).then()
          logger.debug(`👀 Result in creating user`, customer);

          return customer;
        }
        catch (postError) {
          logger.error("Error Setting The Status and Customer details", postError);
          response.messages.push({ text: `Could not create the customer ${postError.message}`, type: 'error', inAppNotification: true });

          return null;
        }
      };

      const doStatusUpdate = async () => {

        try {
          logger.debug(`🟠 Updating user activity and organization and company details status complete via mysql`, { organization: _newClient.organization, customer: _newClient.customer });
          const update_result = await mysql(`
            UPDATE Customer SET
              activity_status = 'active',
              organisation_id = ${_newClient.organization.id},
              company_id = '${_newClient.customer.id}'
            WHERE customerid = ${customer.id};`, 'mysql.lasec360').then()
          logger.debug(`🟢 Updated user activity status complete`, update_result);

          response.messages.push({ text: `Client ${args.newClient.contactDetails.emailAddress} activity status set to active`, type: 'success', inAppNotification: true });

        } catch (setStatusError) {
          logger.error("Error Setting The Status and Customer details", setStatusError);
          response.messages.push({ text: `Could not set the activity status: ${setStatusError.message}`, })
        }
      }

      customer = await doCreate();

      if (customer && customer.id && Number.parseInt(`${customer.id}`) > 0) {
        customer = { ...inputData, ...customer };
        customerCreated = Boolean(customer && customer.id);


        if (customerCreated === true) {
          response.messages.push({ text: `Client ${customer.first_name} ${customer.surname} created on LASEC CRM id ${customer.id}`, type: 'success', inAppNotification: true });
          /***
           * set addresses for the customer
           * */
          const { deliveryAddress, physicalAddress } = _newClient.address;
          if (Number.parseInt(physicalAddress.id) > 0) {
            try {
              logger.debug(`Set physical address ${physicalAddress.fullAddress}`);
            } catch (exc) {
              logger.error(`Could not save the physical address against the customer`, exc);
              response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} could not set physical address`, type: 'warning', inAppNotification: true });
            }
          }


          if (Number.parseInt(deliveryAddress.id) > 0) {
            try {
              logger.debug(`Set delivery address ${deliveryAddress.fullAddress}`);
            } catch (exc) {
              logger.error(`Could not save the delivery address against the customer`, exc);
              response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} could not set delivery address`, type: 'warning', inAppNotification: true });
            }
          }

          try {
            //set upload files if any and clear local cache (delete files)
            let upload_promises = [];

            let clientDocuments: any[] = await getCustomerDocuments({ id: 'new', uploadContexts: ['lasec-crm::new-company::document'] }).then();
            if (clientDocuments.length > 0) {
              upload_promises = clientDocuments.map((documentInfo) => {
                return lasecApi.Documents.upload(documentInfo, customer)
              });

              let uploadResults = await Promise.all(upload_promises).then();
              uploadResults.forEach((uploadResult) => {
                logger.debug(`♻ File upload result: FILE SYNCH ${uploadResult}`)
                uploadResult.document.uploadContext = `lasec-crm::client::document::${customer.id}`;
                uploadResult.document.save();

                if (uploadResult.success === false) {
                  response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} encountered errors while uploading ${uploadResult.document.filename} to Lasec API`, type: 'warning', inAppNotification: true });
                }
              });
            }
          } catch (exc) {
            logger.debug(`Could; not upload documents for the customer`, exc);
            response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} encountered errors while uploading documents`, type: 'warning', inAppNotification: true });
          }

          try {
            await doStatusUpdate();

          } catch (setStatusException) {
            logger.error(`Could set the client status`, setStatusException);
            response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} encountered errors while setting activity status`, type: 'warning', inAppNotification: true });
          }

          setCacheItem(hash, lodash.cloneDeep(DEFAULT_NEW_CLIENT), 60 * 60 * 12);

        } else {
          response.messages.push({ text: `Could not create the new client on Lasec API`, type: 'success', inAppNotification: true });
        }
      } else {
        response.success = false;
        response.messages.push({
          text: 'Could not save user',
          description: 'Could not save user'
        });
      }

      return response;
    },
    LasecCreateNewAddress: async (obj, args) => {
      return createNewAddress(args);
    },
    LasecEditAddress: async (obj: any, args: { address_input: LasecAddress }): Promise<LasecAddressUpdateResponse> => {
      try {

        let address: LasecAddress = null;
        const { address_input } = args;

        if (address_input === null || address_input == undefined) throw new ApiError(`Address Input Cannot be empty`);
        if (address_input.id === null || address_input.id === undefined ) throw new ApiError("Address does not have id")

        const unit_segment = `${address_input.unit_number || ""} ${address_input.unit_name || ""} `;
        const street_segment = `${address_input.street_number || ""} ${address_input.street_name || ""} `;
        const region_segment = `${address_input.suburb || ""} ${address_input.city || ""} ${address_input.postal_code || ""} `;
        const country_segment = `${address_input.country_name || ""}`

        let formatted_address = "";

        if (unit_segment.trim() !== "") {
          formatted_address = `${unit_segment} `
        }

        if (street_segment.trim() !== "") {
          formatted_address = `${formatted_address}${street_segment} `
        }

        if (region_segment.trim() !== "") {
          formatted_address = `${formatted_address}${region_segment} `
        }

        if (country_segment.trim() !== "") {
          formatted_address = `${formatted_address}${region_segment} `
        }


        const me: Lasec360User = await getLoggedIn360User();

        let query = `
          SELECT
            formatted_address,
            building_description_id,
            building_floor_number_id,
            province_id,
            country_id,
            lat,
            lng
          FROM Address
          WHERE addressid = ${address_input.id}`

        let existing_data: any = {
          formatted_address: formatted_address,
          building_description_id: 0,
          building_floor_number_id: 0,
          province_id: null,
          country_id: null,
          lat: 0,
          lng: 0
        };

        try {
          //read the record
          const find_result: any = await mysql(query, 'mysql.lasec360').then();
          logger.debug(`results for lookup of address ${address_input.id}`, {find_result})
          if (find_result && find_result.length === 1) {
            return existing_data = { ...find_result[0]}
          }

        } catch (read_error) {
          logger.error(`Could not read data from the database ${read_error.message}`, { read_error });
          throw new ApiError('Could not read the data');
        }

        query = `
          UPDATE Address
          SET
            formatted_address = '${formatted_address || existing_data.formatted_address}',
            building_description_id = '${address_input.building_description_id || existing_data.building_description_id}',
            building_floor_number_id = '${address_input.building_floor_number_id || existing_data.building_floor_number_id}',
            province_id = '${address_input.province_id || existing_data.province_id}',
            country_id = '${address_input.country_id || existing_data.country_id}',
            lat = ${address_input.lat || existing_data.lat},
            lng = ${address_input.lng || existing_data.lng},
            last_edited_by_staff_user_id = ${me.id}
          WHERE
            addressid = ${address_input.id};`

        try {
          const update_result = await mysql(query, 'mysql.lasec360').then();
          logger.debug("Results from database update", update_result)
          let result = await lasecApi.Customers.getAddress({ filter: { ids: [args.address_input.id] } }).then();

          if (result.items && result.items.length === 1) {
            address = result.items[0];
          }

          return {
            success: true,
            message: `Address #${args.address_input.id} has been updated`,
            address,
          }

        } catch (dbError) {
          logger.error(`Error updating the the address due to a database error`);
        }


      } catch (update_error) {
        logger.error("Could not update the address due to a SQL error", update_error);
        throw update_error;
      }


    },
    LasecDeleteAddress: async (obj: any, args: { address_input: LasecAddress }): Promise<SimpleResponse> => {
      try {

        if (args.address_input === null) throw new ApiError(`address_input cannot be null`);
        if (args.address_input.id === null) throw new ApiError("address_input argument requires id");

        const delete_response = await mysql(`
          UPDATE Address set deleted = 1
          WHERE addressid = ${args.address_input.id};
        `, 'mysql.lasec360').then();

        if (delete_response) {
          logger.debug(`Lasec API Response for Address DELETE`, { delete_response });
          return {
            success: true,
            message: `Address ${args.address_input.id} has been deleted`
          }
        }
      } catch (apiError) {
        logger.error(`Could not delete the Address ${args.address_input.id}`, { apiError });
        throw new ApiError(`Could not delete the Address ${args.address_input.id}`, apiError);
      }

    },
    LasecCRMSaveComment: async (obj, args) => {
      return saveComment(args);
    },
    LasecCRMDeleteComment: async (obj, args) => {
      return deleteComment(args);
    },
    LasecDeactivateClients: async (obj: any, params: { clientIds: string[] }): Promise<SimpleResponse> => {

      let response: SimpleResponse = {
        message: `Deactivated ${params.clientIds.length} clients`,
        success: true
      };

      const deactivation_promises: Promise<any>[] = params.clientIds.map((clientId: string) => {

        const args = {
          clientInfo: {
            clientId,
            clientStatus: 'deactivated'
          },
        }

        return updateClientDetail(args);

      });

      try {
        const results = await Promise.all(deactivation_promises).then();
        let successCount: number, failCount: number = 0;

        results.forEach((patchResult) => {
          if (patchResult.Success === true) successCount += 1;
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
          if (successCount === deactivation_promises.length) {
            response.message = `🥇 Deactivated all ${successCount} clients.`
          }
        }
      } catch (err) {
        response.message = `😬 An error occurred while changing the client status. [${err.nessage}]`;
        logger.error(`🧨 Error deactivating the client account`, err)
      }

      return response;
    },
    LasecUpdateSpecialRequirements: async (obj: any, args: any) => {
      return updateClientSpecialRequirements(args);
    }
  },
};
