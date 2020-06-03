// GENERAL

export const FilterByEnumsKeys = {
  any_field: 'any_field',
  date_range: 'date_range',
  quote_number: 'quote_number',
  quote_date: 'quote_date',
  quote_status: 'quote_status',
  total_value: 'total_value',
  client: 'client',
  customer: 'customer',
  account_number: 'account_number',
  quote_type: 'quote_type',
  rep_code: 'rep_code',
};

export const FilterByEnumArray: string[] = [
  FilterByEnumsKeys.any_field,
  FilterByEnumsKeys.date_range,
  FilterByEnumsKeys.quote_number,
  FilterByEnumsKeys.quote_date,
  FilterByEnumsKeys.quote_status,
  FilterByEnumsKeys.total_value,
  FilterByEnumsKeys.client,
  FilterByEnumsKeys.customer,
  FilterByEnumsKeys.account_number,
  FilterByEnumsKeys.quote_type,
  FilterByEnumsKeys.rep_code,
];

export const FilterByOptions = [
  { key: FilterByEnumsKeys.any_field, value: FilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: FilterByEnumsKeys.date_range, value: FilterByEnumsKeys.date_range, label: 'Date Range' },
  { key: FilterByEnumsKeys.quote_number, value: FilterByEnumsKeys.quote_number, label: 'Quote Number' },
  { key: FilterByEnumsKeys.quote_date, value: FilterByEnumsKeys.quote_date, label: 'Quote Date' },
  { key: FilterByEnumsKeys.quote_status, value: FilterByEnumsKeys.quote_status, label: 'Quote Status' },
  { key: FilterByEnumsKeys.total_value, value: FilterByEnumsKeys.total_value, label: 'Total Quote Value' },
  { key: FilterByEnumsKeys.client, value: FilterByEnumsKeys.client, label: 'Client' },
  { key: FilterByEnumsKeys.customer, value: FilterByEnumsKeys.customer, label: 'Customer' },
  { key: FilterByEnumsKeys.account_number, value: FilterByEnumsKeys.account_number, label: 'Account Number' },
  { key: FilterByEnumsKeys.quote_type, value: FilterByEnumsKeys.quote_type, label: 'Quote Type' },
  { key: FilterByEnumsKeys.rep_code, value: FilterByEnumsKeys.rep_code, label: 'Rep Code' },
];

// SALES ORDERS

export const SalesOrdersFilterByEnumsKeys = {
  any_field: 'any_field',
  order_date: 'order_date',
  shipping_date: 'shipping_date',
  iso_number: 'iso_number',
  customer: 'customer',
  client: 'client',
  po_number: 'po_number',
  order_value: 'order_value',
  order_status: 'order_status',
};

export const SalesOrdersFilterByEnumArray: string[] = [
  SalesOrdersFilterByEnumsKeys.any_field,
  SalesOrdersFilterByEnumsKeys.order_date,
  SalesOrdersFilterByEnumsKeys.shipping_date,
  SalesOrdersFilterByEnumsKeys.iso_number,
  SalesOrdersFilterByEnumsKeys.customer,
  SalesOrdersFilterByEnumsKeys.client,
  SalesOrdersFilterByEnumsKeys.po_number,
  SalesOrdersFilterByEnumsKeys.order_value,
  SalesOrdersFilterByEnumsKeys.order_status,
];

export const SalesOrdersFilterByOptions = [
  { key: SalesOrdersFilterByEnumsKeys.any_field, value: SalesOrdersFilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: SalesOrdersFilterByEnumsKeys.order_status, value: SalesOrdersFilterByEnumsKeys.order_status, label: 'Order Status' },
  { key: SalesOrdersFilterByEnumsKeys.order_date, value: SalesOrdersFilterByEnumsKeys.order_date, label: 'Order Date' },
  { key: SalesOrdersFilterByEnumsKeys.shipping_date, value: SalesOrdersFilterByEnumsKeys.shipping_date, label: 'Shipping Date' },
  { key: SalesOrdersFilterByEnumsKeys.iso_number, value: SalesOrdersFilterByEnumsKeys.iso_number, label: 'ISO Number' },
  { key: SalesOrdersFilterByEnumsKeys.customer, value: SalesOrdersFilterByEnumsKeys.customer, label: 'Customer' },
  { key: SalesOrdersFilterByEnumsKeys.client, value: SalesOrdersFilterByEnumsKeys.client, label: 'Client' },
  { key: SalesOrdersFilterByEnumsKeys.po_number, value: SalesOrdersFilterByEnumsKeys.po_number, label: 'Purchase Order Number' },
  { key: SalesOrdersFilterByEnumsKeys.order_value, value: SalesOrdersFilterByEnumsKeys.order_value, label: 'Order Value' },
];

// INVOICES

export const InvoiceFilterByEnumsKeys = {
  any_field: 'any_field',
  invoice_date: 'invoice_date',
  quote_date: 'quote_date',
  quote_number: 'quote_number',
  account_number: 'account_number',
  customer: 'customer',
  client: 'client',
  rep_code: 'rep_code',
  po_number: 'po_number',
};

