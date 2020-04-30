import {
  ENTITY_KEY__RELEASE_NOTE,
  ENTITY_KEY__RELEASE_NOTE_SEEN,
  ENTITY_KEY__CUSTOMER,
  ENTITY_KEY__STAFF_USER_DATA,
  ENTITY_KEY__QUOTE,
  ENTITY_KEY__SALES_ORDER_TYPE,
  ENTITY_KEY__PRODUCT,
  ENTITY_KEY__PRODUCT_COSTING,
  ENTITY_KEY__PRODUCT_BUYER,
  ENTITY_KEY__PRODUCT_PLANNER,
  ENTITY_KEY__SALES_ORDER,
  ENTITY_KEY__SALES_ORDER_TOTALS,
  ENTITY_KEY__SALES_ORDER_ITEM,
  ENTITY_KEY__BACK_ORDER,
  ENTITY_KEY__QUOTE_OPTION,
  ENTITY_KEY__QUOTE_ITEM,
  ENTITY_KEY__QUOTE_EMAIL_RECIPIENT,
  ENTITY_KEY__PURCHASE_ORDER,
  ENTITY_KEY__WAREHOUSE,
  ENTITY_KEY__WAREHOUSE_STOCK,
  ENTITY_KEY__TENDER,
  ENTITY_KEY__CONTRACT,
  ENTITY_KEY__CUSTOMER_CLASS,
  ENTITY_KEY__REP_CODE,
  ENTITY_KEY__UPLOAD_FILE,
  ENTITY_KEY__FILE_UPLOADS,
  ENTITY_KEY__CUSTOMER_RANKING,
  ENTITY_KEY__CUSTOMER_ROLE,
  ENTITY_KEY__STOCK_ALLOCATED,
  ENTITY_KEY__PERSON_TITLE,
  ENTITY_KEY__COMPANY,
  ENTITY_KEY__ORGANISATION,
  ENTITY_KEY__CURRENCY,
  ENTITY_KEY__PROVINCE,
  ENTITY_KEY__COUNTRY,
  ENTITY_KEY__INVOICE,
  ENTITY_KEY__BUILDING_DESCRIPTION,
  ENTITY_KEY__BUILDING_FLOOR_NUMBER,
  ENTITY_KEY__ADDRESS,
  ENTITY_KEY__GROUP,
  ENTITY_KEY__DEPARTMENT,
  ENTITY_KEY__STAFF_USER,
  ENTITY_KEY__ANNOUNCEMENT,
  ENTITY_KEY__ANNOUNCEMENT_SEEN,
  ENTITY_KEY__QUOTE_STATUS,
  ENTITY_KEY__PERMISSION,
  COLLECTION_KEY__PERMISSION,
  ENTITY_KEY__COMPANY_ADDRESS,
} from './constants';

