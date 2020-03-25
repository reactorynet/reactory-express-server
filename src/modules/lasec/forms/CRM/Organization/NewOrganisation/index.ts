import { Reactory } from '@reactory/server-core/types/reactory';
// import $graphql from './graphql';

const uiSchema: any = {
  'ui:options': {
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },
    submitIcon: 'search',
    componentType: "form",
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      name: { sm: 12 },
      description: { sm: 12},
    },
  ],
  name: {
    'ui:options': {
      containerStyles: {
        padding: '0px',
        margin: '0px',
      },
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Organisation Name',
        variant: "outlined",
      }
    }
  },
  description: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Organisation Description',
        variant: "outlined",
        multiline: true,
        rows: 5,
        style: {
          // minHeight: '100px',
        }
      }
    }
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    name: {
      type: 'string',
      title: 'Organisation Name'
    },
    description: {
      type: 'string',
      title: 'Organisation Description'
    },
  }
};

const LasecCRMNewOrganisationForm: Reactory.IReactoryForm = {
  id: 'LasecCRMNewOrganisation',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM New Organisation',
  tags: ['CRM New Organisation'],
  registerAsComponent: true,
  name: 'LasecCRMNewOrganisation',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  // graphql: $graphql,
  widgetMap: [],
  defaultFormValue: {}
};

export default LasecCRMNewOrganisationForm;
