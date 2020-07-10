export const FilterByEnumsKeys = {
  any_field: 'any_field',
  date_range: 'date_range',
  order_type: 'order_type',
  order_date: 'order_date',
  // order_status: 'order_status',
  shipping_date: 'shipping_date',
  iso_number: 'iso_number',
  po_number: 'po_number',
  customer: 'customer',
  client: 'client',
  dispatches: 'dispatches',
  quote_id: 'quote_id',
  quote_date: 'quote_date',
  sales_team_id: 'sales_team_id',
  // user_sales_team_id: 'user_sales_team_id',
  order_value: 'order_value',
  reserved_value: 'reserved_value',
  ship_value: 'shipped_value',
  backorder_value: 'back_order_value',
};

export const FilterByEnumArray: string[] = [
  FilterByEnumsKeys.any_field,
  FilterByEnumsKeys.order_date,
  FilterByEnumsKeys.shipping_date,
  FilterByEnumsKeys.iso_number,
  FilterByEnumsKeys.customer,
  FilterByEnumsKeys.client,
  FilterByEnumsKeys.po_number,
  FilterByEnumsKeys.order_value,
  // FilterByEnumsKeys.order_status,
];

export const FilterByOptions = [
  { key: FilterByEnumsKeys.any_field, value: FilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: FilterByEnumsKeys.date_range, value: FilterByEnumsKeys.date_range, label: 'Date Range' },
  { key: FilterByEnumsKeys.order_type, value: FilterByEnumsKeys.order_type, label: 'Order Type' },
  { key: FilterByEnumsKeys.order_date, value: FilterByEnumsKeys.order_date, label: 'Order Date' },
  // { key: FilterByEnumsKeys.order_status, value: FilterByEnumsKeys.order_status, label: 'Order Status' },
  { key: FilterByEnumsKeys.shipping_date, value: FilterByEnumsKeys.shipping_date, label: 'Req. Ship Date' },
  { key: FilterByEnumsKeys.iso_number, value: FilterByEnumsKeys.iso_number, label: 'ISO Number' },
  { key: FilterByEnumsKeys.po_number, value: FilterByEnumsKeys.po_number, label: 'PO Number' },
  { key: FilterByEnumsKeys.customer, value: FilterByEnumsKeys.customer, label: 'Customer' },
  { key: FilterByEnumsKeys.client, value: FilterByEnumsKeys.client, label: 'Client Name' },
  { key: FilterByEnumsKeys.dispatches, value: FilterByEnumsKeys.dispatches, label: 'Dispatches' },
  { key: FilterByEnumsKeys.quote_id, value: FilterByEnumsKeys.quote_id, label: 'Quote Number' },
  { key: FilterByEnumsKeys.quote_date, value: FilterByEnumsKeys.quote_date, label: 'Quote Date' },
  // { key: FilterByEnumsKeys.user_sales_team_id, value: FilterByEnumsKeys.user_sales_team_id, label: 'Sales Team' },
  { key: FilterByEnumsKeys.sales_team_id, value: FilterByEnumsKeys.sales_team_id, label: 'Sales Team' },
  { key: FilterByEnumsKeys.order_value, value: FilterByEnumsKeys.order_value, label: 'Order Value' },
  { key: FilterByEnumsKeys.ship_value, value: FilterByEnumsKeys.ship_value, label: 'Shipped Value' },
  { key: FilterByEnumsKeys.backorder_value, value: FilterByEnumsKeys.backorder_value, label: 'Backorder Value' },
  { key: FilterByEnumsKeys.reserved_value, value: FilterByEnumsKeys.reserved_value, label: 'Reserved Value' },
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
