import { Moment } from 'moment';
import { Reactory } from '@reactory/server-core/types/reactory';
import { PagingRequest, PagingResult, IReactoryDatabase } from '@reactory/server-core/database/types';

/**
 * Meta type interface
 */
export interface Meta {
  mustSync: boolean;
  lastSync: number;
  nextSync: number;
  reference: string;
  owner: string;
}

export interface SimpleResponse {
  success: boolean
  message: string
}

export interface DashboardParams extends LasecDashboardSearchParams { };

export interface ProductDashboardParams extends LasecProductDashboardParams { };

export interface LasecCreateSectionHeaderArgs {
  [key: string]: any
}


export interface LasecQuoteUpdateSectionHeaderArgs {
  quote_id: string,
  header_id: string,
  header: string
}
export interface LasecDeleteSectionHeaderArgs {
  quote_id: string,
  header_id: string
}

export interface LasecDuplicateQuoteOptionArgs {
  quote_id: string,
  option_id: string
}

export interface LasecCreateSectionHeaderArgs {
  quote_id: string,
  header: string
}

export interface LasecAddProductToQuoteArgs {
  quote_id: string
  product_id: string
  option_id: string
}

export interface LasecQuoteItemUpdate {
  quote_id: string
  quote_item_id: string
  quote_item: LasecQuoteItem
}

export interface LasecQuoteOption {
  [key: string]: any
  id: string
  quote_option_id: string
  quote_id: string
  option_name?: string
  inco_terms?: string
  named_place?: string
  transport_mode?: string
  currency?: string
  active?: boolean
  lineItems?: [LasecQuoteItem]
  must_delete?: boolean
  number_of_items?: number
  discount?: number
  discount_percent?: number
  total_ex_vat?: number
  total_incl_vat?: number
  gp: number
  gp_percent: number
  vat?: number
  vat_exempt?: boolean
  from_sa?: boolean
}

export interface LasecQuoteHeader {
  [key: string]: any
  header_id: string
  quote_id: string
  quote_item_id: number | string,
  text?: string
  heading: string
}

export interface LasecQuoteHeaderInput {
  quote_header_id: string
  quote_item_id: string
  heading: string
  action: string | "NEW" | "ADD_ITEM" | "REMOVE_ITEM" | "UPDATE_TEXT"
}


export interface LasecProduct {
  [key: string]: any
  id: string
  name: string
  code: string
  description: string
  qtyAvailable: number
  qtyOnHand: number
  qtyOnOrder: number
  unitOfMeasure: string
  price: number
  priceAdditionalInfo: string
  image: string
  onSyspro: string
  landedPrice: number
  wh10CostPrice: number
  threeMonthAvePrice: number
  listPrice: number
  productPricing: any[]
  tenders: any[]
  contracts: any[]
  buyer: string
  buyerEmail: string
  planner: string
  plannerEmail: string
  isHazardous: string
  siteEvaluationRequired: string
  packedLength: number
  packedWidth: number
  packedHeight: number
  packedVolume: number
  packedWeight: number
  numberOfSalesOrders: number
  numberOfPurchaseOrders: number
  supplier: string
  model: string
  shipmentSize: number

  exWorksFactor: number
  productClass: string
  tariffCode: string
  leadTime: string
  validPriceUntil: string
  lastUpdated: string
  lastUpdatedBy: string
  lastOrdered: string
  lastReceived: string
  supplyCurrency: string
  listCurrency: string

  freightFactor: string
  clearingFactor: string
  actualCostwh10: string
  actualCostwh20: string
  actualCostwh21: string
  actualCostwh31: string
  supplierUnitPrice: string
  percDiscount: string
  discountPrice: string
  freightPrice: string
  exWorksPrice: string
  craftingFOC: string
  netFOB: string
  percDuty: string
  clearance: string
  landedCost: string
  markup: string
  sellingPrice: string

  onSpecial: Boolean
  currencyCode: string
  specialPrice: number

  notes: string
}

export interface Lasec360QuoteLineItem {
  id: string,
  quote_id: string
  product_id: string
  code: string
  name: string
  quantity: number
  unit_price_cents: number
  total_price_cents: number
  total_discount_cents: number
  gp_percent: number
  mark_up: number
  actual_gp_percent: number
  total_discount_percent: number
  total_price_before_discount_cents: number
  note: string
  comment: string
  header_name?: string
  quote_item_type: string
  position: number
  requires_authorization?: boolean
  quote_option_id?: string
  included_in_quote_option?: boolean
  received_approval: boolean
  is_in_syspro: string,
  quote_heading_id?: string
  authorised_by_staff_user_id?: string
  authorised_by_staff_user_name?: string
  ignore_duplicates: boolean
  list_currency: string
  product_class: string
  product_class_description: string
  [s: string]: any
}

