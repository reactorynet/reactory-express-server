import { Reactory } from '@reactory/server-core/types/reactory';
const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    panels: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: {
            type: 'string'
          },
        }
      }
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      panels: { sm: 12, md: 12 },
    }
  ],
  panels: {
    'ui:widget': 'AccordionComponent',
    'ui:options': {}
  },

};

const LasecCRMNewClientForm: Reactory.IReactoryForm = {
  id: 'LasecCRMNewClient',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM New Client',
  tags: ['CRM New Client'],
  registerAsComponent: true,
  name: 'LasecCRMNewClient',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {
    panels: [
      {
        id: 'client-details',
        title: 'CLIENT DETAILS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMPersonalInformation',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
          {
            componentFqn: 'lasec-crm.LasecCRMContactInformation',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientJobDetails',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
        ],
      },
      {
        id: 'customer-details',
        title: 'CUSTOMER & ORGANISATION',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerLookup',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
        ],
      },
      {
        id: 'address',
        title: 'ADDRESS',
        Components: [
          // {
          //   componentFqn: 'lasec-crm.LasecCRMClientDocuments',
          //   componentProps: { mode: 'new' },
          //   componentPropsMap: {},
          // },
        ],
      },
      {
        id: 'documents',
        title: 'DOCUMENTS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMClientDocuments',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
        ],
      },
      {
        id: 'save',
        title: 'COFIRM & SAVE',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMClientDocuments',
            componentProps: { mode: 'new' },
            componentPropsMap: {},
          },
        ],
      },
    ]
  },
  widgetMap: [
    { componentFqn: 'core.AccordionComponent@1.0.0', widget: 'AccordionComponent' },
  ],

};

export default LasecCRMNewClientForm;
