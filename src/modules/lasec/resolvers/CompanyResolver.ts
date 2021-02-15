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
  ILasecOrganisation,
  ILasecCreateOrganisationArgs,
  LasecCreateNeworganisationResponse,
} from '../types/lasec';

import { Reactory } from '@reactory/server-core/types/reactory';

import { getLoggedIn360User, getCustomerDocuments } from './Helpers';
import deepEquals from '@reactory/server-core/utils/compare';
import LasecCRMClientJobDetails from '../forms/CRM/Client/JobDetail';
import { queryAsync } from '@reactory/server-core/database/mysql';
import client from '@sendgrid/client';

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
  repCode?: any | any[];
  selectedClient?: any;
};

const getClients = async (params: GetClientsParams, context: Reactory.IReactoryContext) => {
  if (context === null) throw new ApiError(`Context is required`)

  let logged_in: Lasec360User = await getLoggedIn360User(false, context).then();

  if (logged_in === null) throw new ApiError('No Valid Lasec User Logged In');

  const {
    search = "",
    paging = { page: 1, pageSize: 10 },
    filterBy = "any_field",
    orderBy = "lastName",
    orderDirection = "asc",
    iter = 0,
    filter,
    repCode = undefined,
    selectedClient = undefined
  } = params;

  logger.debug(`Getting Clients using search::\n ${JSON.stringify(search, null, 2)}`, {
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
      _filter['sales_team_id'] = filter || logged_in.sales_team_id;
      if (search.trim().length >= 0) _filter.any_field = search;
      break;
    }
    case "country":
    case "company_on_hold":
    case "activity_status": {
      _filter[filterBy] = filter;
      if (search.trim().length >= 0) _filter.any_field = search;
      break;
    }
    case "company_trading_name": {
      _filter[filterBy] = search;
      break;
    };
    case "company_id": {
      _filter[filterBy] = search;
      break;
    };
    case "first_name": {
      _filter["first_name"] = search;
      break;
    };
    case "full_name": {
      _filter["full_name"] = search;
      break;
    }
    case "email": {
      _filter["email"] = search;
      break;
    };
    case "any_field":
    default: {
      _filter.any_field = search || "";
      if (search.length > 0) {
        delete _filter.sales_team_id;
      } else {
        _filter['sales_team_id'] = logged_in.sales_team_id;
      }

      break;
    }
  }
  // NOTE
  // LEAVING THE BELOW FILTER IN PLACE SEEMS TO RESULT IN NO CLIENTS BEING RETURNED

  if (typeof repCode === 'string') {
    _filter.sales_team_id = repCode;
  }

  if (Array.isArray(repCode) && repCode.length > 0) {
    _filter.sales_team_ids = repCode;
  }

  //make sure there is a sales_team_id set, if they aren't specified.
  if (!_filter.sales_team_id && !_filter.sales_team_ids && filterBy === 'any_field' && search.length === 0) {
    _filter.sales_team_id = logged_in.sales_team_id;
  }


  if ((search === undefined || search === null) && (filter === undefined || filter === null)) {
    return {
      paging: pagingResult,
      clients: [],
      repCode: repCode ? { title: repCode, value: repCode } : {},
      selectedClient
    };
  }

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
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1, filter, repCode }, {}, context.user, context.partner).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }

  logger.debug(`Sending query to lasec API with filter`, { filter: _filter })
  const clientResult = await lasecApi.Customers.list({
    filter: _filter,
    //filter: {},
    ordering,
    format: { ids_only: true },
    pagination:
      { enabled: true, page_size: paging.pageSize || 10, current_page: paging.page }
  }, context).then();

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

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: ids }, ordering: {}, pagination: { enabled: false, current_page: paging.page, page_size: paging.pageSize } }, context);
  logger.debug(`Fetched Expanded View for (${clientDetails.items.length}) Clients from API`);
  let clients = [...clientDetails.items];
  clients = clients.map(client => {
    let _client = om(client, {
      'id': 'id',
      'first_name': [{
        "key": 'fullName',
        "transform": (sourceValue: string, sourceObject: any) => `${sourceValue} ${sourceObject.surname}`,
      }, "firstName"],
      'surname': 'lastName',
      'sales_team_id': 'salesTeam',
      'activity_status': { key: 'clientStatus', transform: (sourceValue: string) => `${sourceValue}`.toLowerCase() },
      'email': 'emailAddress',
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
      'duplicate_name_flag': { key: 'isNameDuplicate', transform: (src: boolean) => src === true },
      'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src: boolean) => src === true },
      'company_on_hold': {
        'key': 'customer.customerStatus',
        'transform': (val: true) => (`${val === true ? 'on-hold' : 'not-on-hold'}`)
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
      setCacheItem(cachekeys_10, { paging: { ...result.paging, pageSize: 10, hasNext: true }, clients: lodash.take(result.clients, 10) }, 120, context.partner);
    }

    const cachekeys_5 = `client_list_${search}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: { ...result.paging, pageSize: 5, hasNext: true }, clients: lodash.take(result.clients, 5) }, 120, context.partner);
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
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }, {}, context.user, context.partner).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  // setCacheItem(cachekey, result, 60 * 10);

  logger.debug(`GETCLIENTLIST RETURN  (${result.repCode})`);

  return result;
}

export const getClient = async (params: any, context: Reactory.IReactoryContext) => {

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: [params.id] } }, context);

  let clients = [...clientDetails.items];
  if (clients.length === 1) {

    logger.debug(`CLIENT::: ${JSON.stringify(clients[0])}`);

    let clientResponse: any = om.merge(clients[0], {
      'id': 'id',
      'title_id': ['title', 'titleLabel'],
      'first_name': [{ "key": 'fullName', "transform": (sourceValue: string, sourceObject: any) => `${sourceValue} ${sourceObject.surname}` }, "firstName"],
      'surname': 'lastName',
      'activity_status': { key: 'clientStatus', transform: (sourceValue: string) => `${sourceValue}`.toLowerCase() },
      'email': 'emailAddress',
      'alternate_email': 'alternateEmail',
      'mobile_number': 'mobileNumber',
      'office_number': 'officeNumber',
      'alternate_office_number': 'alternateOfficeNumber',
      'special_notes': 'note',
      'sales_team_id': 'salesTeam',
      'duplicate_name_flag': { key: 'isNameDuplucate', transform: (src: boolean) => src == true },
      'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src: boolean) => src == true },
      'department': ['department', 'jobTitle'],

      'ranking_id': ['customer.ranking', {
        key: 'customer.rankingLabel', "transform": (srcVal: string, srcObj: any) => {
          switch (srcVal) {
            case '1':
              return 'A - High Value';
            case '2':
              return 'B - Medium Value';
            case '3':
              return 'C - Low Value';
            default:
              return 'Unknown Value';
          }
        }
      }],

      // 'faculty': 'faculty',
      'faculty': { 'key': 'faculty', 'transform': (srcVal: string) => srcVal == null ? '' : srcVal },
      // 'customer_type': 'customerType',
      'customer_type': { 'key': 'customerType', 'transform': (srcVal: string) => srcVal == null ? '' : srcVal },

      // 'line_manager_id': 'lineManager',
      'line_manager_id': { 'key': 'lineManager', 'transform': (srcVal: string) => srcVal == '0' || srcVal == '0' ? '' : srcVal },
      // 'line_manager_name': 'lineManagerLabel',
      'line_manager_name': { 'key': 'lineManagerLabel', 'transform': (srcVal: string) => srcVal == null ? '' : srcVal },

      'role_id': 'jobType',
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
      'customer_class_id': 'customer.customerClass',
      'account_type': ['accountType', 'customer.accountType'],
      'company_on_hold': {
        'key': 'customer.customerStatus',
        'transform': (val: boolean) => (`${val === true ? 'On-hold' : 'Active'}`)
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
      let found = await getCacheItem(hashkey, null, 60, context.partner).then();
      logger.debug(`Found Cached Item for LASEC_COMPANY::${clientResponse.customer.id} ==> ${found}`)
      if (found === null || found === undefined) {
        let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [clientResponse.customer.id] } }, context).then()
        // logger.debug(`LASEC_COMPANY DETAILS::${JSON.stringify(companyPayloadResponse.items[0])}`);
        if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
          if (companyPayloadResponse.items.length === 1) {
            let customerObject = {
              ...clientResponse.customer, ...om.merge(companyPayloadResponse.items[0], {
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
                'special_requirements': { key: 'specialRequirements', transform: (srcVal: string) => srcVal == null || srcVal == '' ? 'No special requirements set.' : srcVal },
              })
            };
            // "special_requirements": "specialRequirements"

            setCacheItem(hashkey, customerObject, 10, context.partner);
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
    const titles = await getPersonTitles(context);
    const setTitle = titles.find((t: any) => t.id == clientResponse.titleLabel)
    clientResponse.titleLabel = setTitle ? setTitle.title : clientResponse.titleLabel;

    // SET ROLE STRING VALUE
    const roles = await getCustomerRoles(context).then();
    const employeeRole = roles.find((t: any) => t.id == clientResponse.jobType);
    clientResponse.jobTypeLabel = employeeRole ? employeeRole.name : clientResponse.jobType;

    // CUSTOMER CLASS
    const customerClasses = await getCustomerClass(context).then();
    const customerClass = customerClasses.find((c: any) => c.id == clientResponse.customer.customerClass);

    clientResponse.customerClassLabel = customerClass ? customerClass.name : clientResponse.customer.customerClass;

    // logger.debug(`CompanyResolver.ts getClient(${params.id})`, clientResponse);
    return clientResponse;
  }

  return null;
};



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
const updateClientDetail = async (args: { clientInfo: any }, context: Reactory.IReactoryContext) => {

  logger.debug(`CompanyResolver.ts >> updateClientDetail(args)`, args);

  try {
    const params = args.clientInfo;

    const preFetchClientDetails = await lasecApi.Customers.list({ filter: { ids: [params.clientId] } }, context);

    let clients = [...preFetchClientDetails.items];
    if (clients.length === 1) {

      const client = clients[0];

      let updateParams = {
        // first_name: params.firstName || (client.first_name || ''),
        // first_name: params.personalDetails && params.personalDetails.firstName || (client.first_name || ''),
        first_name: params.firstName ? params.firstName : params.personalDetails && params.personalDetails.firstName || (client.first_name || ''),

        // surname: params.lastName || (client.surname || ''),
        // surname: params.personalDetails && params.personalDetails.lastName || (client.surname || ''),
        surname: params.lastName ? params.lastName : params.personalDetails && params.personalDetails.lastName || (client.surname || ''),

        activity_status: params.clientStatus || (client.activity_status || ''),

        // country: params.country || (client.country || ''),
        country: params.country ? params.country : params.personalDetails && params.personalDetails.country || (client.country || ''),

        // department: params.department || (client.department || 'NONE'),
        department: params.department ? params.department : params.jobDetails && params.jobDetails.department || (client.department || 'NONE'),

        // title_id: client.title_id,
        title_id: params.title ? params.title : params.personalDetails && params.personalDetails.title || (client.title_id || ''),

        // mobile_number: params.mobileNumber || (client.mobile_number || ''),
        mobile_number: params.mobileNumber ? params.mobileNumber : params.contactDetails && params.contactDetails.mobileNumber || (client.mobile_number || ''),

        // office_number: params.officeNumber || (client.office_number || ''),
        office_number: params.officeNumber ? params.officeNumber : params.contactDetails && params.contactDetails.officeNumber || (client.office_number || ''),

        // alternate_office_number: params.alternateNumber || (client.alternate_office_number || ''),
        alternate_office_number: params.alternateNumber ? params.alternateNumber : params.contactDetails && params.contactDetails.alternateNumber || (client.alternate_office_number || ''),

        // email: params.email || (client.email || ''),
        email: params.emailAddress ? params.emailAddress : params.contactDetails && params.contactDetails.emailAddress || (client.email || ''),

        // confirm_email: params.email || (client.email || ''),
        confirm_email: params.confirmEmail ? params.confirmEmail : params.contactDetails && params.contactDetails.confirmEmail || (client.email || ''),

        // alternate_email: params.alternateEmail || (client.alternate_email || ''),
        alternate_email: params.alternateEmail ? params.alternateEmail : params.contactDetails && params.contactDetails.alternateEmail || (client.alternate_email || ''),

        // ranking_id: params.ranking || (client.ranking_id || ''),
        ranking_id: params.ranking || (client.ranking_id || ''), // come back to this

        // account_type: params.accountType || (client.account_type || ''),
        // account_type: params.personalDetails && params.personalDetails.accountType || (client.account_type || ''),
        account_type: params.accountType ? params.accountType : params.personalDetails && params.personalDetails.accountType || (client.account_type || ''),

        // customer_class_id: params.clientClass || (client.customer_class_id || ''),
        // customer_class_id: params.jobDetails && params.jobDetails.customerClass || (client.customer_class_id || ''),
        customer_class_id: params.clientClass ? params.clientClass : params.jobDetails && params.jobDetails.customerClass || (client.customer_class_id || ''),

        // sales_team_id: params.repCode || (client.sales_team || ''),
        // sales_team_id: params.personalDetails && params.personalDetails.repCode || (client.sales_team || ''),
        sales_team_id: params.repCode ? params.repCode : params.jobDetails && params.jobDetails.repCode ? params.jobDetails.repCode : (client.sales_team || ''),


        faculty: params.faculty || (client.faculty || ''),
        customer_type: params.customerType || (client.customer_type || ''),
        line_manager_id: params.lineManager || (client.line_manager_id || ''),
        role_id: params.jobType || (client.role_id || ''),// role_id: client.role_id,

      }

      logger.debug(`UPDATE PARAMS:: ${JSON.stringify(updateParams)}`);

      const apiResponse = await lasecApi.Customers.UpdateClientDetails(params.clientId, updateParams, context);

      if (apiResponse.success && apiResponse.customer) {
        // map customer
        let clientResponse: any = om.merge(apiResponse.customer, {
          'id': 'id',
          'title_id': ['title', 'titleLabel'],
          'first_name': [{
            "key":
              'fullName',
            "transform": (sourceValue: string, sourceObject: any) => `${sourceValue} ${sourceObject.surname}`,
          }, "firstName"],
          'surname': 'lastName',
          'activity_status': { key: 'clientStatus', transform: (sourceValue: string) => `${sourceValue}`.toLowerCase() },
          'email': 'emailAddress',
          'alternate_email': 'alternateEmail',
          'mobile_number': 'mobileNumber',
          'office_number': 'officeNumber',
          'alternate_office_number': 'alternateOfficeNumber',
          'special_notes': 'note',
          'sales_team_id': 'salesTeam',
          'duplicate_name_flag': { key: 'isNameDuplucate', transform: (src: any) => src == true },
          'duplicate_email_flag': { key: 'isEmailDuplicate', transform: (src: any) => src == true },
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
            'transform': (val: boolean) => (`${val === true ? 'on-hold' : 'not-on-hold'}`)
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
          let found = await getCacheItem(hashkey, null, 60, context.partner).then();
          logger.debug(`Found Cached Item for LASEC_COMPANY::${clientResponse.customer.id} ==> ${found}`)
          if (found === null || found === undefined) {
            let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [clientResponse.customer.id] } }, context).then()
            if (companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
              if (companyPayloadResponse.items.length === 1) {

                let customerObject = {
                  ...clientResponse.customer, ...om.merge(companyPayloadResponse.items[0], {
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

                setCacheItem(hashkey, customerObject, 10, context);
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
        const titles = await getPersonTitles(context);
        const setTitle = titles.find((t: any) => t.id == clientResponse.titleLabel)
        clientResponse.titleLabel = setTitle ? setTitle.title : clientResponse.titleLabel;

        // SET ROLE STRING VALUE
        const roles = await getCustomerRoles(context).then();
        const employeeRole = roles.find((t: any) => t.id == clientResponse.jobType);
        clientResponse.jobTypeLabel = employeeRole ? employeeRole.name : clientResponse.clientResponse.jobType;

        // CUSTOMER CLASS

        const customerClasses = await getCustomerClass(context).then();
        const customerClass = customerClasses.find((c: any) => c.id == clientResponse.customer.customerClass);
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

const getCustomerRoles = async (context: Reactory.IReactoryContext) => {

  const cached = await getCacheItem(Hash(LASEC_ROLES_KEY), null, 60, context).then();
  if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerRoles({}, context);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerRoles({ filter: { ids: [...idsResponse.ids] }, pagination: {} }, context);
    if (details && details.items) {
      setCacheItem(Hash(LASEC_ROLES_KEY), details, 60, context.partner);
      return details.items;
    }
  }

  return [];

};

const getCustomerRanking = async (context: Reactory.IReactoryContext) => {

  const cached = await getCacheItem(Hash('LASEC_CUSTOMER_RANKING'), null, 60, context.partner).then();

  if (cached && cached.items) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerRankings({}, context);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerRankings({ filter: { ids: [...idsResponse.ids] }, pagination: {} }, context);
    if (details && details.items) {
      setCacheItem('LASEC_CUSTOMER_RANKING', details, 60, context.partner);
      return details.items;
    }
  }

  return [];

};

const getCustomerClass = async (context: Reactory.IReactoryContext) => {
  //if (cached && cached.items) return cached.items;
  const idsResponse = await lasecApi.Customers.GetCustomerClass({}, context);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerClass({ filter: { ids: [...idsResponse.ids] }, pagination: {} }, context);
    if (details && details.items) {
      setCacheItem(Hash('LASEC_CUSTOMER_CLASS'), details, 60, context);
      return details.items;
    }
  }

  return [];
};

const getFacultyList = async (context: Reactory.IReactoryContext) => {
  try {
    const faculty_list: { faculty: string }[] = await mysql(`SELECT faculty FROM CustomerFaculty ORDER by faculty ASC`, 'mysql.lasec360', undefined, context).then();
    // logger.debug(`Results from Faculty Query`, { faculty_list })

    if (faculty_list && faculty_list.length > 0) {
      return faculty_list.map((faculty_row: { faculty: string }) => ({
        id: faculty_row.faculty,
        key: faculty_row.faculty,
        name: faculty_row.faculty,
        description: faculty_row.faculty,
      }));
    }

    return faculty_list;

  } catch (databaseError) {
    logger.error(`Could not retrieve the Faculty List: ${databaseError.message}`, { databaseError });
    return [];
  }

};

const getCustomerTypeList = async (context: Reactory.IReactoryContext) => {
  try {
    const type_list: { customer_type: string }[] = await mysql(`SELECT type as customer_type FROM CustomerType ORDER by customer_type ASC`, 'mysql.lasec360', undefined, context).then();
    // logger.debug(`Results from CustomerType Query`, { customer_type_list: type_list })

    if (type_list && type_list.length > 0) {
      return type_list.map((customer_type_row: { customer_type: string }) => ({
        id: customer_type_row.customer_type,
        key: customer_type_row.customer_type,
        name: customer_type_row.customer_type,
        description: customer_type_row.customer_type,
      }));
    }

    return type_list;

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

const getCustomerLineManagerOptions = async (params: any, context: Reactory.IReactoryContext) => {
  const response = await lasecApi.Customers.GetCustomerLineManagers(params, context).then();
  if (response.items) {
    return response.items.map(item => {
      return { id: item.line_manager_id, name: item.line_manager_name };
    });
  }

  return [];
};

const getCustomerClassById = async (id: string, context: Reactory.IReactoryContext) => {
  const customerClasses = await getCustomerClass(context).then();
  logger.debug(`Searching in ${customerClasses.length} classes for id ${id}`)
  const found = lodash.find(customerClasses, { id: id });
  return found;
};

const getCustomerCountries = async (context: Reactory.IReactoryContext) => {
  try {
    logger.info("Retrieving countries from remote api")
    let countries = await lasecApi.get(lasecApi.URIS.customer_country.url, undefined, { 'country[]': ['[].id', '[].name'] }, context).then();
    logger.debug("Retrieved and mapped remote data to ", { countries });
    return lodash.uniqWith(countries, lodash.isEqual);
  } catch (countryListError) {
    logger.error("Could not get the country list from the remote API", countryListError);
    return []
  }
};

const getCustomerRepCodes = async (context: Reactory.IReactoryContext) => {
  const idsResponse = await lasecApi.Customers.GetRepCodes({}, context);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetRepCodes({ filter: { ids: [...idsResponse.ids] }, pagination: {} }, context);
    if (details && details.items) {
      return details.items;
    }
  }

  return [];
};


const CLIENT_TITLES_KEY = "LasecClientTitles";

const getPersonTitles = async (context: Reactory.IReactoryContext) => {
  logger.debug(`CompanyResolver.ts getPersonTitles()`);

  const cached = await getCacheItem(Hash(CLIENT_TITLES_KEY), null, 60, context.partner).then();
  if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetPersonTitles({}, context);

  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetPersonTitles({ filter: { ids: [...idsResponse.ids] }, pagination: { enabled: false, page_size: 10 } }, context);
    if (details && details.items) {
      setCacheItem(Hash(CLIENT_TITLES_KEY), details, 60, context.partner);
      return details.items;
    }
  }

  return [];

}

const getPersonTitle = async (params: any, context: Reactory.IReactoryContext) => {
  logger.debug(`Looking for title with id ${params.id}`)
  const titles = await getPersonTitles(context).then();

  if (titles.length > 0) {
    const found = lodash.find(titles, { id: params.id });
    return found;
  }

  return null;
};

const CLIENT_JOBTYPES_KEY = "LasecClientJobTypesLookup";

const getCustomerJobTypes = async (context: Reactory.IReactoryContext) => {

  const cached = await getCacheItem(Hash(CLIENT_JOBTYPES_KEY), null, 60, context.partner).then();

  if (cached) return cached.items;

  const idsResponse = await lasecApi.Customers.GetCustomerJobTypes({}, context);
  if (isArray(idsResponse.ids) === true && idsResponse.ids.length > 0) {
    const details = await lasecApi.Customers.GetCustomerJobTypes({ filter: { ids: [...idsResponse.ids] }, pagination: {} }, context);
    if (details && details.items) {
      setCacheItem(Hash(CLIENT_JOBTYPES_KEY), details, 60, context.partner);
      return details.items;
    }
  }
  return [];
}

const getLasecSalesTeamsForLookup = async (context: Reactory.IReactoryContext) => {
  logger.debug(`GETTING SALES TEAMS`);
  // const salesTeamsResults = await lasecApi.get(lasecApi.URIS.groups, undefined).then();
  const teamsPayload = await LasecAPI.Teams.list(context).then();
  logger.debug(`SALES TEAM PAYLOAD :: ${JSON.stringify(teamsPayload)}`);
  if (teamsPayload.status === "success") {
    const { items } = teamsPayload.payload || [];
    logger.debug(`SALES TEAM:: ${JSON.stringify(items[0])}`);
    const teams = items.map((sales_team: any) => {
      return {
        id: sales_team.id,
        name: sales_team.sales_team_id,
      };
    });

    return teams;
  }

  return [];
}

const getCustomerList = async (params: any, context: Reactory.IReactoryContext) => {

  const { search = "   ", paging = { page: 1, pageSize: 10 }, filterBy = "", iter = 0, filter, orderBy = 'name', orderDirection = "asc" } = params;

  logger.debug(`Getting Customers using search ${search}`, { search, paging, filterBy, iter });

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let _filter: any = {};

  _filter[filterBy] = filter || search;

  if (isString(search) === false && filter === undefined) {
    return {
      paging: pagingResult,
      customers: []
    }
  };

  const cachekey = Hash(`company_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = await getCacheItem(cachekey, null, 60, context.partner);

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
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1 }, {}, context.user, context.partner).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }


  logger.debug(`Calling companies api`);

  let filterParams: any = {
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

  filterParams.ordering[orderBy] = orderDirection;

  const companyResult = await lasecApi.Company.list(filterParams, context).then();

  logger.debug(`Returning ids ${companyResult.ids}`);

  let ids: string[] = [];

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

  const companyDetails = await lasecApi.Company.list({ filter: { ids: ids } }, context);
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

  //customers = orderBy(customers, ['registeredName', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    customers,
  };

  if (result.paging.pageSize >= 10 && result.paging.hasNext === true) {
    if (result.paging.pageSize === 20) {
      const cachekeys_10 = `company_list_${search}_page_${paging.page || 1}_page_size_10`.toLowerCase();
      setCacheItem(cachekeys_10, { paging: { ...result.paging, pageSize: 10, hasNext: true }, clients: lodash.take(result.customers, 10) }, 120, context.partner);
    }

    const cachekeys_5 = `company_list_${search}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: { ...result.paging, pageSize: 5, hasNext: true }, clients: lodash.take(result.customers, 5) }, 120, context.partner);
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
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }, {}, context.user, context.partner).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  setCacheItem(cachekey, result, 60 * 10, context);

  return result;

};

const getCustomerById = async (id: string, context: Reactory.IReactoryContext) => {
  const companyDetails = await lasecApi.Company.list({ filter: { ids: [id] } }, context).then();
  logger.debug(`Fetched Expanded View for (${companyDetails.items.length}) Companies from API`);
  if (companyDetails.items[0]) return companyDetails.items[0];
};

const getOrganisationList = async (params: any, context: Reactory.IReactoryContext) => {

  const { search = "", paging = { page: 1, pageSize: 10 }, filterBy = "", iter = 0, filter } = params;

  logger.debug(`Getting Organization using search ${search}`, { search, paging, filterBy, iter });

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  let _filter: any = {};

  _filter[filterBy] = filter || search;

  if (isString(search) === false && filter === undefined) return {
    paging: pagingResult,
    organisations: []
  };

  const cachekey = Hash(`organization_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = await getCacheItem(cachekey, null, 60, context.partner);

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
      }`, { search, filterBy, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1 }, {}, context.user, context.partner).then();
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

  const organisationResult = await lasecApi.Organisation.list(filterParams, context).then();

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
      }`, { search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1, filter }, {}, context.user, context.partner).then();
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }
  }

  setCacheItem(cachekey, result, 60 * 10, context.partner);

  return result;

};