export interface LasecQuoteItemMeta extends Meta {
  source: Lasec360QuoteLineItem
}

export interface LasecQuoteItem {
  id: string
  [key: string]: any
  quote_item_id: string
  code: string
  title: string
  productClass: string
  productClassDescription: string
  quantity: number
  price: number
  discount: number
  subtotal: number
  totalVATExclusive: number
  totalVATInclusive: number
  VATRate: number
  GP: number
  header: LasecQuoteHeader
  note: string
  quote_option_id: string
  content: any
  product: LasecProduct
  meta: LasecQuoteItemMeta
  position: number
  freight: number
  agent_commission: number,

}

export interface RemoteDataMeta {
  mustSync: boolean
  owner: string
  reference: string
  source: any
  lastSync: Date
  nextSync: Date
}
export interface QuoteMeta extends RemoteDataMeta {
  source: Lasec360Quote
}

export interface LasecQuote {
  id: string
  code: string
  meta: QuoteMeta
  company: LasecCRMCustomer,
  customer: LasecClient,
  statusGroup: string,
  statusGroupName: string,
  allowedStatus: string[],
  options: LasecQuoteOption[],
  [key: string]: any
}

export interface ILasecOrganisation {
  id?: string
  name: string
  description?: string
}

type ExistingLasecOrgnisation = ILasecOrganisation & {
  id: string
  name: string
  description?: string
}

export interface ILasecCreateOrganisationArgs {
  customerId: string,
  name: string,
  description?: string
}
export interface LasecCreateNeworganisationResponse {
  organisation: ExistingLasecOrgnisation;
  success: boolean;
  message: string;
}




export interface LasecCRMCustomer {
  id: string
  registeredName?: string
  tradingName: string
  accountNumber?: string
  customerStatus?: string
  accountType?: string
  country?: string
  customerClass?: string
  description?: string
  ranking?: string
  availableBalance?: number
  salesTeam?: string
  physicalAddressId?: number
  physicalAddress?: string
  deliveryAddressId?: number
  deliveryAddress?: string
  billingAddressId?: number
  billingAddress?: string
  currencyCode?: string
  currencySymbol?: string
  currencyDisplay?: string
  registrationNumber?: string
  taxNumber?: string
  importVATNumber?: string
  creditLimit?: number
  currentBalance?: number
  currentInvoice?: number
  balance30Days?: number
  balance60Days?: number
  balance90Days?: number
  balance120Days?: number
  creditTotal?: number
  documents?: any[]
  [key: string]: any
}

export interface Lasec360Quote {
  quote_options: any[];
  id: string
  customer_id: string
  name?: string
  number_of_items: number
  description?: string

  currency_symbol: string,
  currency_id: string

  status: string
  status_name: string
  status_id: string,
  substatus_id: string
  allowed_status_ids: string[]

  organisation_id?: string | number
  grand_total_excl_vat_cents: number
  grand_total_vat_cents: number
  grant_total_incl_vat_cents: number
  grand_total_discount_cents: number
  grand_total_douscount_percent: number
  gp_percent: number
  actual_gp_percent: number

  date_sent?: Date
  created: Date
  modified: Date
  expiration_date: Date
  valid_until?: Date

  note?: string

  quote_option_ids: string[]
  site_inspection_status: boolean
  site_evaluation_required: boolean
  transportation_evaluation_required: boolean
  show_quote_totals: boolean
  primary_api_staff_user_id: string
  secondary_api_staff_user_id: string
  sales_team_id: string
  cc_self: boolean
  expired: boolean
  email?: string
  email_recipient_ids: string[]
  eta_of_order?: any
  can_create_sales_order: boolean
  quote_type: string
  requires_authorisation: boolean
  emailed_as_staff_user_id: string
  last_updated_as_staff_user_id: string
  authorisation_status: string
  on_hold: string | "Y" | "N"
  has_requested_authorisation: boolean
  is_quote_authorised: boolean
  is_quote_locked: boolean
  approvers_note: string
  request_auth_note: string
  company_id: string
  customer_full_name: string
  company_trading_name: string
  authorisation_requested_by_staff_user: string
  staff_user_full_name: string

}

export interface ProductClass {
  id: string
  name: string
}

export interface LasecAuthenticationPayload {
  token: string
  user_id: number
}

export interface LasecAuthenticationProps {
  username: string
  password: string
  status: string
  payload: LasecAuthenticationPayload
  lastStatus: string,
  activeCompany?: number
}

