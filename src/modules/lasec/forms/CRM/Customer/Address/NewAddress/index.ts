import { Reactory } from '@reactory/server-core/types/reactory';
import $graphql from './graphql';

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      margin: '0',
      padding: '0px',
      paddingBottom: '16px'
    },
    style: {
      margin: '16',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      unitNumber: { sm: 6 },
      unitName: { sm: 6 },
      suburb: { sm: 6 },
      metro: { sm: 6 },
      province: { sm: 6 },
      floorNumber: { sm: 6 },
      postalCode: { sm: 6 },
      buildingName: { sm: 6 },
      state: { sm: 6 },
      buildingType: { sm: 6 },
      city: { sm: 6 },
      streetNumber: { sm: 6 },
      streetName: { sm: 6 },
      country: { sm: 6 },
    },
  ],

  unitNumber: {},
  unitName: {},
  suburb: {},
  metro: {},
  province: {},
  floorNumber: {},
  postalCode: {},
  buildingName: {},
  state: {},
  buildingType: {},
  city: {},
  streetNumber: {},
  streetName: {},
  country: {},

}

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
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
      title: 'UnitName',
      type: 'string'
    },
    suburb: {
      title: 'Suburb',
      type: 'string'
    },
    metro: {
      title: 'Metro',
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
    state: {
      title: 'State/Province',
      type: 'string'
    },
    buildingType: {
      title: 'Building Type',
      type: 'string'
    },
    city: {
      title: 'City',
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