const createNewOrganisation = async (args: ILasecCreateOrganisationArgs, context: Reactory.IReactoryContext): Promise<LasecCreateNeworganisationResponse> => {

  try {

    const apiResponse = await lasecApi.Organisation.createNew({
      customer_id: args.customerId,
      name: args.name,
      description: args.description,
    }, context).then();

    logger.debug(`RESOLVER API RESPONSE:: ${JSON.stringify(apiResponse)}`);

    return {
      success: apiResponse.status === 'success',
      message: '',
      organisation: {
        id: apiResponse.payload.id,
        name: args.name,
        description: args.description
      }
    }
  }
  catch (ex) {
    logger.error(`ERROR CREATING ORGANISATION::  ${ex}`);
    return {
      success: false,
      message: '',
      organisation: {
        id: null,
        name: args.name,
        description: args.description,
      }

    }
  }
};


// Gets a filename extension.
const getExtension = (filename: string) => {
  return filename.split('.').pop();
}

const uploadRemote = async (file: Reactory.IReactoryFile, customer: any, context: Reactory.IReactoryContext): Promise<Reactory.IReactoryFile> => {
  try {
    //set upload files if any and clear local cache (delete files)
    const uploadResult = await lasecApi.Documents.upload(file, customer, false, context);
    logger.debug(`♻ File upload result: FILE SYNCH ${uploadResult.timeline.map((tl) => `\n\t * ${tl.timestamp} => ${tl.message}`)}`);

    return file;

  } catch (exc) {
    logger.debug(`Could; not upload documents for the customer`, exc);
    throw exc;
  }
}

