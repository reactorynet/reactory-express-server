import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'Consignee Details',
  properties: {
    companyName: {
      type: 'string',
      title: 'Company Name'
    },
    streetAddress: {
      type: 'string',
      title: 'Street Address'
    },
    suburb: {
      type: 'string',
      title: 'Suburb'
    },
    city: {
      type: 'string',
      title: 'City'
    },
    province: {
      type: 'string',
      title: 'Province'
    },
    country: {
      type: 'string',
      title: 'Country'
    },
  }
}

const uiSchema: any = {
  'ui:options': {
    toolbarPosition: 'none',
    componentType: "div",
    container: "div",
    showSubmit: false,
    showRefresh: false,
    containerStyles: {
      padding: '0px',
      marginTop: '16px',
      boxShadow: 'none'
    },
    style: {
      marginTop: '16px'
    }
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    marginBottom: '1.5rem',
    paddingBottom: '0.3rem'
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
    containerStyle: {}
  },
  'ui:grid-layout': [
    {
      // id: { md: 6, xs: 12 },
      companyName: { sm: 6, xs: 12 },
      streetAddress: { sm: 6, xs: 12 },
      suburb: { sm: 6, xs: 12 },
      city: { sm: 6, xs: 12 },
      province: { sm: 6, xs: 12 },
      country: { sm: 6, xs: 12 },
    },
  ],
  id: {},
  companyName: {},
  streetAddress: {},
  suburb: {},
  city: {},
  province: {},
  country: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      multiSelect: false,
      query: `query LasecGetCustomerCountries {
        LasecGetCustomerCountries {
          id
          name
        }
      }`,
      resultItem: 'LasecGetCustomerCountries',
      resultsMap: {
        'LasecGetCustomerCountries.[].id': ['[].key', '[].value'],
        'LasecGetCustomerCountries.[].name': '[].label',
      },
    },
  },
  // country: {
  //   'ui:widget': 'SelectWidget',
  //   'ui:options': {
  //     renderAsOptions: true,
  //     selectOptions: [
  //       { key: 'task', value: 'task', label: 'Country 1' },
  //       { key: 'milestone', value: 'milestone', label: 'Country 2' },
  //     ],
  //   },
  // },
};

const LasecFreightRequestCosigneeForm: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestCosigneeForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestCosigneeForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecFreightRequestCosigneeForm;
