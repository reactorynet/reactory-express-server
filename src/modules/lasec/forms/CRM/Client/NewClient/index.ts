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
        documents: LasecCRMClientDocuments.ViewSchema
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
      panels: { xs: 12, sm: 12, md: 12, lg: 12 },
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
  componentProps: { mode: 'new', uiSchemaKey: 'new', liveValidate: true },
  componentPropsMap: {    
    //'onChange': 'onChange',
    //'formContext.formData.client.personal': 'formData',
  },
};

const LasecCRMNewClientForm: Reactory.IReactoryForm = {
  id: 'LasecCRMNewClient',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${process.env.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
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
            componentFqn: 'lasec-crm.LasecCRMPersonalInformation@1.0.0',
            ...$sharedProps
          },
          {
            componentFqn: 'lasec-crm.LasecCRMContactInformation@1.0.0',
            ...$sharedProps,
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientJobDetails@1.0.0',
            ...$sharedProps,
          },
        ],        
      },
      {
        id: 'customer-details',
        title: 'CUSTOMER & ORGANISATION',
        Components: [
          {
            componentFqn: 'lasec-crm.CustomerLookupModal@1.0.0',
            ...$sharedProps,
          },
          {
            componentFqn: 'lasec-crm.LasecCRMOrganizationLookup@1.0.0',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'address',
        title: 'ADDRESS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerAddress@1.0.0',
            ...$sharedProps,
          },
        ],
      },
      {
        id: 'documents',
        title: 'DOCUMENTS',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMNewClientDocuments@1.0.0',
            ...$sharedProps,            
          },
        ],
      },
      {
        id: 'save',
        title: 'CONFIRM & SAVE',
        Components: [
          {
            componentFqn: 'lasec-crm.LasecCRMNewCustomerConfirm@1.0.0',
            ...$sharedProps,
          },
        ],
        nextButtonProps: {
          title: 'CONFIRM & SAVE',
          color: 'primary',
          style: {
            display: 'none'
          }
        },
      },
    ]
  },
  widgetMap: [
    { componentFqn: 'core.AccordionComponent@1.0.0', widget: 'AccordionComponent' },
  ],

};

export default LasecCRMNewClientForm;
