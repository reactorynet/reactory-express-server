import { Reactory } from '@reactory/server-core/types/reactory'

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'Quote Option Details',
  properties: {
    productDetails: {
      type: 'string'
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
  'ui:grid-layout': [
    {
      productDetails: { md: 6, xs: 12 },
    },
  ],
  productDetails: {
    'ui:widget': 'ProductDetailWidget',
    'ui:options': {
      props: {},
      componentPropsMap: {
        'formContext.$formData.productDetails': 'formData.productDetails',
        'formData': 'formData.productDetails',
      },
      propsMap: {
        'formData': 'formData.productDetails',
      }
    }
  }

};

const LasecFreightRequestProductDetail: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestProductDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Products',
  tags: ['CRM Lasec Freight Request Products'],
  registerAsComponent: true,
  name: 'LasecFreightRequestProductDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'lasec.FreightRequestProductDetailComponent@1.0.0', widget: 'ProductDetailWidget' },
  ],
};

export default LasecFreightRequestProductDetail;
