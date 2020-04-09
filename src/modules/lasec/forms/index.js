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
  QuoteEmail,
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
import QuoteNoteDetail from './quote/QuoteNoteDetail';

import TabbedProductList from './productCatalog/TabbedContainer';
import ProductOverview from './productCatalog/ProductOverview';
import ProductPricing from './productCatalog/ProductPricing';
import ProductDetail from './productCatalog/ProductDetails';
import ProductQuantities from './productCatalog/ProductQuantities';

import TabbedCrmForm from './CRM/TabbedLayout';
import ClientGrid from './CRM/Client/SearchGrid';
import ClientDetail from './CRM/Client/Details';
import ClientOverviewWidget from './CRM/Client/OverviewWidget';


import ClientPersonalInformation from './CRM/Client/Personal';
import ClientContact from './CRM/Client/Contact';
import ClientJobDetail from './CRM/Client/JobDetail';
import ClientComments from './CRM/Client/Comments';
import LasecClientDocuments from './CRM/Client/Documents';
import NewClient from './CRM/Client/NewClient';
import NewClientConfirmAndSave from './CRM/Client/NewCustomerConfirm';

import CustomerDetails from './CRM/Customer/Detail';
import CustomerSpecialRequirement from './CRM/Customer/SpecialRequirements';
import CustomerAccountInfo from './CRM/Customer/Account';
import CustomerOrganizationInfo from './CRM/Customer/Organization';
import CustomerLookUp from './CRM/Customer/Lookup';
import CustomerLookUpForm from './CRM/Customer/Lookup/LookUpForm';
import CustomerAddress from './CRM/Customer/Address';

import OrganizationLookup from './CRM/Organization/Lookup';
import OrganizationLookupForm from './CRM/Organization/Lookup/LookUpForm';
import NewOrganisation from './CRM/Organization/NewOrganisation';

const { LasecCRMEditClientDocuments, LasecCRMNewClientDocuments, LasecCRMViewClientDocuments } = LasecClientDocuments;

export default [
  SalesDashboard,
  ProductDashboard,
  // ProductEnquiryForm,
  ProductQuery,
  QuoteIdInputForm,
  QuoteListForm,
  QuoteEmail,
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
  NextActionDetail,
  QuoteNoteDetail,

  TabbedProductList,
  ProductOverview,
  ProductPricing,
  ProductDetail,
  ProductQuantities,

  TabbedCrmForm,
  ClientPersonalInformation,
  ClientContact,
  ClientJobDetail,
  ClientComments,
  LasecCRMViewClientDocuments,
  LasecCRMNewClientDocuments,
  LasecCRMEditClientDocuments,
  ClientGrid,
  ClientDetail,
  ClientOverviewWidget,
  NewClient,
  NewClientConfirmAndSave,

  CustomerDetails,
  CustomerSpecialRequirement,
  CustomerAccountInfo,
  CustomerAddress,
  CustomerOrganizationInfo,
  CustomerLookUp,
  CustomerLookUpForm,

  OrganizationLookup,
  OrganizationLookupForm,
  NewOrganisation
];
