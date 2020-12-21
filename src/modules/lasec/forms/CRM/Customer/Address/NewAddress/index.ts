import { Reactory } from '@reactory/server-core/types/reactory';
import $graphql from './graphql';

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      margin: '0',
      padding: '0px',
      paddingBottom: '0'
    },
    style: {
      margin: '16',
    },
    submitIcon: 'check',
    showSubmit: true,
    showRefresh: false,    
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      unitNumber: { xs:12, sm: 12, md: 6, lg: 4 },
      unitName: { xs:12, sm: 12, md: 6, lg: 4 },
      floorNumber: { xs:12, sm: 12, md: 6, lg: 4 },
      buildingName: { xs:12, sm: 12, md: 6, lg: 4 },
      buildingType: { xs:12, sm: 12, md: 6, lg: 4 },
      streetNumber: { xs:12, sm: 12, md: 6, lg: 4 },
      streetName: { xs:12, sm: 12, md: 6, lg: 4 },
      suburb: { xs:12, sm: 12, md: 6, lg: 4 },
      city: { xs:12, sm: 12, md: 6, lg: 4 },
      metro: { xs:12, sm: 12, md: 6, lg: 4 },
      province: { xs:12, sm: 12, md: 6, lg: 4 },
      postalCode: { xs:12, sm: 12, md: 6, lg: 4 },
      country: { xs: 12, sm: 12, md: 6, lg: 4 },
      lat: { xs: 12, sm: 12, md: 6, lg: 4 },
      lng: { xs: 12, sm: 12, md: 6, lg: 4 },
      formatted_address: { xs: 12, sm: 12, md: 6, lg: 4 }
    },
  ],

  id: {},
  unitNumber: {},
  unitName: {},
  suburb: {},
  province: {},
  floorNumber: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },
      selectOptions: [
        {
          key: '1',
          value: '1',
          label: 'Ground Level',
        },
        {
          key: '2',
          value: '2',
          label: '1st Floor',
        },
        {
          key: '3',
          value: '3',
          label: '2nd Floor',
        },
        {
          key: '4',
          value: '4',
          label: '3rd Floor',
        },
        {
          key: '5',
          value: '5',
          label: '4th Floor',
        },
        {
          key: '6',
          value: '6',
          label: '5th Floor',
        },
        {
          key: '7',
          value: '7',
          label: '6th Floor',
        },
        {
          key: '8',
          value: '8',
          label: '8th Floor',
        },
        {
          key: '9',
          value: '9',
          label: '9th Floor',
        },
        {
          key: '10',
          value: '10',
          label: '10th Floor +',
        },
      ],
    },
  },
  postalCode: {},
  buildingName: {},
  buildingType: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      FormControl: {
        props: {
          style: {
            maxWidth: '400px'
          }
        }
      },
      selectOptions: [
        {
          key: '1',
          value: '1',
          label: 'Industrial Park',
        },
        {
          key: '2',
          value: '2',
          label: 'Multi-Level Building',
        },
        {
          key: '3',
          value: '3',
          label: 'Office Block',
        },
        {
          key: '4',
          value: '4',
          label: 'Office',
        },
        {
          key: '5',
          value: '5',
          label: 'Office Park',
        },
        {
          key: '6',
          value: '6',
          label: 'Other',
        },
        {
          key: '7',
          value: '7',
          label: 'Warehouse',
        },
        {
          key: '8',
          value: '8',
          label: 'School',
        },
      ],
    },
  },
  city: {},
  metro: {},
  streetNumber: {},
  streetName: {},
  country: {},
  lat: {
    'ui:options': {
      format: 'float',
    }
  },
  lng: {
    'ui:options': {
      format: 'float'
    }
  }
}

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  required: [
    "streetNumber",
    "streetName",
    "suburb",
    "postalCode",
    "province",
    "city",
    "metro",
    "country",
    "buildingType"
  ],
  properties: {
    id: {
      title: 'Id',
      type: 'string'
    },
    unitNumber: {
      title: 'Room/Unit Number',
      type: 'string'
    },
    unitName: {
      title: 'Unit Name',
      type: 'string'
    },
    suburb: {
      title: 'Suburb',
      type: 'string'
    },
    province: {
      title: 'Province',
      type: 'string'
    },
    floorNumber: {
      title: 'Floor Number',
      type: 'string'
    },
    postalCode: {
      title: 'Postal Code',
      type: 'string'
    },
    buildingName: {
      title: 'Complex/Building Name',
      type: 'string'
    },
    buildingType: {
      title: 'Building Description',
      type: 'string'
    },
    city: {
      title: 'City',
      type: 'string'
    },
    metro: {
      title: 'Metro',
      type: 'string'
    },
    streetName: {
      title: 'Street Name',
      type: 'string'
    },
    streetNumber: {
      title: 'Street Number',
      type: 'string'
    },
    country: {
      title: 'Country',
      type: 'string'
    },
    lat: {
      title: 'Lattitude',
      type: "number"
    },
    lng: {
      title: 'Longtitude',
      type: "number"
    },
    formatted_address: {
      type: 'string',
      title: "Display Address"
    }
  }
};

const LasecCRMNewCustomerAddress: Reactory.IReactoryForm = {
  id: 'LasecCRMNewCustomerAddress',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM New Customer Address',
  tags: ['CRM New Customer Address'],
  registerAsComponent: true,
  name: 'LasecCRMNewCustomerAddress',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql: $graphql,
  uiSchema: uiSchema,
  widgetMap: [],
};

export default LasecCRMNewCustomerAddress;
