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
import ProductList from './salesConfigurator/Products';
import NewQuote from './salesConfigurator/NewQuote';
import CategoryDetail from './salesConfigurator/CategoryDetail';
import CaptureCategory from './salesConfigurator/CaptureCategory';
import CategoryList from './salesConfigurator/CategoryList';
import CreateCategoryFilter from './salesConfigurator/CreateCategoryFilter';
import CategoryFilterList from './salesConfigurator/CategoryFilterList';

export default [
  CrmDashboardForm,
  ProductEnquiryForm,
  QuoteIdInputForm,
  QuoteListForm,
  QuoteDetailForm,
  UpdateQuoteStatusForm,
  TabbedQuoteList,
  QuoteList,
  ProductList,
  NewQuote,
  CaptureCategory,
  CategoryDetail,
  CategoryList,
  CreateCategoryFilter,
  CategoryFilterList
];
