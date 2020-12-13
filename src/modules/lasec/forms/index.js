import {
  LasecCRMPluginForm
} from './Global';

import {
  default as SalesDashboard,
} from './salesDashboard';


import { default as ProductDashboard } from './productDashboard';

// import {
//   ProductEnquiry as ProductEnquiryForm
// } from './product';

import ProductQuery from './product/query';

import TabbedQuoteList from './salesConfigurator/TabbedQuoteList'

import {
  QuoteIdInputForm,
  UpdateQuoteStatusForm,
  QuoteDetailForm,
  QuoteListForm,
  QuoteEmail,
  QuoteDuplicateClientSelector,
  NewQuoteClientSelector,
  QuoteEmailAttachmentWidget
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
import ProductDimensions from './productCatalog/ProductDimensions';
import ProductStock from './productCatalog/ProductStock';
import ProductSalesOrdersTab from './productCatalog/SalesOrders';
import ProductPurchaseOrdersTab from './productCatalog/PurchaseOrders';
import ProductCostings from './productCatalog/ProductCostings';
import ProductTenders from './productCatalog/ProductTenders';
import ProductContracts from './productCatalog/ProductContracts';


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

import ClientActivityQuotes from './CRM/Client/Activity/Quotes';
import ClientActivitySalesOrders from './CRM/Client/Activity/SalesOrders';
import ClientActivityInvoices from './CRM/Client/Activity/Invoices';
import ClientActivitySalesHistory from './CRM/Client/Activity/SalesHistory';

import ISODetail from './CRM/Client/Activity/ISODetail';

import CustomerDetails from './CRM/Customer/Detail';
import CustomerSpecialRequirement from './CRM/Customer/SpecialRequirements';
import CustomerAccountInfo from './CRM/Customer/Account';
import CustomerOrganizationInfo from './CRM/Customer/Organization';
import CustomerLookUp from './CRM/Customer/Lookup';
import CustomerLookUpForm from './CRM/Customer/Lookup/LookUpForm';
import CustomerAddress from './CRM/Customer/Address';
import NewCustomerAddress from './CRM/Customer/Address/NewAddress';
import LasecEditCustomerAddress from './CRM/Customer/Address/EditAddress';

import OrganizationLookup from './CRM/Organization/Lookup';
import OrganizationLookupForm from './CRM/Organization/Lookup/LookUpForm';
import NewOrganisation from './CRM/Organization/NewOrganisation';

import QuoteGrid from './CRM/Quote/SearchGrid';

import ClientLookup from './CRM/Client/Lookup';
import ClientLookupForm from './CRM/Client/Lookup/LookUpForm';

import SalesOrderGrid from './CRM/SalesOrder/SearchGrid';

import ProductSalesOrders from './productCatalog/ProductDetails/SalesOrders';
import ProductPurchaseOrders from './productCatalog/ProductDetails/PurchaseOrders';
import ProductPurchaseOrderItems from './productCatalog/ProductDetails/PurchaseOrders/OrderItems';

import ClientActivityCustomerLookUpForm from './CRM/Client/Activity/shared/CustomerLookup';

import LasecCRMISODetailHeader from './CRM/Client/Activity/ISODetail/sections/header';
import LasecCRMISODetailDeliveryDetails from './CRM/Client/Activity/ISODetail/sections/deliveryDetails';
import LasecCRMISODetailOrderSummary from './CRM/Client/Activity/ISODetail/sections/orderSummary';
import LasecCRMISODetailDocuments from './CRM/Client/Activity/ISODetail/sections/documents';
import LasecCRMISODetailDocumentUpload from './CRM/Client/Activity/ISODetail/sections/documents/upload';
import LasecCRMISODetailLineItems from './CRM/Client/Activity/ISODetail/sections/lineItems';
import LasecCRMISODetailComments from './CRM/Client/Activity/ISODetail/sections/comments';
import LasecCRMInvoiceGrid from './CRM/Invoice/SearchGrid';
import LasecCRMSalesHistoryGrid from './CRM/SalesHistory/SearchGrid';

import LasecCRMFreightRequestQuote from './CRM/Quote/FreightRequestQuote';
import LasecFreightRequestOptionForm from './CRM/Quote/FreightRequestQuote/forms/quoteOption';
import LasecFreightRequestCosigneeForm from './CRM/Quote/FreightRequestQuote/forms/cosigneeDetail';
import LasecFreightRequestConsignmentForm from './CRM/Quote/FreightRequestQuote/forms/consignmentDetail';
import LasecFreightRequestProductDetail from './CRM/Quote/FreightRequestQuote/forms/productDetail';

import LasecCRMQuoteHeaderForm from './CRM/Quote/QuoteHeader';
import LasecGenerateSalesOrderForm from './CRM/SalesOrder/GenerateSalesOrder';

const { LasecCRMEditClientDocuments, LasecCRMNewClientDocuments, LasecCRMViewClientDocuments } = LasecClientDocuments;

export default [
  LasecCRMPluginForm,
  SalesDashboard,
  ProductDashboard,
  ProductQuery,
  QuoteIdInputForm,
  QuoteListForm,
  QuoteEmail,
  QuoteEmailAttachmentWidget,
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
  ProductDimensions,
  ProductStock,
  ProductSalesOrdersTab,
  ProductPurchaseOrdersTab,
  ProductCostings,
  ProductQuantities,
  ProductTenders,
  ProductContracts,

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

  ClientActivityQuotes,
  ClientActivitySalesOrders,
  ClientActivityInvoices,
  ClientActivitySalesHistory,

  CustomerDetails,
  CustomerSpecialRequirement,
  CustomerAccountInfo,
  CustomerAddress,
  NewCustomerAddress,
  LasecEditCustomerAddress,
  CustomerOrganizationInfo,
  CustomerLookUp,
  CustomerLookUpForm,

  OrganizationLookup,
  OrganizationLookupForm,
  NewOrganisation,

  QuoteGrid,
  ClientLookup,
  ClientLookupForm,
  NewQuoteClientSelector,
  QuoteDuplicateClientSelector,

  SalesOrderGrid,

  ProductSalesOrders,
  ProductPurchaseOrders,
  ProductPurchaseOrderItems,
  ISODetail,

  ClientActivityCustomerLookUpForm,
  LasecCRMISODetailHeader,
  LasecCRMISODetailDeliveryDetails,
  LasecCRMISODetailOrderSummary,
  LasecCRMISODetailDocuments,
  LasecCRMISODetailDocumentUpload,
  LasecCRMISODetailLineItems,
  LasecCRMISODetailComments,
  LasecCRMInvoiceGrid,
  LasecCRMSalesHistoryGrid,
  LasecCRMFreightRequestQuote,
  LasecFreightRequestOptionForm,
  LasecFreightRequestCosigneeForm,
  LasecFreightRequestConsignmentForm,
  LasecFreightRequestProductDetail,

  LasecCRMQuoteHeaderForm,
  LasecGenerateSalesOrderForm
];
