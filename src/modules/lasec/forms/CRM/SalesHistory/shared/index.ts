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
