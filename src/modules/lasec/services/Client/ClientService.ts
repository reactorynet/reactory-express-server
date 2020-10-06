import {
    Lasec360User,
    LasecQuote,
    IQuoteService,
    ILasecClientService, LasecClient
} from '@reactory/server-modules/lasec/types/lasec';

import {
    getLasecQuoteById,

} from '@reactory/server-modules/lasec/resolvers/Helpers'

import {
    getService
} from '@reactory/server-core/services'
import { Reactory } from '@reactory/server-core/types/reactory';
import logger from '@reactory/server-core/logging';

import LasecApi from '@reactory/server-modules/lasec/api'




class LasecClientService implements ILasecClientService {

    name: string = 'LasecClientService';
    nameSpace: string = 'lasec-crm';
    version: string = '1.0.0';

    constructor(props: any, context: any) {

    }

    async getClientById(id: string): Promise<LasecClient> {

        const client_detail_api_response = await LasecApi.Customers.list({ filter: { ids: [id] }, ordering: {}, pagination: { enabled: false, current_page: 1, page_size: 10  } });

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

        let clients = [...client_detail_api_response.items];
        if (clients.length === 1) {


            logger.debug(`CLIENT::: ${JSON.stringify(clients[0])}`);


            let clientResponse = om(clients[0], {
                'id': 'id',
                'first_name': [{
                    "key":'fullName',
                    "transform": (sourceValue: any, sourceObject: any, destinationObject: any, destinationKey: any) => `${sourceValue} ${sourceObject.surname}`,
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
    }

}

const service_definition: Reactory.IReactoryServiceDefinition = {
    id: 'lasec-crm.LasecCLientService@1.0.0',
    name: 'Lasec Client Service 💱',
    description: 'Service class for all client related services.',
    dependencies: [],
    serviceType: 'Lasec.ILasecClientService',
    service: (props: Reactory.IReactoryServiceProps, context: any) => {
        return new LasecClientService(props, context)
    }
};

export default service_definition;