export interface LasecAuthentication {
  provider: string
  props: LasecAuthenticationProps
  lastLogin: Date
}


export enum USER_FILTER_TYPE {
  ME = "me",
  TEAM = "team",
  CUSTOM = "custom"
}

/**
 *  { key: 'today', value: 'today', label: 'Today' },
    { key: 'yesterday', value: 'yesterday', label: 'Yesterday' },
    { key: 'this-week', value: 'this-week', label: 'This Week' },
    { key: 'last-week', value: 'last-week', label: 'Last Week' },
    { key: 'this-month', value: 'this-month', label: 'This Month' },
    { key: 'last-month', value: 'last-month', label: 'Last Month' },
    { key: 'this-year', value: 'this-year', label: 'This Year' },
    { key: 'last-year', value: 'last-year', label: 'Last Year' },
    { key: 'custom', value: 'custom', label: 'Custom' },
 */
export enum DATE_FILTER_PRESELECT {
  TODAY = "today",
  YESTERDAY = "yesterday",
  THIS_WEEK = "this-week",
  LAST_WEEK = "last-week",
  THIS_MONTH = "this-month",
  LAST_MONTH = "last-month",
  THIS_YEAR = "this-year",
  LAST_YEAR = "last-year",
  CUSTOM = "custom",
};

export interface LasecDashboardSearchParams {
  period: DATE_FILTER_PRESELECT,
  periodStart?: Moment,
  periodEnd?: Moment,
  agentSelection: USER_FILTER_TYPE,
  teamIds?: string[],
  repIds?: string[],
  status?: string[],
  options?: any
};

export interface LasecProductDashboardParams extends LasecDashboardSearchParams {
  productClass: any[],
};

export interface LasecApiResponse {
  payload?: {
    ids?: string[] | number[],
    items?: any[],
    pagination?: {
      current_page: number,
      first_item_index: number,
      has_next_page: boolean,
      has_prev_page: boolean,
      last_item_index: number,
      num_items: number,
      num_pages: number,
      page_size: number,
    }
  },
  status: string | 'success' | 'failed',
  pagination?: {
    enabled: boolean
  },
};


/**
 *
activeCompany: "lasec_sa"
code: null
email: "werner.weber@lasec.com"
firstName: "Werner"
id: "367"
lastName: "Werner"
repCodes: ["LAB107"]
repId: "LAB107"
roles: null
signature: null
target: 33
 */

export interface Lasec360Credentials {
  username: string,
  password: string
  status: string | "success" | "error" | "failed",
  payload: {
    token: string
    user_id: number
  },
  lastStatus: number
}

export interface Lasec360User {
  id: string
  code: string
  repId: string
  firstName: string
  lastName: string
  email: string
  activeCompany: string | 'LasecSA' | 'LasecInternational' | 'LasecEducation';
  company: string | 'LasecSA' | 'LasecInternational' | 'LasecEducation'
  roles: [string]
  target: number
  targetPercent: number
  signature?: string
  sales_team_ids: [string]
  sales_team_id: string,
  user_type?: string | 'LasecSA' | 'LasecInternational' | 'LasecEducation';
}

export interface Lasec360UserSearch {
  repIds: [string]
  emails: [string]
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface LasecNextActionsFilter {
  dateRange?: DateRange
  actioned?: Boolean
  actionType: string
}

export interface LasecNewQuoteInput {
  clientId: string
  repCode: string
}

export interface LasecNewQuoteInputArgs {
  newQuoteInput: LasecNewQuoteInput
}

export interface LasecNewQuoteResult {
  quoteId: string
  success: Boolean
  message: string
}
export interface LasecNewQuoteResponse {
  quoteId: string
  quoteOptionId: string
  success: Boolean
  message: string
}

export interface LasecClient {
  id: string
  customer?: LasecCRMCustomer
  clientStatus?: string
  fullName?: string
  firstName?: string
  lastName?: string
  salesTeam?: string
  [p: string]: any
}


export interface LasecNewClientInput {
  id: string
  personalDetails: any
  contactDetails: any
  jobDetails: any
  customer: any
  organization: any
  address: any
  clientDocuments: [any]
  confirmed: boolean
  valid: boolean
  saved: boolean
  createdBy: any
  created: Date | Moment
  updated: Date | Moment
}

export interface LasecCreateQuoteOptionParams {
  quote_id: string,
  copy_from?: string
}

export interface LasecPatchQuoteOptionsParams {
  quote_id: string,
  option_id: string,
  option: LasecQuoteOption
}

export interface LasecDeleteQuoteOptionParams {
  quote_id: string,
  option_id: string
}

export interface LasecSalesOrderCreateResponse {
  success: boolean,
  message: string,
  iso_id: string,
  salesOrder: LasecSalesOrder
}

export interface LasecCreateSalesOrderInput {
  id: string
  quote_id: string
  sales_order_date: string
  purchase_order_number: string
  confirm_number: string
  customer_name: string
  company_name: string
  company_id: string
  rep_code: string
  vat_number: string
  quoted_amount: number
  amounts_confirmed: Boolean
  order_type: string
  preffered_warehouse: string
  shipping_date: Date
  part_supply: Boolean
  delivery_address: string
  delivery_address_tag: string,
  delivery_address_id: string,
  special_instructions: string
  special_instructions_warehouse: string
  on_day_contact: string
  method_of_contact: string
  contact_number: string
  document_context: string,
  documents: any[]
}


export interface LasecSalesOrder {
  id: string

