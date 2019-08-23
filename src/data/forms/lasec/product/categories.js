import { defaultFormProps } from '../../defs';

const ProductCategoriesSchema = {
  title: 'Product Categories',
  description: 'Please select your category',
  type: 'array',
  items: {
    type: 'object',
    title: 'Category',
    description: 'Group of products that share common properties',
    properties: {
      id: {
        type: 'string',
        title: 'Category Id',
      },
      title: {
        type: 'string',
        title: 'Category Title',
      },
      count: {
        type: 'number',
        title: 'Count',
      },
    },
  },
};

const ProductSearchSchema = {
  title: 'Search Product',
  description: 'Enter at least 3 characters',
  type: 'string',
};

export default {
  id: 'ProductCategories',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Products',
  icon: 'check_circle_outline',
  tags: ['Product', 'Categories'],
  schema: {
    type: 'object',
    title: 'Product Categories',
    description: 'Search or Select a product category',
    properties: {
      search: ProductSearchSchema,
      result: ProductCategoriesSchema,
    },
  },
  widgetMap: [

  ],
  defaultFormValue: {
    search: '',
    result: [
      { id: 'autoclave', title: 'Autoclave', count: 0 },
      { id: 'balance', title: 'Balance', count: 0 },
      { id: 'biosafety', title: 'Biosafety Cabinet', count: 0 },
      { id: 'centrifuge', title: 'Centrifuge', count: 0 },
      { id: 'co2-incubator', title: 'CO2 Incubator', count: 0 },
      { id: 'fridge', title: 'Fridge', count: 0 },
      { id: 'freezer', title: 'Fume Hood', count: 0 },
      { id: 'heating-block', title: 'Heating Block', count: 0 },
      { id: 'incubator', title: 'Incubator', count: 0 },
    ],
  },
  components: [],
  registerAsComponent: true,
  name: 'ProductCategories',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        search: { md: 12, sm: 12, xs: 12 },
        result: { md: 12, sm: 12, xs: 12 },
      },
    ],
    search: {
      'ui:widget': 'SearchWidget',
      'ui:options': {
        autoSearch: true,
        minLength: 3,
      },
    },
    result: {
      items: {

      },
    },
  },
};
