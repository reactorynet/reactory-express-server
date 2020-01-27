import { default as SalesDashboard,
} from './salesDashboard';

import { default as ProductDashboard } from './productDashboard';

// import {
//   ProductEnquiry as ProductEnquiryForm
// } from './product';

import ProductQuery from './product/query';

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
import FilterResults from './salesConfigurator/FilterResults';
import NextActionDetail from './nextActionDetail';

export default [
  SalesDashboard,
  ProductDashboard,
  // ProductEnquiryForm,
  ProductQuery,
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
  CategoryFilterList,
  FilterResults,
  NextActionDetail
];