export const InvoiceFilterByEnumArray: string[] = [
  InvoiceFilterByEnumsKeys.any_field,
  InvoiceFilterByEnumsKeys.invoice_date,
  InvoiceFilterByEnumsKeys.quote_date,
  InvoiceFilterByEnumsKeys.quote_number,
  InvoiceFilterByEnumsKeys.account_number,
  InvoiceFilterByEnumsKeys.customer,
  InvoiceFilterByEnumsKeys.client,
  InvoiceFilterByEnumsKeys.rep_code,
  InvoiceFilterByEnumsKeys.po_number,
];

export const InvoiceFilterByOptions = [
  { key: InvoiceFilterByEnumsKeys.any_field, value: InvoiceFilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: InvoiceFilterByEnumsKeys.invoice_date, value: InvoiceFilterByEnumsKeys.invoice_date, label: 'Invoice Date' },
  { key: InvoiceFilterByEnumsKeys.quote_date, value: InvoiceFilterByEnumsKeys.quote_date, label: 'Quote Date' },
  { key: InvoiceFilterByEnumsKeys.quote_number, value: InvoiceFilterByEnumsKeys.quote_number, label: 'Quote Number' },
  { key: InvoiceFilterByEnumsKeys.account_number, value: InvoiceFilterByEnumsKeys.account_number, label: 'Account Number' },
  { key: InvoiceFilterByEnumsKeys.customer, value: InvoiceFilterByEnumsKeys.customer, label: 'Customer' },
  { key: InvoiceFilterByEnumsKeys.client, value: InvoiceFilterByEnumsKeys.client, label: 'Client' },
  { key: InvoiceFilterByEnumsKeys.rep_code, value: InvoiceFilterByEnumsKeys.rep_code, label: 'Rep Code' },
  { key: InvoiceFilterByEnumsKeys.po_number, value: InvoiceFilterByEnumsKeys.po_number, label: 'PO Number' },
];


// SALES HISTORY

export const SalesHistoryFilterByEnumsKeys = {
  any_field: 'any_field',
  order_type: 'order_type',
  order_date: 'order_date',
  quote_date: 'quote_date',
  quote_number: 'quote_number',
  iso_number: 'iso_number',
  customer: 'customer',
  client: 'client',
  po_number: 'po_number',
  order_value: 'order_value',
  rep_code: 'rep_code',
};

export const SalesHistoryFilterByEnumArray: string[] = [
  SalesHistoryFilterByEnumsKeys.any_field,
  SalesHistoryFilterByEnumsKeys.order_type,
  SalesHistoryFilterByEnumsKeys.order_date,
  SalesHistoryFilterByEnumsKeys.quote_date,
  SalesHistoryFilterByEnumsKeys.quote_number,
  SalesHistoryFilterByEnumsKeys.iso_number,
  SalesHistoryFilterByEnumsKeys.customer,
  SalesHistoryFilterByEnumsKeys.client,
  SalesHistoryFilterByEnumsKeys.po_number,
  SalesHistoryFilterByEnumsKeys.order_value,
  SalesHistoryFilterByEnumsKeys.rep_code,
];

export const SalesHistoryFilterByOptions = [
  { key: SalesHistoryFilterByEnumsKeys.any_field, value: SalesHistoryFilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: SalesHistoryFilterByEnumsKeys.order_type, value: SalesHistoryFilterByEnumsKeys.order_type, label: 'Order Type' },
  { key: SalesHistoryFilterByEnumsKeys.order_date, value: SalesHistoryFilterByEnumsKeys.order_date, label: 'Order Date' },
  { key: SalesHistoryFilterByEnumsKeys.quote_date, value: SalesHistoryFilterByEnumsKeys.quote_date, label: 'Quote Date' },
  { key: SalesHistoryFilterByEnumsKeys.quote_number, value: SalesHistoryFilterByEnumsKeys.quote_number, label: 'Quote Number' },
  { key: SalesHistoryFilterByEnumsKeys.iso_number, value: SalesHistoryFilterByEnumsKeys.iso_number, label: 'ISO Number' },
  { key: SalesHistoryFilterByEnumsKeys.customer, value: SalesHistoryFilterByEnumsKeys.customer, label: 'Customer' },
  { key: SalesHistoryFilterByEnumsKeys.client, value: SalesHistoryFilterByEnumsKeys.client, label: 'Client' },
  { key: SalesHistoryFilterByEnumsKeys.po_number, value: SalesHistoryFilterByEnumsKeys.po_number, label: 'Purchase Order Number' },
  { key: SalesHistoryFilterByEnumsKeys.order_value, value: SalesHistoryFilterByEnumsKeys.order_value, label: 'Order Value' },
  { key: SalesHistoryFilterByEnumsKeys.rep_code, value: SalesHistoryFilterByEnumsKeys.rep_code, label: 'Rep Code' },
];
