import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'Quote Option Details',
  properties: {
    transportMode: {
      type: 'string',
      title: 'Transport Mode'
    },
    incoTerm: {
      type: 'string',
      title: 'Incoterm'
    },
    place: {
      type: 'string',
      title: 'Named Place'
    },
    vatExempt: {
      type: 'boolean',
      title: 'If DDP, is the importer duty/VAT exempt?'
    },
    fromSA: {
      type: 'boolean',
      title: 'If FCA, is the customer exporting from SA via road freight?'
    },
    totalValue: {
      type: 'string',
      title: 'Total Value of Order'
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
      marginTop: '16px',
      boxShadow: 'none'
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
      transportMode: { sm: 6, xs: 12 },
      incoTerm: { sm: 6, xs: 12 },
      namedPlace: { sm: 6, xs: 12 },
      vatExempt: { sm: 6, xs: 12 },
      fromSA: { sm: 6, xs: 12 },
      totalValue: { sm: 6, xs: 12 },
    },
  ],
  id: {},
  transportMode: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      renderAsOptions: true,
      selectOptions: [
        { key: 'road', value: 'road', label: 'Road' },
        { key: 'rail', value: 'rail', label: 'Rail' },
        { key: 'air', value: 'air', label: 'Air' },
      ],
    },
  },
  incoTerm: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      renderAsOptions: true,
      selectOptions: [
        { key: '1', value: '1', label: 'Option 1' },
        { key: '2', value: '2', label: 'Option 2' },
        { key: '3', value: '3', label: 'Option 3' },
        { key: '4', value: '4', label: 'Option 4' },
      ],
    },
  },
  namedPlace: {},
  vatExempt: {},
  fromSA: {},
  totalValue: {
    'ui:widget': 'StyledCurrencyLabel',
    'ui:options': {
      inlineLabel: false,
      label: "Total Value:"
    },
  },
  // totalValue: {
  //   'ui:options': {
  //     readOnly: true,
  //   },
  // },

};

const LasecFreightRequestOptionForm: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestOptionForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestOptionForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
  ],
};

export default LasecFreightRequestOptionForm;
