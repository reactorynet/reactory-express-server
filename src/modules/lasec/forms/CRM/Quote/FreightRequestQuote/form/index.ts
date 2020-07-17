import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    title: {
      type: 'string',
      title: 'Title'
    },
    transportMode: {
      type: 'string',
      title: 'Transport Mode'
    },
    incoTerm: {
      type: 'string',
      title: 'Incoterm'
    },
    namedPlace: {
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
      title: 'Street Address'
    },
    city: {
      type: 'string',
      title: 'City'
    },
    // province: {
    //   type: 'string',
    //   title: 'Province'
    // },
    // country: {
    //   type: 'string',
    //   title: 'Country'
    // },
    // freightFoe: {
    //   type: 'array',
    //   title: 'Request Freight for:',
    //   items: {
    //     type: 'object',
    //     properties: {
    //       id: {
    //         type: 'string'
    //       },
    //       text: {
    //         type: 'string'
    //       }
    //     }
    //   }
    // },
    // offloadRequired: {
    //   type: 'boolean',
    //   title: 'Offloading Reuired?'
    // },
    // hazardous: {
    //   type: 'boolean',
    //   title: 'Hazardous?'
    // },
    // refrigerationRequired: {
    //   type: 'boolean',
    //   title: 'Refrigeration Required?'
    // },
    // containsLithium: {
    //   type: 'boolean',
    //   title: 'Contains Lithium Batteries?'
    // },
    // sample: {
    //   type: 'string',
    //   title: 'Sample/Repair'
    // },
    // additionalDetails: {
    //   type: 'string',
    //   title: 'Additional Delivery Details'
    // },
    // productDetails: {
    //   type: 'string',
    //   title: 'Product Details'
    // },
  }
}

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: true,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      marginTop: '16px'
    },
    style: {
      marginTop: '16px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      id: { md: 6, xs: 12 },
      title: { md: 6, xs: 12 },
      transportMode: { md: 6, xs: 12 },
      incoTerm: { md: 6, xs: 12 },
      namedPlace: { md: 6, xs: 12 },
      vatExempt: { md: 6, xs: 12 },
      fromSA: { md: 6, xs: 12 },
      totalValue: { md: 6, xs: 12 },
      companyName: { md: 6, xs: 12 },
      streetAddress: { md: 6, xs: 12 },
      suburb: { md: 6, xs: 12 },
      city: { md: 6, xs: 12 },
    },
  ],
  id: {},
  title: {},
  transportMode: {},
  incoTerm: {},
  namedPlace: {},
  vatExempt: {},
  fromSA: {},
  totalValue: {},
  companyName: {},
  streetAddress: {},
  suburb: {},
  city: {},
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
  widgetMap: [],
};

export default LasecFreightRequestOptionForm;
