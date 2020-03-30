import { Reactory } from '@reactory/server-core/types/reactory';
import LasecPersonalForm from '../Personal/';
import LasecContactForm from '../Contact';
import LasecJobDetailForm from '../JobDetail';
import LasecCRMCustomerLookupForm from '../../Customer/Lookup';
import LasecCRMCustomerAddress from '../../Customer/Address';
import LasecCRMClientDocuments from '../Documents';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    client: {
      type: 'object',
      title: 'Client Data',
      properties: {
        personal: LasecPersonalForm.schema,
        contact: LasecContactForm.schema,
        jobDetail: LasecJobDetailForm.schema,
        customer: LasecCRMCustomerLookupForm.schema,
        address: LasecCRMCustomerAddress.schema,
        documents: LasecCRMClientDocuments.schema
      }
    },
    expandedPanels: {
      type: 'array',
      items: {
        type: 'string'
      }
    },
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
    'ui:options': {
      showBar: true,
      Header: {
        style: {
          color: '#BFBFBF'
        }
      }
    }
  },

};

const $sharedProps = {
  componentProps: { mode: 'new', uiSchemaKey: 'new' },
  componentPropsMap: {    
    //'onChange': 'onChange',
    //'formContext.formData.client.personal': 'formData',
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
    expandedPanels: [
      'client-details'
    ],
    panels: [
      {
        id: 'client-details',
        title: 'CLIENT DETAILS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMPersonalInformation',
            ...$sharedProps
          },
          {
            componentFqn: 'lasec-crm.LasecCRMContactInformation',
            ...$sharedProps,
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientJobDetails',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'customer-details',
        title: 'CUSTOMER & ORGANISATION',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerLookup',
            ...$sharedProps,
          },
          {
            componentFqn: 'lasec-crm.LasecCRMOrganizationLookup',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'address',
        title: 'ADDRESS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerAddress',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'documents',
        title: 'DOCUMENTS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMClientDocuments',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'save',
        title: 'CONFIRM & SAVE',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMNewCustomerConfirm',
            ...$sharedProps,
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