export default {
  logged_in_user_get: { url: 'api/user/get_logged_in_user/', allowed_methods: ['post'] },
  logout_user: { url: 'api/user/logout_lasec_user/', allowed_methods: ['post'] },
  login_lasec_user: { url: 'api/user/login_lasec_user/', allowed_methods: ['post'] },
  create_user: { url: 'api/user/', allowed_methods: ['post'] },
  file_upload: { url: `api/${ENTITY_KEY__UPLOAD_FILE}/`, allowed_methods: ['get'] },
  file_uploads: { url: `api/${ENTITY_KEY__FILE_UPLOADS}/`, allowed_methods: ['post'] },
  release_notes: { url: `api/${ENTITY_KEY__RELEASE_NOTE}/`, allowed_methods: ['get'] },
  release_notes_seen: { url: `api/${ENTITY_KEY__RELEASE_NOTE_SEEN}/`, allowed_methods: ['post'] },
  permissions: { url: `api/${ENTITY_KEY__PERMISSION}/`, allowed_methods: ['get'] },
  customers: { url: `api/${ENTITY_KEY__CUSTOMER}/`, allowed_methods: ['get'] },
  company: { url: `api/${ENTITY_KEY__COMPANY}/`, allowed_methods: ['get'] },
  company_address: { url: `api/${ENTITY_KEY__COMPANY_ADDRESS}/`, allowed_methods: ['get'] },
  invoices: { url: `api/${ENTITY_KEY__INVOICE}/`, allowed_methods: ['get'] },
  staff_user_data: { url: `api/${ENTITY_KEY__STAFF_USER_DATA}/`, allowed_methods: ['get'] },
  staff_user_data_put: { url: `api/${ENTITY_KEY__STAFF_USER_DATA}/\\d+/`, allowed_methods: ['put'] },
  quote_get: { url: `api/${ENTITY_KEY__QUOTE}/`, allowed_methods: ['get'] },
  quote_items: { url: `api/${ENTITY_KEY__QUOTE_ITEM}/`, allowed_methods: ['get', 'post'] },
  quote_status_get: { url: `api/${ENTITY_KEY__QUOTE_STATUS}/`, allowed_methods: ['get'] },
  quote_put_delete: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/`, allowed_methods: ['put', 'delete'] },
  quote_send_email: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/send_quote_email/`, allowed_methods: ['post'] },
  quote_request_authorization: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/request_quote_authorisation/`, allowed_methods: ['post'] },
  quote_request_create_proforma: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/create_proforma_invoice/`, allowed_methods: ['post'] },
  quote_move_to_customer: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/move_quote_to_customer/`, allowed_methods: ['post'] },
  quote_copy_to_customer: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/copy_quote_to_customer/`, allowed_methods: ['post'] },
  quote_create_pdf: { url: `api/${ENTITY_KEY__QUOTE}/\\d+-\\d+/create_quote_pdf/`, allowed_methods: ['post'] },
  quote_section_header: { url: 'api/quote_heading', allowed_methods: ['post', 'put', 'delete', 'get'] },
  sales_order: { url: `api/${ENTITY_KEY__SALES_ORDER}/`, allowed_methods: ['post', 'get'] },
  purchase_order: { url: `api/${ENTITY_KEY__PURCHASE_ORDER}/`, allowed_methods: ['get'] },
  product_get: { url: `api/${ENTITY_KEY__PRODUCT}/`, allowed_methods: ['get'] },
  product_costing_get: { url: `api/${ENTITY_KEY__PRODUCT_COSTING}/`, allowed_methods: ['get'] },
  groups: { url: `api/${ENTITY_KEY__REP_CODE}/`, allowed_methods: ['get'] },
  warehouse: { url: `api/${ENTITY_KEY__WAREHOUSE}/`, allowed_methods: ['get'] },
  warehouse_strock: { url: `api/${ENTITY_KEY__WAREHOUSE_STOCK}/`, allowed_methods: ['get'] },
  customer: { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/update/`, allowed_methods: ['post'] },
  customer_ranking: { url: `api/${ENTITY_KEY__CUSTOMER_RANKING}/`, allowed_methods: ['get'] },
  customer_roles: { url: `api/${ENTITY_KEY__CUSTOMER_ROLE}/`, allowed_methods: ['get'] },
  customer_class: { url: `api/${ENTITY_KEY__CUSTOMER_CLASS}/`, allowed_methods: ['get'] },
  customer_country: { url: `api/${ENTITY_KEY__CUSTOMER}/country_list`, allowed_methods: ['get'] },
  person_title: { url: `api/${ENTITY_KEY__PERSON_TITLE}/`, allowed_methods: ['get'] },
  rep_code: { url: `api/${ENTITY_KEY__REP_CODE}/`, allowed_methods: ['get'] },
  organisation: { url: `api/${ENTITY_KEY__ORGANISATION}/`, allowed_methods: ['get'] },
  createOrganisation: { url: `api/${ENTITY_KEY__ORGANISATION}/\\d+/`, allowed_methods: ['put'] },
  address: { url: `api/${ENTITY_KEY__ADDRESS}/`, allowed_methods: ['get', 'post'] },
  new_address: { url: `api/${ENTITY_KEY__ADDRESS}/`, allowed_methods: ['get', 'post'] },

  /*
  { url: `api/${ENTITY_KEY__PRODUCT}/\\d+/request_new_product_price/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__PRODUCT_BUYER}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__PRODUCT_PLANNER}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__SALES_ORDER}/`, allowed_methods: ['post', 'get'] },
  { url: `api/${ENTITY_KEY__SALES_ORDER}/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__SALES_ORDER_TYPE}/\\d+/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__SALES_ORDER_ITEM}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__BACK_ORDER}/`, allowed_methods: ['get'] },
  { url: 'api/create_quote/', allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__QUOTE_OPTION}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__QUOTE_OPTION}/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__QUOTE_OPTION}/\\d+/`, allowed_methods: ['delete'] },
  { url: `api/${ENTITY_KEY__QUOTE_ITEM}/\\d+/`, allowed_methods: ['delete'] },
  { url: `api/${ENTITY_KEY__QUOTE_OPTION}/\\d+/duplicate_quote_option/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__QUOTE_ITEM}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__QUOTE_ITEM}/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__QUOTE_EMAIL_RECIPIENT}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__PURCHASE_ORDER}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__WAREHOUSE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__WAREHOUSE_STOCK}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__TENDER}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__RELEASE_NOTE}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__RELEASE_NOTE}/\\d+/`, allowed_methods: ['delete'] },
  { url: `api/${ENTITY_KEY__RELEASE_NOTE}/\\d+/update/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__ANNOUNCEMENT}/`, allowed_methods: ['post', 'get'] },
  { url: `api/${ENTITY_KEY__ANNOUNCEMENT}/\\d+/`, allowed_methods: ['delete', 'put'] },
  { url: `api/${ENTITY_KEY__ANNOUNCEMENT_SEEN}/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CONTRACT}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__CUSTOMER_CLASS}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__REP_CODE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/create_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/update/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/save_company_to_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/save_organisation_to_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/remove_organisation_from_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/update_customer_activity_status/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/update_customer_special_note/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/\\d+/save_documents/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__UPLOAD_FILE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/create_organisation_and_save_to_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__PRODUCT}/sales_order_totals/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__CUSTOMER_RANKING}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__CUSTOMER_ROLE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__STOCK_ALLOCATED}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__PERSON_TITLE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__COMPANY}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__ORGANISATION}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__ORGANISATION}/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__PERMISSION}/create_permission_group/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__PERMISSION}/update_permission_group/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__PERMISSION}/delete_permission_group/\\d+/`, allowed_methods: ['delete'] },
  { url: 'api/forgot_password/', allowed_methods: ['post'] },
  { url: 'api/change_password/', allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CURRENCY}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__PROVINCE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__COUNTRY}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__INVOICE}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__BUILDING_DESCRIPTION}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__BUILDING_FLOOR_NUMBER}/`, allowed_methods: ['get'] },
  { url: `api/${ENTITY_KEY__ADDRESS}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__ADDRESS}/\\d+/`, allowed_methods: ['put'] },
  { url: `api/${ENTITY_KEY__GROUP}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__DEPARTMENT}/`, allowed_methods: ['get', 'post'] },
  { url: `api/${ENTITY_KEY__STAFF_USER}/create_secondary_api_staff_user/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__STAFF_USER_DATA}/\\d+/`, allowed_methods: ['delete'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/add_address_to_customer/`, allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__CUSTOMER}/save_organisation_to_customer/`, allowed_methods: ['post'] },
  { url: 'api/user/logout_lasec_user/', allowed_methods: ['post'] },
  { url: `api/${ENTITY_KEY__STAFF_USER_DATA}/\\d+/reset_password/`, allowed_methods: ['post'] },
  */
};
