export const FilterByEnumsKeys = {
  any_field: 'any_field',
};

export const FilterByEnumArray: string[] = [
  FilterByEnumsKeys.any_field,
];

export const FilterByOptions = [
  { key: FilterByEnumsKeys.any_field, value: FilterByEnumsKeys.any_field, label: 'All Categories' },
];

export const FilterOptions = [
  { key: '1', value: '1', label: 'Open Order' },
  { key: '2', value: '2', label: 'Open Back Order' },
  { key: '3', value: '3', label: 'Released Back Order' },
  { key: '4', value: '4', label: 'In Warehouse' },
  { key: '5', value: '9', label: 'Completed' },
  { key: '6', value: '\\', label: 'Cancelled' },
  { key: '7', value: 'S', label: 'Suspense' },
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
