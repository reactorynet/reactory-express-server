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