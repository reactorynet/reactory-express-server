


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
