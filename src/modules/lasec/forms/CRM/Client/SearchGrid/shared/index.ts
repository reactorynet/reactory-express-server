


export const FilterByEnumsKeys = {
  any_field: 'any_field',
  activity_status: 'activity_status',
  full_name: 'first_name',
  email: 'email',
  company_trading_name: 'company_trading_name',
  company_account_number: 'company_account_number',
  company_on_hold: 'company_on_hold',
  country: 'country',
  currency_symbol: 'currency_symbol',
  company_sales_team: 'company_sales_team',
};

export const FilterByEnumArray: string[] = [
  FilterByEnumsKeys.any_field,
  FilterByEnumsKeys.activity_status,
  FilterByEnumsKeys.company_account_number,
  FilterByEnumsKeys.company_on_hold,
  FilterByEnumsKeys.company_sales_team,
  FilterByEnumsKeys.company_trading_name,
  FilterByEnumsKeys.country,
  FilterByEnumsKeys.currency_symbol,
  FilterByEnumsKeys.email,
  FilterByEnumsKeys.full_name,
];

export const FilterByOptions =  [
  { key: 'any_field', value: FilterByEnumsKeys.any_field, label: 'All Categories' },
  { key: 'activity_status', value: FilterByEnumsKeys.activity_status, label: 'Client Status' },
  { key: 'full_name', value: FilterByEnumsKeys.full_name, label: 'Client Full name' },
  { key: 'email', value: FilterByEnumsKeys.email, label: 'Email Address' },
  { key: 'company_trading_name', value: FilterByEnumsKeys.company_trading_name, label: 'Customer' },
  { key: 'company_account_number', value: FilterByEnumsKeys.company_account_number, label: 'Account Number' },
  { key: 'activity_status', value: FilterByEnumsKeys.company_on_hold, label: 'Company Status' },
  { key: 'country', value: FilterByEnumsKeys.country, label: 'Country' },
  { key: 'currency', value: FilterByEnumsKeys.currency_symbol, label: 'Currency' },
  { key: 'company_sales_team', value: FilterByEnumsKeys.company_sales_team, label: 'Customer Rep Code' },
];
