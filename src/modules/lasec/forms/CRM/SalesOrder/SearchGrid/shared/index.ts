export const FilterByEnumsKeys = {
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

export const FilterByEnumArray: string[] = [
  FilterByEnumsKeys.any_field,
  FilterByEnumsKeys.order_date,
  FilterByEnumsKeys.shipping_date,
  FilterByEnumsKeys.iso_number,
  FilterByEnumsKeys.customer,
  FilterByEnumsKeys.client,
  FilterByEnumsKeys.po_number,
  FilterByEnumsKeys.order_value,
  FilterByEnumsKeys.order_status,
];

export const FilterByOptions = [
  { key: FilterByEnumsKeys.any_field, value: FilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: FilterByEnumsKeys.order_status, value: FilterByEnumsKeys.order_status, label: 'Order Status' },
  { key: FilterByEnumsKeys.order_date, value: FilterByEnumsKeys.order_date, label: 'Order Date' },
  { key: FilterByEnumsKeys.shipping_date, value: FilterByEnumsKeys.shipping_date, label: 'Shipping Date' },
  { key: FilterByEnumsKeys.iso_number, value: FilterByEnumsKeys.iso_number, label: 'ISO Number' },
  { key: FilterByEnumsKeys.customer, value: FilterByEnumsKeys.customer, label: 'Customer' },
  { key: FilterByEnumsKeys.client, value: FilterByEnumsKeys.client, label: 'Client' },
  { key: FilterByEnumsKeys.po_number, value: FilterByEnumsKeys.po_number, label: 'Purchase Order Number' },
  { key: FilterByEnumsKeys.order_value, value: FilterByEnumsKeys.order_value, label: 'Order Value' },
];