  orderDate: string
  salesOrderNumber: string
  shippingDate: Date

  quoteId: string
  quoteDate: Date

  orderType: string
  orderStatus: string

  iso: number

  client: string
  customer: string
  crmCustomer: LasecCRMCustomer

  poNumber: string
  currency: string

  deliveryAddress: string | any
  deliveryNote: string
  warehouseNote: string

  salesTeam: string
  value: number
  reserveValue: number
  shipValue: number
  backorderValue: number

  dispatchCount: number
  invoiceCount: number

  invoices: any[]
  dispatches: any[]
  documentIds: any[]
  documents: any[]

  orderQty: number
  shipQty: number
  reservedQty: number
  backOrderQty: number

  details: {
    lineItems: any[],
    comments: any[]
  }
}

export interface LasecAddress {
  id: string
  fullAddress?: string
  formatted_address?: string

  unit_number?: string
  unit_name?: string,

  street_name?: string
  street_number?: string

  suburb?: string
  city?: string
  metro?: string

  postal_code: string

  building_description_id?: number
  building_description?: string

  building_floor_number_id?: number
  building_floor_description?: string

  province_id?: string
  province_name?: string

  country_id?: string
  country_name?: string

  lat?: string | number
  lng?: string | number
  created_by?: string
  last_edited_by?: string
  map?: any

  linked_companies_count?: number,
  linked_companies?: LasecCRMCustomer[]

  linked_clients_count?: number,
  linked_clients?: LasecClient[]

  linked_sales_order_count: number,
  linked_sales_orders?: LasecSalesOrder[]

  linked_invoices_count: number,
  linked_invoices?: any[]

}

export interface LasecAddressUpdateResponse { success: boolean, message: string, address: LasecAddress }

export interface IQuoteService extends Reactory.Service.IReactoryContextAwareService {

  /**
   * Sends an email to the list of users regarding the quote with the quote id.
   * @param quote_id
   * @param subject
   * @param message
   * @param to
   * @param attachments
   */
  sendQuoteEmail(quote_id: string, subject: string, message: string, to: Reactory.ToEmail[], cc: Reactory.ToEmail[], bcc: Reactory.ToEmail[], attachments?: Reactory.EmailAttachment[], from?: Lasec360User): Promise<Reactory.EmailSentResult>;


  /**
   * Get quote for quote id
   * @param quote_id
   */
  getQuoteById(quote_id: string): Promise<LasecQuote>;

  getQuoteEmail(quote_id: string, email_type: string): Promise<Reactory.IEmailMessage>;

  setQuoteEmail(quote_id: string, email_type: string, message: Reactory.IEmailMessage): Promise<Reactory.IEmailMessage>

  createNewQuoteOption(quote_id: string): Promise<LasecQuoteOption>;

  patchQuoteOption(quote_id: string, quote_option_id: string, option: LasecQuoteOption): Promise<LasecQuoteOption>

  deleteQuoteOption(quote_id: string, quote_option_id: string): Promise<SimpleResponse>;

  copyQuoteOption(quote_id: string, quote_option_id: string): Promise<LasecQuoteOption>;

  getQuoteOptionDetail(quote_id: string, option_id: string): Promise<LasecQuoteOption>;

  getQuoteOptionsDetail(quote_id: string, option_ids: string[]): Promise<LasecQuoteOption[]>;

  getIncoTerms(): Promise<any>;

  getCurrencies(): Promise<LasecCurrency[]>

  getQuoteHeaders(quote_id: string): Promise<any>;

  getQuoteTransportModes(): Promise<any>;

  createSalesOrder(sales_order_input: LasecCreateSalesOrderInput): Promise<LasecSalesOrderCreateResponse>;

