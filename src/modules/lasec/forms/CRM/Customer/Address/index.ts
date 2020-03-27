import { Reactory } from '@reactory/server-core/types/reactory';
import AddressSchema from '../../Shared/Address';

// const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';
const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';

const baseUiSchema: any =  {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      physicalAddress: { sm: 12 },
    },
    {
      deliveryAddress: { sm: 12 },
    },
    {
      billingAddress: { sm: 12 },
    },
  ],
  physicalAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: {        
        viewMode: 'MAP_WITH_SEARCH|ADDRESS_LABEL',        
      },
      mapProps: {
        googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
      }
    }
  },  
  deliveryAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: {        
        viewMode: 'MAP_WITH_SEARCH|ADDRESS_LABEL',        
      },
      mapProps: {
        googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
      }
    }

  },
  billingAddress:{
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: {
        viewMode: 'MAP_WITH_SEARCH|ADDRESS_LABEL',
      },
      mapProps: {
        googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
      }
    }
  }
}

const displayUiSchema: any = {
  ...baseUiSchema
};


export const DisplayUISchema = displayUiSchema;


const editUiSchema: any = {
  ...baseUiSchema
};

export const EditUISchema = editUiSchema;

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      physicalAddress: { sm: 12 },
    },
    {
      deliveryAddress: { sm: 12 },
    },
    {
      billingAddress: { sm: 12 },
    },
  ],
  physicalAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget'
  },  
  deliveryAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget'
  },
  billingAddress:{
    'ui:widget': 'ReactoryGoogleMapWidget'
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    physicalAddress: { ...AddressSchema, title: 'Physical Address' },
    deliveryAddress: { ...AddressSchema, title: 'Delivery Address' },
    billingAddress: { ...AddressSchema, title: 'Billing Address' }
  }
};

const GOOGLE_MAPS_API_KEY: string = '<GOOGLE MAPS API KEY>';
//<GOOGLE MAPS API KEY>
const LasecCRMCustomerAddress: Reactory.IReactoryForm = {
  id: 'LasecCRMCustomerAddress',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Customer Lookup',
  tags: ['CRM Customer Lookup'],
  registerAsComponent: true,
  name: 'LasecCRMCustomerAddress',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: DisplayUISchema,
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
  ],
};

export default LasecCRMCustomerAddress;
