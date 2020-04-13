import { Reactory } from '@reactory/server-core/types/reactory';
import AddressSchema from '../../Shared/Address';

// const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';
const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';

const GOOGLE_PLACE_TO_ADDRESS_MAP = {
  'formattedAddress': 'fullAddress',

};

const DEFAULT_ADDRESS_PROPS = {        
  viewMode: 'MAP_WITH_SEARCH|ADDRESS_LABEL',
  objectMap: GOOGLE_PLACE_TO_ADDRESS_MAP,
  checkExists: true,  
  query: `query LasecCheckAddressExists($input: Any!, $create: Boolean, $mapProvider: String){
    LasecCheckAddressExists(input: $input, create: $create, mapProvider: $mapProvider) {
      id
      fullAddress
      addressLine1
      addressLine2
      city
      zipCode
      state
      countryCode
      countryName
      lat
      long            
    }
  }`,
  variables: {
    'formData': 'input'
  },
  resultName: 'LasecCheckAddressExists',
  resultMap: {  
    '*':'*'
  }        
};

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
  /**
   * example of places result of google map search
   * this needs to be mapped back to the address object
   * we should also ship this with the address and give it a map provider key.
   * i.e. if we want to use bing maps instead of google.
   * {
      "formatted_address": "Caledon, 7230, South Africa",
      "geometry": {
        "location": {
          "lat": -34.2313845,
          "lng": 19.425233
        },
        "viewport": {
          "south": -34.2615278,
          "west": 19.3990309,
          "north": -34.2066349,
          "east": 19.4677109
        }
      },
      "icon": "https://maps.gstatic.com/mapfiles/place_api/icons/geocode-71.png",
      "id": "76f93413a21c1312bbc81b243794d90506667beb",
      "name": "Caledon",
      "photos": [
        {
          "height": 658,
          "html_attributions": [
            "<a href=\"https://maps.google.com/maps/contrib/104455262611922207473\">Mansoor Narker</a>"
          ],
          "width": 1052
        }
      ],
      "place_id": "ChIJqUGxCwv7zR0RekgKieocdIQ",
      "reference": "ChIJqUGxCwv7zR0RekgKieocdIQ",
      "types": [
        "locality",
        "political"
      ],
      "html_attributions": []
    }
   * 
   * 
   */
  physicalAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: DEFAULT_ADDRESS_PROPS,
      mapProps: {
        googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
      }
    }
  },  
  deliveryAddress: {
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: DEFAULT_ADDRESS_PROPS,
      mapProps: {
        googleMapURL: `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY_DEVELOPMENT}&v=3.exp&libraries=geometry,drawing,places`,
      }
    }
  },
  billingAddress:{
    'ui:widget': 'ReactoryGoogleMapWidget',
    'ui:options': {
      props: DEFAULT_ADDRESS_PROPS,
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


const readOnlySchema = { 
  ...baseUiSchema, 
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
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.fullAddress}',
      variant: 'subtitle1',
      title: 'Physical Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }    
    }
  },  
  deliveryAddress: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.fullAddress}',
      variant: 'subtitle1',
      title: 'Delivery Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }    
    }
  },
  billingAddress:{
    'ui:widget': 'LabelWidget',
    'ui:options': {
      format: '${formData.fullAddress}',
      variant: 'subtitle1',
      title: 'Billing Address',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '200px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }    
    }
  }
};

export const ReadOnlyUiSchema = readOnlySchema;

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