  getSalesOrder(sales_order_id: String): Promise<LasecSalesOrder>
}

export interface ILasecClientService extends Reactory.Service.IReactoryContextAwareService {

  /**
   * Returns a lasec client object
   * @param id
   */
  getClientById(id: string): Promise<LasecClient>;
}

export interface ILasecLoggingService extends Reactory.Service.IReactoryContextAwareService {
  writeLog(messsage: string, source?: string, severity?: number, data?: any): void
}

export interface LasecGetFreightRequestQuoteParams {
  quoteId: string
}

export interface FreightRequestProductDetail {
  _dimensions?: {
    length: number
    width: number
    height: number
    volume: number
    weight: number
  },
  code: string
  description: string
  unitOfMeasure: string
  sellingPrice: number
  qty: number
  weight: number,
  length: number
  width: number
  height: number
  volume: number
}

export interface FreightRequestOption {
  id: string
  name: string
  transportMode: String
  incoTerm: String
  place: String
  fromSA: Boolean
  vatExempt: Boolean
  totalValue: String
  companyName: String
  streetAddress: String
  suburb: String
  city: String
  province: String
  country: String
  freightFor: String
  offloadRequired: Boolean
  hazardous: String
  refrigerationRequired: Boolean
  containsLithium: Boolean
  sample: String
  deliveryNote: String,
  item_paging: PagingResult,
  productDetails: FreightRequestProductDetail[]
}

export interface FreightRequestQuoteDetail {
  id: string
  email: string
  communicationMethod: string
  options: FreightRequestOption[]
}

export interface LasecAPIParams {
  filter?: any
  ordering?: {
    [key: string]: string | "asc" | "desc"
  },
  pagination?: {
    enabled?: boolean,
    page_size?: number,
    current_page?: number
  },
  format?: any
}

export interface LasecTransportationMode {
  id: string,
  title: string
}

export interface LasecGetPageQuotesParams {
  search: string
  paging: PagingRequest,
  filterBy: string
  filter: string
  periodStart: string
  periodEnd: string
  quoteDate: string
  orderBy: string
  orderDirection: string
  iter: number
}

export interface LasecInternationalExportDocument {
  id: String
  pdf_url: String
  emailAddress: String
  sendOptionsVia: String

  date_of_issue: Date
  certification: Date
  date_of_expiry: Date
  date_of_expiry_na: Boolean

  terms: String
  final_destination: String
  export_reason: String
  document_number: String
  inco_terms: String
  po_number: String

  bill_to_company: String
  bill_to_street_address: String
  bill_to_suburb: String
  bill_to_city: String
  bill_to_province: String
  bill_to_country: String

  ship_to_company: String
  ship_to_street_address: String
  ship_to_suburb: String
  ship_to_city: String
  ship_to_province: String
  ship_to_country: String

  consignee_company: String
  consignee_street_address: String
  consignee_suburb: String
  consignee_city: String
  consignee_province: String
  consignee_country: String
  consignee_contact: String
  consignee_number: String

  notify_company: String
  notify_street_address: String
  notify_suburb: String
  notify_city: String
  notify_province: String
  notify_country: String
  notify_contact: String
  notify_number: String

  comments: String

  lookups: any

  products: any[]
}
export interface LasecCertificateOfConformance extends LasecInternationalExportDocument { }

export interface LasecCommercialInvcoice extends LasecInternationalExportDocument { }

export interface LasecPackingList extends LasecInternationalExportDocument { }

export interface LasecCertificateOfConformanceResponse {
  message: string
  success: boolean
  certificate: LasecCertificateOfConformance
}

export interface LasecCommercialInvoiceResponse {
  message: string
  success: boolean
  commercial_invoice: LasecCommercialInvcoice
}

export interface LasecPackingListResponse {
  message: string
  success: boolean
  packing_list: LasecPackingList
}

export interface LasecCurrency {
  id: number
  code: string
  name: string
  symbol: string
  spot_rate: number
  web_rate: number
}

export interface LasecLogData {
  timestamp: number
  username: string
  message: string
  data: any
  severity: number
  source: string
}


export interface LasecDatabase extends IReactoryDatabase {
  Install: {
    LasecLog: (context: Reactory.IReactoryContext) => Promise<boolean>
  },
  Create: {
    WriteLog: (value: LasecLogData, context: Reactory.IReactoryContext) => Promise<boolean>
  },
  Read: {
    LasecGetCurrencies: (queryCommand: any, context: Reactory.IReactoryContext) => Promise<LasecCurrency[]>
  }
}

export interface ILasecContextProvider extends Reactory.Service.IReactoryContextAwareService, Reactory.IExecutionContextProvider { }