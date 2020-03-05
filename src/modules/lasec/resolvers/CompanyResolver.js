import lasecApi from '../api';
import moment from 'moment';
import om from 'object-mapper';
import logger from '../../../logging';
import lodash, { isArray, isNil, orderBy, isString } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';
import Hash from '@reactory/server-core/utils/hash';
import { clientFor, execql } from '@reactory/server-core/graph/client';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';

const getClients = async (params) => {    
  const { search = "", paging = { page: 1, pageSize: 10 }, filterBy = "any_field", iter = 0  } = params;

  logger.debug(`Getting Clients using search ${search}`, {search, paging, filterBy, iter});

  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  if(isString(search) === false || search.length < 3) return {
    paging: pagingResult,
    clients: []
  };

  let filter = {  };

  filter[filterBy] = search;  

  const cachekey = Hash(`client_list_${search}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}_filterBy_${filterBy}`.toLowerCase());

  let _cachedResults = await getCacheItem(cachekey);

  if (_cachedResults) {
    
    if(iter === 0) {
      //client request and we have a cache so we fire off the next fetch anyway
      execql(`query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $iter: Int){
        LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy iter: $iter){
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
      }`, {search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1}).then();
    }
    logger.debug(`Returning cached item ${cachekey}`);
    return _cachedResults;
  }
  
  const clientResult = await lasecApi.Customers.list({ filter: filter, pagination: { page_size: paging.pageSize || 10, current_page: paging.page } }).then();

  let ids = [];

  if (isArray(clientResult.ids) === true) {
    ids = [...clientResult.ids];
  }
  
  if (clientResult.pagination && clientResult.pagination.num_pages > 1) {
    logger.debug('Paged Result From Lasec API', { pagination: clientResult.pagination});
    pagingResult.total = clientResult.pagination.num_items;
    pagingResult.pageSize = clientResult.pagination.page_size || 10;
    pagingResult.hasNext = clientResult.pagination.has_next_page === true;
    pagingResult.page = clientResult.pagination.current_page || 1;
  }

  

  logger.debug(`Loading (${ids.length}) client ids`);

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${clientDetails.items.length}) Clients from API`);
  let clients = [...clientDetails.items];
  
  logger.debug(`CLIENT RESOLVER - CLIENTS:: Found (${clients.length}) for request`,);

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
      'activity_status': {key: 'clientStatus', transform: (sourceValue) => `${sourceValue}`.toLowerCase()},
      'email': 'emailAddress',      
      'company_id': 'customer.id',
      'company_account_number': 'customer.accountNumber',
      'company_trading_name': 'customer.tradingName',
      'company_sales_team': 'customer.salesTeam',
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

  clients = orderBy(clients, ['fullName', ['asc']]);

  let result = {
    paging: pagingResult,
    search,
    filterBy,
    clients,
  };

  if(result.paging.pageSize >= 10 && result.paging.hasNext === true) {
    // cache the next result

    // create segments for page size 5 and 10
    if(result.paging.pageSize === 20) {
      const cachekeys_10 = `client_list_${search}_page_${paging.page || 1}_page_size_10`.toLowerCase();
      setCacheItem(cachekeys_10, { paging: {...result.paging, pageSize: 10, hasNext: true }, clients: lodash.take(result.products, 10) } );
    }
    
    const cachekeys_5 = `client_list_${search}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: {...result.paging, pageSize: 5, hasNext: true }, clients: lodash.take(result.products, 5) } );       
  }

  if(result.paging.hasNext === true && iter === 0) {    
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
      }`, {search, paging: { page: paging.page + 1, pageSize: paging.pageSize }, filterBy, iter: 1}).then();        
    } catch (cacheFetchError) {
      logger.error('An error occured attempting to cache next page', cacheFetchError);
    }    
  } 

  setCacheItem(cachekey, result, 60 * 10);

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
  if(clients.length === 1) {
    let clientResponse = om(clients[0], {
      'id': 'id',
      'first_name': [{ 
        "key": 
        'fullName',
        "transform": (sourceValue, sourceObject, destinationObject, destinationKey) => `${sourceValue} ${sourceObject.surname}`,
      }, "firstName"],
      'surname': 'lastName',
      'activity_status': {key: 'clientStatus', transform: (sourceValue) => `${sourceValue}`.toLowerCase()},
      'email': 'emailAddress',
      'alternate_email': 'alternateEmail',
      'mobile_number': 'mobileNumber',
      'office_number': 'officeNumber',
      'alternate_office_number': 'alternateOfficeNumber',
      'special_notes': 'note',
      'sales_team_id': 'salesTeam',
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
      'account_type':['accountType', 'customer.accountType'],
      'company_on_hold': { 
        'key': 'customer.customerStatus', 
        'transform': (val) => (`${val === true ? 'on-hold' : 'not-on-hold'}`) 
      },
      'currency_code': 'customer.currencyCode',      
      'currency_symbol': 'customer.currencySymbol',
      'physical_address_id': 'customer.physicalAddressId',
      'physical_address': 'customer.physicalAddress',
      'delivery_address': 'customer.deliveryAddressId',
      'delivery_address': 'customer.deliveryAddress',
      'country': ['country', 'customer.country']
    });

    try {
      let hashkey = Hash(`LASEC_COMPANY::${clientResponse.customer.id}`);
      let found = await getCacheItem(hashkey).then();
      logger.debug(`Found Cached Item for LASEC_COMPANY::${clientResponse.customer.id} ==> ${found}`)
      if( found ===  null || found === undefined ) {
        let companyPayloadResponse = await lasecApi.Company.getById({ filter: { ids: [clientResponse.customer.id] }}).then()
        if(companyPayloadResponse && isArray(companyPayloadResponse.items) === true) {
          if(companyPayloadResponse.items.length === 1) {
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

            let customerObject = { ...clientResponse.customer,  ...om(companyPayloadResponse.items[0], {
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

export default {
  LasecCRMClient: {
    creditLimit: async (parent, obj) => {
      return 10;
    },
    availableBalance: async(parent, obj) => {
      return 10;
    }
  },
  LasecCRMCustomer: {
    customerClass: async (parent, obj) => {
      if(parent.classId) {
        try {
          const result = await mysql(`SELECT Description FROM TblCustomerClass WHERE Class = '${parent.classId}'`, 'mysql.lasec360').then();
          logger.debug('Results from querying description', result);
          if(result && result.length) {
            return result[0].Description;
          }          
        } catch (dbError) {
          logger.error(`MySQL Error resolving description from db ${dbError.message}`,);
          return parent.customerClass;
        }        
      }
      return parent.customerClass;
    },
    currencyDisplay: (customerObject) => {
      let code = '???', symbol = '?';
      if(customerObject) {
        code = customerObject.currencyCode || code;
        symbol = customerObject.currencySymbol || symbol;
      }

      return `${code} (${symbol})`;
    },
    creditLimit: async (parent, obj) => {
      return 100;
    },
    availableBalance: async(parent, obj) => {
      return 100;
    }
  },  
  Query: {
    LasecGetClientList: async (obj, args) => {
      return getClients(args);
    },
    LasecGetClientDetail: async(obj, args) => {
      return getClient(args);
    }
  }
};
