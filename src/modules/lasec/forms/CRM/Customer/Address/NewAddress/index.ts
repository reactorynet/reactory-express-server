import { Reactory } from '@reactory/server-core/types/reactory';

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
      unitNumber: { sm: 6 },
      suburb: { sm: 6 },
      floorNumber: { sm: 6 },
      postalCode: { sm: 6 },
      buildingName: { sm: 6 },
      state: { sm: 6 },
      buildingType: { sm: 6 },
    },
  ],

  unitNumber: {},
  suburb: {},
  floorNumber: {},
  postalCode: {},
  buildingName: {},
  state: {},
  buildingType: {},
  city: {},
  streetAddress: {},
  country: {},

}

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    physicalAddress: {
      title: 'Physical Address',
      properties: {
        id: {
          title: 'Id',
          type: 'string'
        },
        UnitNumber: {
          title: 'Room/Unit Number',
          type: 'string'
        },
        Suburb: {
          title: 'Suburb',
          type: 'string'
        },
        FloorNumber: {
          title: 'Floor Number',
          type: 'string'
        },
        PostalCode: {
          title: 'Postal Code',
          type: 'string'
        },
        BuildingName: {
          title: 'Complex/Building Name',
          type: 'string'
        },
        State: {
          title: 'State/Province',
          type: 'string'
        },
        BuildingType: {
          title: 'Building Type',
          type: 'string'
        },
        City: {
          title: 'City',
          type: 'string'
        },
        StreetAddress: {
          title: 'Street Address',
          type: 'string'
        },
        Country: {
          title: 'Country',
          type: 'string'
        },

      }
    },
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
  uiSchema: uiSchema,
  widgetMap: [],
};

export default LasecCRMNewCustomerAddress;
