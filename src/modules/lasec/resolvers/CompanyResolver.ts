import fs from 'fs';
import path from 'path';
import sha1 from 'sha1';
import lasecApi from '../api';
import moment from 'moment';
import om from 'object-mapper';
import logger from '../../../logging';
import lodash, { isArray, isNil, orderBy, isString } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';
import Hash from '@reactory/server-core/utils/hash';
import { clientFor, execql } from '@reactory/server-core/graph/client';
import ReactoryFile, { IReactoryFile } from '@reactory/server-modules/core/models/CoreFile';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import { getScaleForKey } from 'data/scales';
import { GraphQLUpload } from 'graphql-upload';
import ApiError from 'exceptions';
import { ObjectID, ObjectId } from 'mongodb';
import { urlencoded } from 'body-parser';
import LasecAPI from '@reactory/server-modules/lasec/api';
import CRMClientComment from '@reactory/server-modules/lasec/models/Comment';
import { User } from '@reactory/server-core/models';
import { LasecApiResponse, SimpleResponse } from '../types/lasec';

import { getLoggedIn360User } from './Helpers';

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

const getClients = async (params) => {
  const {
    search = "",
    paging = { page: 1, pageSize: 10 },
    filterBy = "any_field",
    orderBy = "fullName",
    orderDirection = "asc",
    iter = 0,
    filter,
    repCode = undefined
  } = params;

  logger.debug(`Getting Clients using search ${search}`, {
    filter,
    search,
    paging,
    filterBy,
    iter,
    repCode,
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
    case "country":
    case "sales_team_id":
    case "company_on_hold":
    case "activity_status": {
      _filter[filterBy] = filter;
      if (search.trim().length > 0) _filter.any_field = search;
      //_filter.any_field = search;
      break;
    }
    default: {
      _filter[filterBy] = search;
      break;
    }
  }

  //_filter[filterBy] = filter || search;

  if (typeof repCode === 'string') {
    _filter.sales_team_id = repCode;
  }

  if (typeof repCode === 'array' && repCode.length > 0) {
    _filter.sales_team_ids = repCode;
  }

  if (isString(search) === false || search.length < 3 && filter === undefined) return {
    paging: pagingResult,
    clients: []
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
  const clientResult = await lasecApi.Customers.list({ filter: _filter, pagination: { page_size: paging.pageSize || 10, current_page: paging.page }, ordering }).then();

  let ids = [];

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

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${clientDetails.items.length}) Clients from API`);
  let clients = [...clientDetails.items];
  clients = clients.map(client => {
    /**
    * id: "15237"
      title_id: "3"
      first_name: "Theresa"
      surname: "Ruppelt"
      office_number: "021 404 4509"
      alternate_office_number: null
      mobile_number: "none"
      email: "theresa.ruppett@nhls.ac.za"
      confirm_email: "theresa.ruppett@nhls.ac.za"
      alternate_email: null
      onboarding_step_completed: "6"
      role_id: "1"
      ranking_id: "1"
      account_type: "account"
      modified: "2018-06-15T13:01:21.000000Z"
      activity_status: "Active"
      special_notes: null
      sales_team_id: "LAB101"
      organisation_id: "0"
      company_id: "11625"
      delivery_address_id: "14943"
      delivery_address: "Main Rd, Observatory, Cape Town, 7925, South Africa"
      physical_address_id: "14943"
      physical_address: "Main Rd, Observatory, Cape Town, 7925, South Africa"
      currency_id: "1"
      currency_code: "ZAR"
      currency_symbol: "R"
      currency_description: "Rand"
      company_trading_name: "NHLS OF SA"
      company_on_hold: false
      customer_class_id: "80"
      department: null
      created: null
      document_ids: []
      company_account_number: "11625"
      customer_sales_team: "LAB101"
      company_sales_team: "LAB100"
      country: "South Africa"
      billing_address: "Ct,Po box 1038,Sandringham,Gauteng,2000"
     *
     */
    let _client = om(client, {
      'id': 'id',
      'first_name': [{
        "key":
          'fullName',
        "transform": (sourceValue, sourceObject, destinationObject, destinationKey) => `${sourceValue} ${sourceObject.surname}`,
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

    //_client.fullName = `${client.firstName}`

    return _client;
  });

  //clients = orderBy(clients, ['fullName', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
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

  return result;
}

const getClient = async (params) => {

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: [params.id] } });

  /**
   *
   * id: "15237"
      title_id: "3"
      first_name: "Theresa"
      surname: "Ruppelt"
      office_number: "021 404 4509"
      alternate_office_number: null
      mobile_number: "none"
      email: "theresa.ruppett@nhls.ac.za"
      confirm_email: "theresa.ruppett@nhls.ac.za"
      alternate_email: null
      onboarding_step_completed: "6"
      role_id: "1"
      ranking_id: "1"
      account_type: "account"
      modified: "2018-06-15T13:01:21.000000Z"
      activity_status: "Active"
      special_notes: null
      sales_team_id: "LAB101"
      organisation_id: "0"
      company_id: "11625"
      delivery_address_id: "14943"
      delivery_address: "Main Rd, Observatory, Cape Town, 7925, South Africa"
      physical_address_id: "14943"
      physical_address: "Main Rd, Observatory, Cape Town, 7925, South Africa"
      currency_id: "1"
      currency_code: "ZAR"
      currency_symbol: "R"
      currency_description: "Rand"
      company_trading_name: "NHLS OF SA"
      company_on_hold: false
      customer_class_id: "80"
      department: null
      created: null
      document_ids: []
      company_account_number: "11625"
      customer_sales_team: "LAB101"
      company_sales_team: "LAB100"
      country: "South Africa"
      billing_address: "Ct,Po box 1038,Sandringham,Gauteng,2000"
   *
   */

  let clients = [...clientDetails.items];
  if (clients.length === 1) {


    logger.debug(`CLIENT::: ${JSON.stringify(clients[0])}`);


    let clientResponse = om(clients[0], {
      'id': 'id',
      'first_name': [{
        "key":
          'fullName',
        "transform": (sourceValue, sourceObject, destinationObject, destinationKey) => `${sourceValue} ${sourceObject.surname}`,
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
      'ranking_id': ['customer.rankingId',
        {
          key: 'customer.ranking',
          transform: (sourceValue) => {
            /**
             * 1	A - High Value
               2	B - Medium Value
               3	C - Low Value
             */
            const rankings = {
              "1": 'A - High Value',
              "2": 'B - Medium Value',
              "3": 'C - Low Value'
            };
            return rankings[sourceValue];
          }
        }
      ],
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
      'customer_class_id': ['customer.classId',
        {
          key: 'customer.customerClass',
          transform: (sourceValue) => `${sourceValue} => Lookup Pending`
        }
      ],
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
            /**
             *
             *
             * {
                "id": "11999",
                "registered_name": "COD  LAB  CPT",
                "description": null,
                "trading_name": "COD  LAB  CPT",
                "registration_number": null,
                "vat_number": "-",
                "credit_facility_requested": "10",
                "account_terms": "COD General Accts",
                "bank_account_type_id": null,
                "bank_name": null,
                "bank_account_number": null,
                "branch_code": null,
                "organisation_id": null,
                "department_id": null,
                "customer_class_id": "IND024",
                "customer_sub_class_id": null,
                "legal_address_id": null,
                "physical_address_id": null,
                "procurement_person_ids": null,
                "account_person_ids": null,
                "company_on_hold": false,
                "currency_id": "1",
                "currency_code": "ZAR",
                "currency_symbol": "R",
                "currency_description": "Rand",
                "sales_team_id": "LAB100",
                "billing_address": ",,,,,",
                "warehouse_id": "10",
                "credit_limit_total_cents": 0,
                "current_balance_total_cents": -7532620,
                "current_invoice_total_cents": -1252537,
                "30_day_invoice_total_cents": -948730,
                "60_day_invoice_total_cents": -1574862,
                "90_day_invoice_total_cents": -413671,
                "120_day_invoice_total_cents": -3342820,
                "credit_invoice_total_cents": -7698211
              }
             *
             */

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

    return clientResponse;
  }

  return null;
};

const updateClientDetail = async (args) => {
  logger.debug(`>> >> >> UPDATE PARAMS:: `, args);
  try {
    const params = args.clientInfo;
    const preFetchClientDetails = await lasecApi.Customers.list({ filter: { ids: [params.clientId] } });

    let clients = [...preFetchClientDetails.items];
    if (clients.length === 1) {

      const client = clients[0];

      let updateParams = {
        first_name: params.firstName || (client.first_name || ''),
        surname: params.lastName || (client.surname || ''),
        activity_status: params.clientStatus || (client.activity_status || ''),
        country: params.country || (client.country || ''),
        department: params.department || (client.department || 'NONE'),
        title_id: client.title_id,
        mobile_number: params.mobileNumber || (client.mobile_number || ''),
        office_number: params.officeNumber || (client.office_number || ''),
        alternate_office_number: params.alternateNumber || (client.alternate_office_number || ''),
        email: params.email || (client.email || ''),
        confirm_email: params.email || (client.email || ''),
        alternate_email: params.alternateEmail || (client.alternate_email || ''),
        role_id: client.role_id,
        ranking_id: params.ranking || (client.ranking_id || ''),
        account_type: params.accountType || (client.account_type || ''),
        customer_class_id: params.clientClass || (client.customer_class_id || ''),
        sales_team_id: params.repCode || (client.sales_team || ''),
      }
      const apiResponse = await lasecApi.Customers.UpdateClientDetails(params.clientId, updateParams);

      return {
        Success: apiResponse.success,
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

const getCustomerRoles = async (params) => {

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

const getCustomerRanking = async (params) => {

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

const getCustomerClass = async (params) => {
  const cached = await getCacheItem(Hash('LASEC_CUSTOMER_CLASS')).then();
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

const getCustomerClassById = async (id) => {
  const customerClasses = await getCustomerClass({}).then();
  logger.debug(`Searching in ${customerClasses.length} classes for id ${id}`)
  const found = lodash.find(customerClasses, { id: id });
  return found;
};

const getCustomerCountries = async (params) => {
  return await lasecApi.get(lasecApi.URIS.customer_country.url, undefined, { 'country.[]': ['[].id', '[].name'] });
};

const getCustomerRepCodes = async (args) => {
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
  logger.debug(`<<<<<<<< Fetching Client Titles >>>>>>>>>>>>>`);
  //const cached = await getCacheItem(Hash(CLIENT_TITLES_KEY)).then();

  //if (cached) return cached.items;

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

interface CustomerDocumentQueryParams {
  id?: string,
  uploadContexts?: string[],
  paging?: {
    page: number,
    pageSize: number
  }
}

const getCustomerDocuments = async (params: CustomerDocumentQueryParams) => {

  logger.debug(`DOCUMENT PARAMS:: ${JSON.stringify(params)}`);

  const _docs: any[] = []

  if (params.id && params.id !== 'new') {
    logger.debug(`Fetching Remote Documents for Lasec Customer ${params.id}`);
    let documents = await lasecApi.get(lasecApi.URIS.file_upload.url, { filter: { ids: [params.id] }, paging: { enabled: false } });
    documents.items.forEach((documentItem: any) => {
      logger.debug(`Adding Document item from Lasec For Customer Id ${params.id}`);
      _docs.push({
        id: new ObjectID(),
        partner: global.partner,
        filename: documentItem.name,
        link: documentItem.url,
        hash: Hash(documentItem.url),
        path: '',
        alias: '',
        alt: [],
        size: 0,
        uploadContext: 'lasec-crm::company-document::remote',
        mimetype: '',
        uploadedBy: global.user.id,
        owner: global.user.id
      })
    });
  }

  let documentFilter: any = {};
  if (params.uploadContexts && params.uploadContexts.length > 0) {
    documentFilter.uploadContext = {
      $in: params.uploadContexts.map((ctx: string) => {
        //append the the logged in user id for the context.
        if (ctx === 'lasec-crm::new-company::document') return `${ctx}::${global.user._id}`;
        return ctx;
      })
    };
  }

  logger.debug(`lasec-crm::CompanyResovler.ts --> getCustomerDocuments() --> documentFilter`, documentFilter);
  let reactoryFiles = await ReactoryFile.find(documentFilter).then();
  logger.debug(`lasec-crm::CompanyResovler.ts --> getCustomerDocuments() --> ReactorFile.find({documentFileter}) --> reactorFiles[${reactoryFiles.length}]`);

  reactoryFiles.forEach((rfile) => {
    _docs.push(rfile);
  });

  if (params.paging) {

    let skipCount: number = (params.paging.page - 1) * params.paging.pageSize;

    logger.debug(`TO FILTER :: ${params.paging.page}  ${params.paging.pageSize}   ${skipCount}`);
    const customerToReturn = lodash(_docs).drop(skipCount).take(params.paging.pageSize);
    logger.debug(`TO RETURN :: ${JSON.stringify(customerToReturn)}`);

    return {
      documents: lodash(_docs).drop(skipCount).take(params.paging.pageSize),
      paging: {
        total: _docs.length,
        page: params.paging.page,
        hasNext: skipCount + params.paging.pageSize < _docs.length,
        pageSize: params.paging.pageSize
      },
    }

  } else {
    return _docs;
  }
};

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

  let ids = [];

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

  const organisationDetails = await lasecApi.Organisation.list({ filter: { ids: ids } });

  logger.debug(`Fetched Expanded View for (${organisationDetails.organisations.length}) ORGANISATIONS from API`);
  let organisations = [...organisationDetails.organisations];

  logger.debug(`ORGANISATION RESOLVER - ORGANISATION:: Found (${organisations.length}) for request`);

  organisations = organisations.map(organisation => {
    let _organisation = om(organisation, {
      'id': 'id',
      'name': 'name',
      'description': 'description',
    });
    return _organisation;
  });

  logger.debug(`ORGANISATIONS:: (${JSON.stringify(organisations)})`);

  organisations = orderBy(organisations, ['name', ['asc']]);

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
function isFileValid(filename: string, mimetype: string) {
  // Get file extension.
  const extension = getExtension(filename);

  return allowedExts.indexOf(extension.toLowerCase()) != -1 &&
    allowedMimeTypes.indexOf(mimetype) != -1;
}


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
        return fs.unlink(saveToPath, (err) => {
          reject(error)
        });
      }

      // eslint-disable-next-line consistent-return
      reject(error)
    }


    const catalogFile = () => {
      // Check if image is valid
      const fileStats = fs.statSync(saveToPath);

      logger.debug(`SAVING FILE:: DONE ${filename} --> CATALOGGING`);

      const reactoryFile = {
        id: new ObjectID(),
        filename,
        mimetype,
        alias: randomName,
        partner: new ObjectID(global.partner.id),
        owner: new ObjectID(global.user.id),
        uploadedBy: new ObjectID(global.user.id),
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

      const savedDocument = new ReactoryFile(reactoryFile);

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

    /*
 stream
   .on('data', async (data) => {
     logger.debug(`Read File Data For File ${filename}`);
     const formData = new FormData();
     formData.append('files', data); // this needs to be file: binary
     const apiResponse = await lasecApi.Customers.UploadDocument(formData);
     logger.debug(`RESOLVER UPLOAD DOCUMENT RESPONSE:: ${JSON.stringify(apiResponse)}`);
   })
   .on('error', (error) => {
     logger.error(`Error reading file:: ${error}`);
   })
   .on('end', () => {
     logger.debug('Finished reding stream');
   });
 */

  });
};

const deleteDocuments = async (args: any) => {

  const { fileIds } = args;

  let files = await ReactoryFile.find({ id: { $in: fileIds } }).then()

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
  personalDetails: {
    title: 'Mr',
    firstName: '',
    lastName: '',
    country: 'SOUTH AFRICA',
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

const getAddress = async (args) => {

  logger.debug(`GETTING ADDRESS:: ${JSON.stringify(args)}`);

  const addressIds = await lasecApi.Customers.getAddress({ filter: { any_field: args.searchTerm }, format: { ids_only: true } });

  let _ids = [];
  if (isArray(addressIds.ids) === true && addressIds.ids.length > 0) {
    _ids = [...addressIds.ids];
    const addressDetails = await lasecApi.Customers.getAddress({ filter: { ids: _ids }, pagination: { enabled: false } });

    const addresses = [...addressDetails.items];

    return addresses
  }

  return [];
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
        lat: 0,
        lng: 0,
        formatted_address: `${addressDetails.addressFields.unitNumber || ''}, ${addressDetails.addressFields.unitName || ''} ${addressDetails.addressFields.streetNumber || ''} ${addressDetails.addressFields.streetName || ''} ${addressDetails.addressFields.suburb || ''} ${addressDetails.addressFields.metro || ''} ${addressDetails.addressFields.city || ''} ${addressDetails.addressFields.postalCode || ''} ${addressDetails.addressFields.province || ''} ${addressDetails.addressFields.country || ''}`,
        address_components: [],
      },
      confirm_pin: true,
      confirm_address: true,
    };

    const existingAddress = await getAddress({ searchTerm: addressParams.map.formatted_address }).then();

    logger.debug(`Found ${existingAddress.length} matches: ${existingAddress}`);

    if (existingAddress && existingAddress.length > 0) {
      return {
        success: true,
        message: 'Existing address found',
        id: existingAddress[0].id,
        fullAddress: existingAddress[0].formatted_address
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

const getPlaceDetails = async (args) => {
  const apiResponse = await lasecApi.Customers.getPlaceDetails(args.placeId);

  if (apiResponse && apiResponse.status === 'OK') {
    const addressObj = {
      streetName: '',
      streetNumber: '',
      suburb: '',
      city: '',
      metro: '',
      province: '',
      postalCode: '',
    };

    apiResponse.result.address_components.forEach((comp) => {
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

export default {
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
    customer: async (parent, obj) => {
      logger.debug('Finding new Customer for LasecNewClient', parent);

      if (parent.customer && parent.customer.id) return getCustomerById(parent.customer.id);

      return {
        id: '',
        registeredName: ''
      };
    }
  },
  LasecCRMCustomer: {
    customerClass: async (parent, obj) => {
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
    documents: async (parent, object) => {
      return getCustomerDocuments({ id: parent.id });
    },
    registeredName: async (parent, obj) => {
      return parent.registered_name || parent.registeredName
    }
  },
  Query: {
    LasecGetClientList: async (obj, args) => {
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
    LasecGetCustomerClassById: async (obj, args) => {
      return getCustomerClassById(args.id);
    },
    LasecGetCustomerRanking: async (object, args) => {
      return getCustomerRanking(args);
    },
    LasecGetCustomerRankingById: async (object, args) => {
      logger.debug('LasecGetCustomerRankingById', args)
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
    LasecGetCustomerCountries: async (object, args) => {
      return getCustomerCountries(args);
    },
    LasecGetCustomerRepCodes: async (object, args) => {
      return getCustomerRepCodes(args);
    },
    LasecGetCustomerDocuments: async (object, args) => {
      return getCustomerDocuments(args);
    },
    LasecSalesTeams: async (obj, args) => {
      // return getLasecSalesTeamsForLookup();
      // return getRepCodesForFilter();
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
    LasecGetNewClient: async (obj, args) => {

      logger.debug(`[LasecGetNewClient] NEW CLIENT PARAMS:: ${JSON.stringify(args)}`);

      let existingCustomer = null;
      const apiClient = { ...DEFAULT_NEW_CLIENT };
      if (args.id) {
        existingCustomer = await getClient({ id: args.id });

        if (existingCustomer) {
          apiClient.id = existingCustomer.id || '';
          apiClient.personalDetails.title = existingCustomer.title || 'Mr';
          apiClient.personalDetails.firstName = existingCustomer.firstName || '';
          apiClient.personalDetails.lastName = existingCustomer.lastName || '';
          apiClient.personalDetails.country = existingCustomer.country || '';
          apiClient.personalDetails.repCode = existingCustomer.salesTeam || '';
          apiClient.personalDetails.accountType = existingCustomer.accountType || '';

          apiClient.contactDetails.emailAddress = existingCustomer.emailAddress || '';
          apiClient.contactDetails.confirmEmail = existingCustomer.emailAddress || '';
          apiClient.contactDetails.alternateEmail = existingCustomer.alternateEmail || '';
          apiClient.contactDetails.confirmAlternateEmail = existingCustomer.alternateEmail || '';
          apiClient.contactDetails.mobileNumber = existingCustomer.mobileNumber || '';
          apiClient.contactDetails.alternateMobile = existingCustomer.alternateMobile || '';
          apiClient.contactDetails.officeNumber = existingCustomer.officeNumber || '';
          apiClient.contactDetails.alternateOfficeNumber = existingCustomer.alternateOfficeNumber || '';
          apiClient.contactDetails.prefferedMethodOfContact = existingCustomer.prefferedMethodOfContact || '';

          apiClient.jobDetails.jobTitle = existingCustomer.jobTitle || '';
          apiClient.jobDetails.jobType = existingCustomer.jobType || '';
          apiClient.jobDetails.salesTeam = existingCustomer.customer.salesTeam || '';
          apiClient.jobDetails.lineManager = existingCustomer.lineManager || '';
          apiClient.jobDetails.customerType = existingCustomer.customer.accountType || '';
          apiClient.jobDetails.faculty = existingCustomer.customer.faculty || '';
          apiClient.jobDetails.clientDepartment = existingCustomer.customer.department || '';
          apiClient.jobDetails.ranking = existingCustomer.customer.ranking || '';
          apiClient.jobDetails.customerClass = existingCustomer.customer.customerClass || '';

          apiClient.customer.id = existingCustomer.customer.id || '';
          apiClient.customer.registeredName = existingCustomer.customer.registeredName || '';
          apiClient.organization.id = (existingCustomer.organization && existingCustomer.organization.id) ? existingCustomer.organization.id : '';
          apiClient.organization.name = (existingCustomer.organization && existingCustomer.organization.name) ? existingCustomer.organization.name : '';

          apiClient.address.physicalAddress.id = existingCustomer.customer.physicalAddressId || '';
          apiClient.address.physicalAddress.fullAddress = existingCustomer.customer.physicalAddress || '';
          apiClient.address.deliveryAddress.id = existingCustomer.customer.deliveryAddressId || '';
          apiClient.address.billingAddress.id = existingCustomer.customer.deliveryAddressId || '';
          apiClient.address.deliveryAddress.fullAddress = existingCustomer.customer.deliveryAddress || '';
          apiClient.address.billingAddress.fullAddress = existingCustomer.customer.billingAddress || '';
          logger.debug(`[LasecGetNewClient] TO RETURN :: ${JSON.stringify(apiClient)}`);
        }
      }

      let hash = Hash(`__LasecNewClient::${global.user._id}`);
      const cachedClient = await getCacheItem(hash).then();

      if (cachedClient !== null) {

        if (existingCustomer) {
          const mergedClient = {
            ...apiClient,
            ...cachedClient
          };
          mergedClient.id = apiClient.id;
          return mergedClient;
        }

        return cachedClient;
      }
      else {
        let _newClient = { ...DEFAULT_NEW_CLIENT, id: new ObjectId(), createdBy: global.user._id };
        await setCacheItem(hash, _newClient, 60 * 60 * 12).then();
        let clientDocuments = await getCustomerDocuments({ id: 'new', uploadContexts: ['lasec-crm::new-company::document'] }).then();
        return { ..._newClient, clientDocuments };

      }
    },
    LasecGetAddress: async (obj, args) => {
      return getAddress(args);
    },
    LasecGetPlaceDetails: async (obj, args) => {
      return getPlaceDetails(args);
    },
  },
  Mutation: {
    LasecUpdateClientDetails: async (obj, args) => {
      logger.debug(`UPDATING CLIENT DETAILS WITH ARGS ${args}`);
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
    LasecUpdateNewClient: async (obj, args) => {
      const { newClient } = args;
      logger.debug('Updating new client address details with input', { newClient });

      let hash = Hash(`__LasecNewClient::${global.user._id}`);
      let _newClient = await getCacheItem(hash).then();

      if (isNil(newClient.personalDetails) === false) {
        _newClient.personalDetails = { ..._newClient.personalDetails, ...newClient.personalDetails };
      }

      if (isNil(newClient.contactDetails) === false) {
        _newClient.contactDetails = { ..._newClient.contactDetails, ...newClient.contactDetails };
      }

      if (isNil(newClient.jobDetails) === false) {
        _newClient.jobDetails = { ..._newClient.jobDetails, ...newClient.jobDetails };
      }

      if (isNil(newClient.customer) === false) {
        _newClient.customer = { ..._newClient.customer, ...newClient.customer };
      }

      if (isNil(newClient.organization) === false) {
        _newClient.organization = { ..._newClient.organization, ...newClient.organization };
      }

      if (isNil(newClient.address) === false) {
        _newClient.address = {
          physicalAddress: { ..._newClient.address.physicalAddress, ...newClient.address.physicalAddress },
          deliveryAddress: { ..._newClient.address.deliveryAddress, ...newClient.address.deliveryAddress },
          // billingAddress: { ..._newClient.address.billingAddress, ...newClient.address.billingAddress },
        };
      }

      logger.debug('New Client Details', _newClient, 'debug');

      _newClient.updated = new Date().valueOf()
      await setCacheItem(hash, _newClient, 60 * 60 * 12).then();

      return _newClient;
    },
    LasecCreateNewClient: async (obj, args) => {

      let hash = Hash(`__LasecNewClient::${global.user._id}`);
      const _newClient = await getCacheItem(hash).then();
      let response: NewClientResponse = {
        client: _newClient,
        success: true,
        messages: [
        ],
      };


      logger.debug(`CREATE NEW ARGS:: ${JSON.stringify(args)}`);

      // CLIENT EXISTS AND IS DEACTIVATED - REACTIVATE CLIENT
      if (args.id) {
        try {
          const updateArgs = {
            clientInfo: {
              ...args.newClient,
              clientStatus: 'active',
              clientId: args.id,
            }
          }
          await updateClientDetail(updateArgs);
          await mysql(`
            UPDATE Customer SET
              activity_status = 'active',
              company_id = ${args.customer.id},
            WHERE customerid = ${args.id};`, 'mysql.lasec360').then()

          response.client = args;
        } catch (setStatusError) {
          logger.error("Error Setting The Status and Customer details", setStatusError);
          response.client = args;
          response.messages = ['There was an error reactivating this client.'];
          response.success = false;
        }

        return response;
      }

      const { Customers, post, URIS } = lasecApi;
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
        'personalDetails.clientTitle': 'title_id',
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

        'customer.id': 'company_id',
        'customer.registeredName': 'company',
        'organization.id': { key: 'oranisation_id', transform: (v: string) => Number.parseInt(`${v}`) },
        'address.physicalAddress.id': 'physical_address_id',
        'address.deliveryAddress.id': 'delivery_address_id',
      };

      let customerCreateResult: any = null;
      let customer: any = null;

      let customerCreated = false;
      try {
        let inputData: any = om.merge(_newClient, _map);
        inputData.onboarding_step_completed = 6;
        inputData.activity_status = 'active';


        logger.debug(`Create new client on LasecAPI`, inputData)
        customer = await post(URIS.customer_create.url, inputData).then()
        logger.debug(`Result in creating user`, customer);

        try {
          const update_result = await mysql(`
            UPDATE Customer SET
              activity_status = 'active',
              organisation_id = ${_newClient.organization.id},
              company_id = ${_newClient.customer.id},

            WHERE customerid = ${customer.id};`, 'mysql.lasec360').then()
          logger.debug(`Updated user activity status complete`, update_result);

        } catch (setStatusError) {
          logger.error("Error Setting The Status and Customer details", setStatusError)
        }

        if (customer && customer.id && Number.parseInt(`${customer.id}`) > 0) {
          customer = { ...inputData, ...customer };
          customerCreated = Boolean(customer && customer.id);
          if (customerCreated === true) {
            response.messages.push({ text: `Client ${customer.first_name} ${customer.surname} created on LASEC CRM id ${customer.id}`, type: 'success', inAppNotification: true });

            /***
             * set addresses for the customer
             * */
            const { deliveryAddress, physicalAddress } = _newClient.address;
            let setAddressResult = null;
            if (Number.parseInt(physicalAddress.id) > 0) {
              try {
                setAddressResult = await post(URIS.customer_add_address.url, { customer_id: customer.id, physical_address_id: physicalAddress.id }).then();
                logger.debug(`Set physical address ${physicalAddress.fullAddress}`);
              } catch (exc) {
                logger.error(`Could not save the physical address against the customer`, exc);
                response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} could not set physical address`, type: 'warning', inAppNotification: true });
              }
            }


            if (Number.parseInt(deliveryAddress.id) > 0) {
              try {
                setAddressResult = await post(URIS.customer_add_address.url, { customer_id: customer.id, delivery_address_id: deliveryAddress.id }).then();
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
                  logger.debug(`File upload result ${uploadResult}`)
                  uploadResult.document.uploadContext = `lasec-crm::client::document::${customer.id}`;
                  uploadResult.document.save()

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
              const updateResponse: LasecApiResponse = await lasecApi.Customers.UpdateClientDetails(customer.id, { activity_status: 'active' }).then();
              if (updateResponse.status !== 'success') {
                logger.warning(`Lasec API did not update the customer status`, updateResponse);
              }
            } catch (setStatusException) {
              logger.error(`Could set the client status`, setStatusException);
              response.messages.push({ text: `Client ${customer.first_name} ${customer.last_name} encountered errors while setting activity status`, type: 'warning', inAppNotification: true });
            }

            setCacheItem(hash, { ...DEFAULT_NEW_CLIENT }, 60 * 60 * 12);
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
      } catch (exc) {
        logger.debug(`Exception while saving new client: ${exc.message}`, exc);
        throw exc;
      }

      return response;
    },
    LasecCreateNewAddress: async (obj, args) => {
      return createNewAddress(args);
    },
    LasecCRMSaveComment: async (obj, args) => {
      return saveComment(args);
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
    }
  },
};
