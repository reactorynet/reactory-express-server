import { Moment } from 'moment';

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
  incoterm?: string
  named_place?: string
  transport_mode?: string
  currency?: string
  active?: Boolean
  lineItems?: [LasecQuoteItem]
}

export interface LasecQuoteHeader {
  [key: string]: any
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

export interface LasecQuoteItem {
  [key: string]: any
  quote_item_id: string
  code: string
  title: string
  productClass: string
  productClassDescription: string
  quantity: Number
  price: Number
  discount: Number
  subtotal: Number
  totalVATExclusive: Number
  totalVATInclusive: Number
  VATRate: Number
  GP: Number
  header: LasecQuoteHeader
  note: string
  quote_option_id: string
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


export interface Lasec360User {
  id: string
  code: string
  repId: string
  firstName: string
  lastName: string
  email: string
  company: string | 'LasecSA' | 'LasecInternational' | 'LasecEducation'
  roles: [ string ]
  target: Number
  targetPercent: Number
  sales_team_ids: [ string ]
}

export interface Lasec360UserSearch {
  repIds: [ string ]
  emails: [ string ]
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
  success:Boolean
  message: string
}