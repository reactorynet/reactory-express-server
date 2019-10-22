import { default as CrmDashboardForm,
} from './dashboard';

import {
  ProductEnquiry as ProductEnquiryForm
} from './product';

import TabbedQuoteList from './salesConfigurator/TabbedQuoteList'

import {
  QuoteIdInputForm,
  UpdateQuoteStatusForm ,
  QuoteDetailForm,
  QuoteListForm,
} from './quote';

import QuoteList from './salesConfigurator/QuoteList';

export default [
  CrmDashboardForm,
  ProductEnquiryForm,
  QuoteIdInputForm,
  QuoteListForm,
  QuoteDetailForm,
  UpdateQuoteStatusForm,
  TabbedQuoteList,
  QuoteList
];
