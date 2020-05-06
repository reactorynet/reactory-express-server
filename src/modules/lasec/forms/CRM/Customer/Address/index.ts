import { Reactory } from '@reactory/server-core/types/reactory';
import AddressSchema from '../../Shared/Address';
import { newClientGraphQL } from './graphql';

// const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';
const GOOGLE_MAPS_API_KEY_DEVELOPMENT = '<GOOGLE MAPS API KEY>';

const GOOGLE_PLACE_TO_ADDRESS_MAP = {
  'address': 'fullAddress',
  'placeId': 'map.place_id'
};

const onAddressSelectedMutationDefinition : Reactory.IReactoryFormMutation = {
  name: "LasecUpdateNewClient",
  text: `mutation LasecUpdateNewClient($newClient: LasecNewClientInput!){
    LasecUpdateNewClient(newClient: $newClient) {
      id
      physicalAddress {
        id
        fullAddress
        map
      }
      deliveryAddress {
        id
        fullAddress
        map
      }
      billingAddress {
        id
        fullAddress
        map
      }
    }
  }`,
  objectMap: true,
  updateMessage: 'Updating new client address',
  variables: {
    'address': 'newClient.address',
  },
  refreshEvents: [
    {
      name: "NewClient.onAddressUpdated"
    }
  ],
  resultType: 'object',
  resultMap: {
    'address': 'address'
  }
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
  // onAddressSelected: onAddressSelectedMutationDefinition,
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
      physicalAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
      deliveryAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
      billingAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
    },
  ],
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
      physicalAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
      deliveryAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
      billingAddress: { xs: 12, sm: 12, md: 6, lg: 6 },
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

  billingAddress: {
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

const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  ...baseUiSchema
};

export const NewUiSchema = newUiSchema;


export const ReadOnlyUiSchema = readOnlySchema;

export const EditUISchema = editUiSchema;

const schema: Reactory.ISchema = {
  type: 'object',
  title: "Address Details",
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
  uiSchemas: [
    { id: 'view', key: 'view', icon: 'view', title: 'View', description: 'View Of Customer Address', uiSchema: DisplayUISchema },
    { id: 'edit', key: 'edit', icon: 'edit', title: 'Edit', description: 'Edit Of Customer Address', uiSchema: EditUISchema },
    { id: 'new', key: 'new', icon: 'new', title: 'New', description: 'Addresses for new customer', uiSchema: NewUiSchema },
  ],
  widgetMap: [
    { componentFqn: 'core.SlideOutLauncher@1.0.0', widget: 'SlideOutLauncher' },
  ],
};

export default LasecCRMCustomerAddress;