const allowedExts = ['txt', 'pdf', 'doc', 'zip'];
const allowedMimeTypes = ['text/plain', 'application/msword', 'application/x-pdf', 'application/pdf', 'application/zip'];

const uploadDocument = async (args: any, context: Reactory.IReactoryContext) => {

  return new Promise(async (resolve, reject) => {

    logger.debug(`UPLOAD FILE ARGS:: ${JSON.stringify(args)}`);

    const { clientId, file } = args;
    const { createReadStream, filename, mimetype, encoding } = await file;
    const stream: NodeJS.ReadStream = createReadStream();
    const randomName = `${sha1(new Date().getTime().toString())}.${getExtension(filename)}`;
    const link = `${process.env.CDN_ROOT}content/files/${randomName}`;


    let hadStreamError: boolean = null;
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
      const fileStats: fs.Stats = fs.statSync(saveToPath);

      const reactoryFile: any = {
        id: new ObjectID(),
        filename,
        mimetype,
        alias: randomName,
        partner: new ObjectID(context.partner.id),
        owner: context.user,
        uploadedBy: context.user,
        size: fileStats.size,
        hash: Hash(link),
        link: link,
        path: 'content/files/',
        uploadContext: args.uploadContext || 'lasec-crm::company-document',
        public: false,
        published: false,
      };

      // NEW CLIENT DOCUMENTS
      if (reactoryFile.uploadContext === 'lasec-crm::new-company::document') {
        if (clientId && clientId == 'new_client') {
          // NEW CLIENT
          reactoryFile.uploadContext = `lasec-crm::client::document::${clientId}::${context.user._id}`;
        } else {
          // INCOMPLETE CLIENT
          reactoryFile.uploadContext = `lasec-crm::client::document::${clientId}`;
          // reactoryFile.uploadContext = `lasec-crm::new-company::document`;
        }
      }

      // VIEW CLIENT DOCUMENTS
      if (reactoryFile.uploadContext === 'lasec-crm::client::document') {
        // EXISTING CLIENT
        reactoryFile.uploadContext = `lasec-crm::client::document::${clientId}`;
      }


      const savedDocument = new ReactoryFileModel(reactoryFile);

      uploadRemote(savedDocument, clientId, context).then((fileResult) => {
        logger.debug(`File has been synched with remote API`, { fileResult });
        fileResult.save();
        resolve(fileResult)
      }).catch((syncError) => {
        logger.debug(`File could not be synched with remote API`, { syncError });
        savedDocument.save();
        resolve(savedDocument);
      });

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

const deleteDocuments = async (args: any, context: Reactory.IReactoryContext) => {

  logger.debug(`FILE DELETE ARGS: ${JSON.stringify(args)}`);
  const { clientId, fileIds } = args;
  const _fileIds = [...fileIds];

  if (clientId) {
    const clientDetails = await lasecApi.Customers.list({ filter: { ids: [clientId] } }, context);
    if (clientDetails && clientDetails.items.length > 0) {
      let client = clientDetails.items[0];
      if (client.document_ids.length > 0) {
        const docIds = [...client.document_ids]; // clone to edit

        fileIds.forEach((fileId: string) => {
          const indexOfId = docIds.indexOf(fileId);
          if (indexOfId > -1) {
            docIds.splice(indexOfId, 1);
            _fileIds.splice(fileIds.indexOf(fileId), 1);
          }
        });

        const updateResult = await lasecApi.Documents.updateDocumentIds(docIds, clientId, context);

        logger.debug(`UPDATE RESULT:: ${JSON.stringify(updateResult)}`);
        logger.debug(`FILE IDS:: ${_fileIds}`);

      }
    }
  }


  // let files = await ReactoryFileModel.find({ id: { $in: fileIds } }).then()
  let files = await ReactoryFileModel.find({ id: { $in: _fileIds } }).then()

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

const getAddress = async (args: { searchTerm: string, paging: Reactory.IPagingRequest }, context: Reactory.IReactoryContext): Promise<LasecPagedAddressResults> => {

  const { paging } = args;

  try {
    logger.debug(`GETTING ADDRESS:: ${JSON.stringify(args)}`);
    const addressIds = await lasecApi.Customers.getAddress({ filter: { any_field: args.searchTerm }, format: { ids_only: true }, pagination: { enabled: true, page_size: paging.pageSize || 10, current_page: paging.page } }, context);

    let _ids = [];
    if (isArray(addressIds.ids) === true && addressIds.ids.length > 0) {
      _ids = [...addressIds.ids];
      const addressDetails = await lasecApi.Customers.getAddress({ filter: { ids: _ids }, pagination: { enabled: true, page_size: paging.pageSize || 10, current_page: paging.page } }, context);
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

const createNewAddress = async (args, context: Reactory.IReactoryContext) => {
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
        formatted_address: `${addressDetails.addressFields.unitNumber || ''} ${addressDetails.addressFields.unitName || ''} ${addressDetails.addressFields.streetNumber || ''} ${addressDetails.addressFields.streetName || ''} ${addressDetails.addressFields.suburb || ''} ${addressDetails.addressFields.metro || ''} ${addressDetails.addressFields.city || ''} ${addressDetails.addressFields.postalCode || ''} ${addressDetails.addressFields.province || ''} ${addressDetails.addressFields.country || ''}`,
        address_components: []
      },
      confirm_pin: true,
      confirm_address: true,
    };

    const existingAddress = await getAddress({ searchTerm: addressParams.map.formatted_address, paging: { page: 1, pageSize: 100 } }, context).then();

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
    const apiResponse = await lasecApi.Customers.createNewAddress(addressParams, context).then();

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
const getPlaceDetails = async (args: ILasecGetPlaceParams, context: Reactory.IReactoryContext) => {
  const apiResponse = await lasecApi.Customers.getPlaceDetails(args.placeId, context);

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

const getRepCodesForFilter = async (context: Reactory.IReactoryContext) => {
  const teamsPayload = await LasecAPI.Teams.list(context).then();
  if (teamsPayload.status === "success") {
    const { items } = teamsPayload.payload || [];
    logger.debug(`SALES TEAM:: ${JSON.stringify(items[0])}`);
    const teams = items.map((sales_team: any) => {
      return {
        id: sales_team.id,
        name: sales_team.sales_team_id,
      };
    });

    return teams;
  }
}

const getRepCodesForLoggedInUser = async (context: Reactory.IReactoryContext) => {

  let me = await getLoggedIn360User(false, context).then();

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

const getUsersRepCodes = async (context: Reactory.IReactoryContext): Promise<any[]> => {

  const { user } = context;

  logger.debug(`LOGGED IN USER DATA ${JSON.stringify(user)}`);

  return [];

}

const getClientComments = async (args: any, context: Reactory.IReactoryContext) => {
  logger.debug(`FIND COMMENTS:: ${JSON.stringify(args)}`);
  const comments: any[] = await CRMClientComment.find({ client: args.clientId }).sort({ when: -1 });

  return {
    id: args.clientId,
    comments: comments.map(comment => {
      return {
        id: comment._id,
        who: comment.who,
        comment: comment.comment,
        when: comment.when,
      }
    })
  }
}

const saveComment = async (args: any, context: Reactory.IReactoryContext) => {

  logger.debug(`NEW COMMENT:: ${JSON.stringify(args)}`);

  try {
    let newComment = new CRMClientComment({
      who: context.user._id,
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

const deleteComment = async (args: any) => {

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

const updateClientSpecialRequirements = async (args: any, context: Reactory.IReactoryContext) => {
  try {
    let updateParams = { special_requirements: args.requirement == 'No special requirements set.' ? '' : args.requirement }
    const apiResponse = await lasecApi.Customers.UpdateClientSpecialRequirements(args.id, updateParams, context);

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
    building_description: async (address: LasecAddress, args: any, context: Reactory.IReactoryContext) => {

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
            BuildingFloorNumber WHERE buildingfloornumberid = ${building_description_id}`, 'mysql.lasec360', undefined, context).then();
        logger.debug(`LasecAddress.building_description`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].description || "";

        logger.warn(`LasecAddress.building_description no DB result`);
        return "";
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return ""
      }
    },
    linked_companies_count: async (address: LasecAddress, args: any, context: Reactory.IReactoryContext): Promise<number> => {
      let count = 0;

      if (lodash.isNil(address)) return count;
      if (lodash.isNil(address.id)) return count;

      const query = ``

      try {
        let result_rows: any[] = await mysql(query, 'mysql.lasec360', undefined, context).then();
        logger.debug(`LasecAddress linked_companies_count`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].description || "";

        logger.warn(`LasecAddress linked_companies_count no DB result`);
        return count;
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return count
      }
    },
    linked_clients_count: async (address: LasecAddress, args: any, context: Reactory.IReactoryContext): Promise<number> => {
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
        let result_rows: any[] = await mysql(query, 'mysql.lasec360', undefined, context).then();
        logger.debug(`LasecAddress linked_clients_count`, { result_rows });

        if (result_rows.length === 1 && result_rows[0]) return result_rows[0].linked_customers || 0;

        logger.warn(`LasecAddress  no DB result`);
        return count;
      } catch (sql_error) {
        logger.error("Error returning the building address detail");
        return count
      }
    },
    linked_sales_orders_count: async (address: LasecAddress, args: any, context: Reactory.IReactoryContext): Promise<number> => {
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
        let result_rows: any[] = await mysql(query, 'mysql.lasec360', undefined, context).then();
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
    owner: async ({ owner }: any) => {
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
    customer: async (parent: any, obj: any, context: Reactory.IReactoryContext) => {
      logger.debug('Finding new Customer for LasecNewClient', parent);

      if (parent.customer && parent.customer.id) return getCustomerById(parent.customer.id, context);

      return {
        id: '',
        registeredName: ''
      };
    },
    clientDocuments: async (parent: any, obj: any, context: Reactory.IReactoryContext) => {

      // if(parent.clientDocuments && Array.isArray(parent.clientDocuments) === true) return parent.clientDocuments;

      let _result = await getCustomerDocuments({ id: 'new_client', uploadContexts: ['lasec-crm::new-company::document'] }, context).then();
      return _result.documents || [];
    },
  },
  LasecCRMCustomer: {
    customerClass: async (parent: any, obj: any, context: Reactory.IReactoryContext) => {
      if (parent.classId) {
        try {
          const customerClass: any = getCustomerClassById(parent.classId, context);
          return customerClass.name;
        } catch (dbError) {
          return parent.customerClass;
        }
      }
      return parent.customerClass;
    },
    currencyDisplay: (customerObject: any, obj: any, context: Reactory.IReactoryContext) => {
      let code = '???', symbol = '?';
      if (customerObject) {
        code = customerObject.currencyCode || code;
        symbol = customerObject.currencySymbol || symbol;
      }

      return `${code} (${symbol})`;
    },
    documents: async (parent: any, obj: any, context: Reactory.IReactoryContext) => {
      return getCustomerDocuments({ id: parent.id }, context);
    },
    registeredName: (parent: any, obj: any, context: Reactory.IReactoryContext) => {
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
    LasecGetClientList: async (obj: any, args: GetClientsParams, context: Reactory.IReactoryContext) => {
      return getClients(args, context);
    },
    LasecGetClientDetail: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getClient(args, context);
    },
    LasecGetClientComments: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getClientComments(args, context);
    },
    LasecGetCustomerRoles: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerRoles(context);
    },
    LasecGetCustomerClass: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerClass(context);
    },
    LasecGetFacultyList: async () => {
      return getFacultyList();
    },
    LasecGetCustomerType: async () => {
      return getCustomerTypeList();
    },
    LasecGetCustomerLineManagerOptions: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerLineManagerOptions(args, context);
    },
    LasecGetCustomerClassById: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerClassById(args.id, context);
    },
    LasecGetCustomerRanking: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerRanking(context);
    },
    LasecGetCustomerRankingById: async (object: any, args: any, context: Reactory.IReactoryContext) => {
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
    LasecGetCustomerCountries: async (object: any, params: any, context: Reactory.IReactoryContext) => {
      return getCustomerCountries(context);
    },
    LasecGetCustomerRepCodes: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerRepCodes(args);
    },
    LasecGetCustomerDocuments: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerDocuments(args, context);
    },
    LasecSalesTeams: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getRepCodesForLoggedInUser(context);
    },
    LasecGetCustomerFilterLookup: async (object: any, args: any, context: Reactory.IReactoryContext) => {
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
          return getLasecSalesTeamsForLookup(context);
        }
        case 'rep_code': {
          return getRepCodesForFilter(context);
        }
        case 'sales_team_id': {
          return getRepCodesForLoggedInUser(context);
        }
        case 'user_sales_team_id': {
          return getRepCodesForLoggedInUser(context);
        }
        case 'users_repcodes': {
          return getUsersRepCodes(context);
        }
        default: {
          return [];
        }
      }
    },
    LasecGetCurrencyLookup: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      try {
        const currencies = await queryAsync(`SELECT currencyid as id, code, name, symbol, spot_rate, web_rate FROM Currency`, 'mysql.lasec360', undefined, context).then();
        logger.debug(`CURRENCIES - ${JSON.stringify(currencies)}`);
        return currencies.map((currency: any) => { return { id: currency.code, name: currency.name } });

      } catch (err) {
        logger.debug(`ERROR GETTING CURRENCIES`);
        return []
      }
    },
    LasecGetPersonTitles: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getPersonTitles(context);
    },
    LasecGetPersonTitleById: async (object: any, args: any, context: Reactory.IReactoryContext) => {
      return getPersonTitle(args, context);
    },
    LasecGetCustomerList: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerList(args, context);
    },
    LasecGetOrganisationList: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getOrganisationList(args, context);
    },
    LasecGetCustomerJobTypes: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getCustomerJobTypes(args);
    },
    LasecGetCustomerJobTypeById: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      const jobtypes = await getCustomerJobTypes(context).then()
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
    LasecGetNewClient: async (obj: any, args: { id?: string, reset?: boolean }, context: Reactory.IReactoryContext) => {



      logger.debug(`[LasecGetNewClient] NEW CLIENT PARAMS:: ${JSON.stringify(args)}`);
      let existingCustomer: any = null;
      let remote_fetched: boolean = false;
      let remote_client: any = lodash.cloneDeep(DEFAULT_NEW_CLIENT);
      let hash;

      const cacheLifeSpan = 60 * 60 * 12; //12 hours

      hash = Hash(`__LasecNewClient::${context.user._id}`);


      //check if the call requires a clean slate
      if (args.reset === true) {
        await setCacheItem(hash, lodash.cloneDeep(remote_client), cacheLifeSpan, context.partner).then();
        logger.debug(`Reset requested - new client data cache data overwrite`, { remote_client: remote_client });
        return lodash.cloneDeep(remote_client);
      }

      let cachedClient = await getCacheItem(hash, null, 60, context.partner).then(); //get whatever is in the cache;
      let hasCached = !iz.nil(cachedClient);

      logger.debug(`CompanyResolver.ts LasecGetNewClient => CACHED CLIENT ${hasCached === true ? `FOUND [last fetch: ${cachedClient.fetched ? moment(cachedClient.fetched).toString() : 'NO FETCHED TIME STAMP'}]` : 'NONE'}`, { cachedClient });

      //there is no cache and there is no ID, just return the new blank item
      if (hasCached === false && !args.id) {
        //set the cache item and return the new empty state
        await setCacheItem(hash, remote_client, cacheLifeSpan, context.partner).then();
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
            existingCustomer = await getClient({ id: args.id }, context);
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

              const roles = await getCustomerRoles(context).then();
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

      }



      setCacheItem(hash, client_to_return, cacheLifeSpan, context).then();

      return client_to_return;

    },
    LasecGetAddressById: async (obj: any, args: { id: string }, context: Reactory.IReactoryContext): Promise<LasecAddress> => {

      let result = await lasecApi.Customers.getAddress({ filter: { ids: [args.id] } }, context).then();

      if (result.items && result.items.length === 1) {
        return result.items[0];
      }

      return null;
    },
    LasecGetAddress: async (obj: any, args: { searchTerm: string, paging: Reactory.IPagingRequest }) => {
      const search_results = await getAddress(args, context);

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
    LasecGetPlaceDetails: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return getPlaceDetails(args);
    },
  },
  Mutation: {
    LasecUpdateClientDetails: async (obj: any, args: { clientInfo: ClientUpdateInput }, context: Reactory.IReactoryContext) => {
      logger.debug(`UPDATING CLIENT DETAILS WITH ARGS ${args}`);
      return updateClientDetail(args, context);
    },
    LasecCreateNewOrganisation: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return createNewOrganisation(args, context);
    },
    LasecUploadDocument: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return uploadDocument(args, context);
    },
    LasecDeleteNewClientDocuments: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return deleteDocuments(args, context);
    },
    LasecUpdateNewClient: async (obj: any, args: { id: string, newClient: any }, context: Reactory.IReactoryContext) => {

      const { newClient } = args;
      logger.debug(`Updating new client address details with input:\n ${JSON.stringify(newClient, null, 2)}`);
      // logger.debug('Updating new client address details with input', { newClient });

      let touched = false;
      let hash;
      hash = Hash(`__LasecNewClient::${context.user._id}`);

      let _newClient = await getCacheItem(hash, null, 60, context.partner).then();

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

          const roles = await getCustomerRoles(context).then();
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
        await setCacheItem(hash, _newClient, 60 * 60 * 12, context.partner).then();
      }

      return _newClient;
    },
    LasecUpdateCustomerCompany: async (obj: any, args: any) => {

      logger.debug(`UPDATING CUSTOMER DETAILS (COMPANY) --  ${JSON.stringify(args)}`);

      return { success: true, message: 'Updated successfully' };

    },
    LasecCreateNewClient: async (obj: any, args: { id: string, newClient: LasecNewClientInput }, context: Reactory.IReactoryContext) => {

      let hash = Hash(`__LasecNewClient::${context.user._id}`);
      const _newClient: LasecNewClientInput = await getCacheItem(hash, null, 60, context.partner).then();

      logger.debug(`Current Data Stored In NewClientCache:\n ${JSON.stringify({ client_data: _newClient, newClientParam: args.newClient }, null, 2)}`)

      let response: NewClientResponse = {
        client: _newClient,
        success: false,
        messages: [],
      };

      try {

        let isExistingClient = false;
        let existing_client_id = null;

        //check if the customer exist using email address
        if (iz.email(args.newClient.contactDetails.emailAddress) === true) {
          const customer_ids: string[] = await mysql(`SELECT customerid, first_name, surname FROM Customer C where C.email = '${args.newClient.contactDetails.emailAddress.trim()}';`, 'mysql.lasec360', undefined, context).then()
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
              }, context);
              //toggle the active status
              await mysql(`
            UPDATE Customer SET
              activity_status = 'active',
              organisation_id = ${args.newClient.organization.id},
              company_id = '${args.newClient.customer.id}'
            WHERE customerid = ${existing_client_id}`, 'mysql.lasec360', undefined, context).then()

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
            inputData.company_id = _newClient.customer.id,
              inputData.onboarding_step_completed = 6;
            inputData.activity_status = 'active';

            logger.debug(`🟠 Create new client on LasecAPI using input data:\n ${JSON.stringify(inputData, null, 2)}`)
            customer = await post(URIS.customer_create.url, inputData, null, true, context).then()
            logger.debug(`👀 Result in creating user`, customer);

            return customer;
          }
          catch (postError) {
            logger.error("Error Setting The Status and Customer details", postError);
            response.messages.push({ text: 'Error.', description: `Could not create the customer ${postError.message}`, type: 'error', inAppNotification: true });

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
            WHERE customerid = ${customer.id};`, 'mysql.lasec360', undefined, context).then()
            logger.debug(`🟢 Updated user activity status complete`, update_result);

            response.messages.push({ text: '🟢 Success.', description: `Client ${args.newClient.contactDetails.emailAddress} activity status set to active`, type: 'success', inAppNotification: true });

          } catch (setStatusError) {
            logger.error("Error Setting The Status and Customer details", setStatusError);
            response.messages.push({ text: ' Warning.', description: `Could not set the activity status: ${setStatusError.message}`, })
          }
        }

        customer = await doCreate();

        if (customer && customer.id && Number.parseInt(`${customer.id}`) > 0) {
          customer = { ...inputData, ...customer };
          customerCreated = Boolean(customer && customer.id);


          if (customerCreated === true) {
            response.messages.push({ text: 'Client Added.', description: `Client ${customer.first_name} ${customer.surname} created on LASEC CRM id ${customer.id}`, type: 'success', inAppNotification: true });
            /***
             * set addresses for the customer
             * */
            const { deliveryAddress, physicalAddress } = _newClient.address;

            if (Number.parseInt(physicalAddress.id) > 0) {
              try {
                const update_result = await mysql(`
              UPDATE Customer SET
                physical_address_id = '${physicalAddress.id}'                
              WHERE customerid = ${customer.id};`, 'mysql.lasec360', undefined, context).then()

                logger.debug(`Set physical address ${physicalAddress.fullAddress}`);
              } catch (exc) {
                logger.error(`Could not save the physical address against the customer`, exc);
                response.messages.push({ text: 'Warning.', description: `Client ${customer.first_name} ${customer.last_name} could not set physical address`, type: 'warning', inAppNotification: true });
              }
            }


            if (Number.parseInt(deliveryAddress.id) > 0) {
              try {
                logger.debug(`Set delivery address ${deliveryAddress.fullAddress}`);
                await mysql(`
              UPDATE Customer SET
                delivery_address_id = '${deliveryAddress.id}'                
                WHERE customerid = ${customer.id};`, 'mysql.lasec360', undefined, context).then()
              } catch (exc) {
                logger.error(`Could not save the delivery address against the customer`, exc);
                response.messages.push({ text: 'Warning.', description: `Client ${customer.first_name} ${customer.last_name} could not set delivery address`, type: 'warning', inAppNotification: true });
              }
            }

            try {
              //set upload files if any and clear local cache (delete files)
              let upload_promises = [];

              interface client_documents_results {
                id: string
                documents: Reactory.IReactoryFile[]
              }

              let clientDocuments: client_documents_results = await getCustomerDocuments({ id: 'new_client', uploadContexts: ['lasec-crm::new-company::document'] }, context).then();
              let ids: string[] = [];
              if (clientDocuments && clientDocuments.documents) {
                clientDocuments.documents.forEach((doc) => {
                  let linked = false;
                  if (doc.remotes && doc.remotes.length === 1) {
                    ids.push(doc.remotes[0].id.split("@")[0]);
                    linked = true;
                  }

                  doc.uploadContext = `lasec-crm::client::document::${customer.id}`;
                  doc.timeline.push({ timestamp: new Date().valueOf(), message: `File linked to customer on local` })
                  doc.save();
                });

                if (ids.length > 0) {
                  let link_result = await lasecApi.Documents.updateDocumentIds(ids, customer.id, context).then();
                  logger.debug(`LasecCreateNewClient :: result from updating document list. ${JSON.stringify(link_result)}`);
                }
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

            setCacheItem(hash, lodash.cloneDeep(DEFAULT_NEW_CLIENT), 60 * 60 * 12, context.partner);

          } else {
            response.messages.push({ text: `Could not create the new client on Lasec API`, type: 'success', inAppNotification: true });
          }
        } else {

          // {"pagination":{},"ids":[],"items":[],"error":{"office_number":["This field is required"]},"timestamp":"2021-01-27T08:32:59.691Z"}

          let messages = [{ text: 'Error saving customer', description: 'Unknown Error saving customer' }];

          if (customer.error) {
            messages = Object.keys(customer.error).map((k) => {
              let desc = '';

              if (Array.isArray(customer.error[k]) === true) {
                customer.error[k].forEach((e: string) => {
                  desc = `${desc}${k}: ${e}, `;
                })
              }

              return {
                text: k,
                description: desc
              }
            });
          }

          response.success = false;
          response.messages = messages;
        }

      } catch (error) {
        logger.error(`🚨🚨 Error while processing onboarding ${error.message}`);
      }

      return response;
    },
    LasecCreateNewAddress: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return createNewAddress(args, context);
    },
    LasecEditAddress: async (obj: any, args: { address_input: LasecAddress }, context: Reactory.IReactoryContext): Promise<LasecAddressUpdateResponse> => {
      try {

        let address: LasecAddress = null;
        const { address_input } = args;

        if (address_input === null || address_input == undefined) throw new ApiError(`Address Input Cannot be empty`);
        if (address_input.id === null || address_input.id === undefined) throw new ApiError("Address does not have id")

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


        const me: Lasec360User = await getLoggedIn360User(false, context);

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
          const find_result: any = await mysql(query, 'mysql.lasec360', undefined, context).then();
          logger.debug(`results for lookup of address ${address_input.id}`, { find_result })
          if (find_result && find_result.length === 1) {
            return existing_data = { ...find_result[0] }
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
          const update_result = await mysql(query, 'mysql.lasec360', undefined, context).then();
          logger.debug("Results from database update", update_result)
          let result = await lasecApi.Customers.getAddress({ filter: { ids: [args.address_input.id] } }, context).then();

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
    LasecDeleteAddress: async (obj: any, args: { address_input: LasecAddress }, context: Reactory.IReactoryContext): Promise<SimpleResponse> => {
      try {

        if (args.address_input === null) throw new ApiError(`address_input cannot be null`);
        if (args.address_input.id === null) throw new ApiError("address_input argument requires id");

        const delete_response = await mysql(`
          UPDATE Address set deleted = 1
          WHERE addressid = ${args.address_input.id};
        `, 'mysql.lasec360', undefined, context).then();

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
    LasecCRMSaveComment: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return saveComment(args, context);
    },
    LasecCRMDeleteComment: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return deleteComment(args);
    },
    LasecDeactivateClients: async (obj: any, params: { clientIds: string[] }, context: Reactory.IReactoryContext): Promise<SimpleResponse> => {

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

        return updateClientDetail(args, context);

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
    LasecUpdateSpecialRequirements: async (obj: any, args: any, context: Reactory.IReactoryContext) => {
      return updateClientSpecialRequirements(args, context);
    }
  },
};
