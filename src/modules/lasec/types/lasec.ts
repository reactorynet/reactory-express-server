import { Moment } from 'moment';

/**
 * Meta type interface
 */
export interface Meta {
  mustSync: boolean;
  lastSync: number;
  nextSync: number;
  reference: String;
  owner: String;
}

export interface SimpleResponse {
  sucess: String
  message: String
}

export interface DashboardParams extends LasecDashboardSearchParams { };

export interface ProductDashboardParams extends LasecProductDashboardParams { };

export interface LasecCreateSectionHeaderArgs {
  [key: string]: any
}


export interface LasecQuoteUpdateSectionHeaderArgs {
  quote_id: String,
  header_id: String,
  header: String
}
export interface LasecDeleteSectionHeaderArgs {
  quote_id: String,
  header_id: String
}

export interface LasecDuplicateQuoteOptionArgs {
  quote_id: String,
  option_id: String
}

export interface LasecCreateSectionHeaderArgs {
  quote_id: String,
  header: String
}

export interface LasecAddProductToQuoteArgs {
  quote_id: String
  product_id: String
  option_id: String
}

export interface LasecQuoteItemUpdate {
  quote_id: String
  quote_item_id: String
  quote_item: LasecQuoteItem
}

export interface LasecQuoteOption {
  [key: string]: any
  id: String
  quote_option_id: String
  quote_id: String
  option_name?: String
  incoterm?: String
  named_place?: String
  transport_mode?: String
  currency?: String
  active?: Boolean
  lineItems?: [LasecQuoteItem]
}

export interface LasecQuoteHeader {
  [key: string]: any
}

export interface LasecProduct {
  [key: string]: any
  id: String
  name: String
  code: String
  description: String
  qtyAvailable: number
  qtyOnHand: number
  qtyOnOrder: number
  unitOfMeasure: String
  price: number
  priceAdditionalInfo: String
  image: String
  onSyspro: String
  landedPrice: number
  wh10CostPrice: number
  threeMonthAvePrice: number
  listPrice: number
  productPricing: any[]
  tenders: any[]
  contracts: any[]
  buyer: String
  buyerEmail: String
  planner: String
  plannerEmail: String
  isHazardous: String
  siteEvaluationRequired: String
  packedLength: number
  packedWidth: number
  packedHeight: number
  packedVolume: number
  packedWeight: number
  numberOfSalesOrders: number
  numberOfPurchaseOrders: number
  supplier: String
  model: String
  shipmentSize: number

  exWorksFactor: number
  productClass: String
  tariffCode: String
  leadTime: String
  validPriceUntil: String
  lastUpdated: String
  lastUpdatedBy: String
  lastOrdered: String
  lastReceived: String
  supplyCurrency: String
  listCurrency: String

  freightFactor: String
  clearingFactor: String
  actualCostwh10: String
  actualCostwh20: String
  actualCostwh21: String
  actualCostwh31: String
  supplierUnitPrice: String
  percDiscount: String
  discountPrice: String
  freightPrice: String
  exWorksPrice: String
  craftingFOC: String
  netFOB: String
  percDuty: String
  clearance: String
  landedCost: String
  markup: String
  sellingPrice: String

  onSpecial: Boolean
  currencyCode: String
  specialPrice: number

  notes: String
}

export interface LasecQuoteItem {
  [key: string]: any
  quote_item_id: String
  code: String
  title: String
  productClass: String
  productClassDescription: String
  quantity: Number
  price: Number
  discount: Number
  subtotal: Number
  totalVATExclusive: Number
  totalVATInclusive: Number
  VATRate: Number
  GP: Number
  header: LasecQuoteHeader
  note: String
  quote_option_id: String
  content: any
  product: LasecProduct
}

export interface Quote {
  id: string
  code: string
  meta: any
  [key: string]: any
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
  teamIds?: String[],
  repIds?: String[],
  status?: String[],
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


export interface Lasec360User {
  id: String
  code: String
  repId: String
  firstName: String
  lastName: String
  email: String
  company: String | 'LasecSA' | 'LasecInternational' | 'LasecEducation'
  roles: [ String ]
  target: Number
  targetPercent: Number
}

export interface Lasec360UserSearch {
  repIds: [ String ]
  emails: [ String ]
}

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface LasecNextActionsFilter {
  dateRange?: DateRange
  actioned?: Boolean
  actionType: String  
}

export interface LasecNewQuoteInput {
  clientId: String
  repCode: String  
}

export interface LasecNewQuoteInputArgs {
  newQuoteInput: LasecNewQuoteInput
}

export interface LasecNewQuoteResult {
  quoteId: String
  success:Boolean
  message: String
}
