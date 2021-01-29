import { Reactory } from '@reactory/server-core/types/reactory';
import LasecPersonalForm from '../Personal/';
import LasecContactForm from '../Contact';
import LasecJobDetailForm from '../JobDetail';
import LasecCRMCustomerLookupForm from '../../Customer/Lookup';
import LasecCRMCustomerAddress from '../../Customer/Address';
import LasecCRMClientDocuments from '../Documents';
import { cloneDeep } from 'lodash';

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    client: {
      type: 'object',
      title: 'Client Data',
      properties: {
        personal: cloneDeep(LasecPersonalForm.schema),
        contact: cloneDeep(LasecContactForm.schema),
        jobDetail: cloneDeep(LasecJobDetailForm.schema),
        customer: cloneDeep(LasecCRMCustomerLookupForm.schema),
        address: cloneDeep(LasecCRMCustomerAddress.schema),
        documents: cloneDeep(LasecCRMClientDocuments.ViewSchema)
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
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      // marginTop: '16px',
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    spacing: 2,
    container: 'div',
    containerStyles: {
      padding: 0,
      margin: 0,
      border: "none",
      boxShadow: "none"
    }
  },
  'ui:grid-layout': [
    {
      panels: { xs: 12, sm: 12, md: 12, lg: 12 },
    }
  ],
  panels: {
    'ui:widget': 'AccordionComponent',
    'ui:options': {
      showBar: true,
      style: {
        backgroundColor: '#e6e6e6'
      },
      Header: {
        style: {
          color: '#afafaf'
        }
      }
    }
  },

};

const $sharedProps = {
  componentProps: { mode: 'new', uiSchemaKey: 'new', liveValidate: true },
  componentPropsMap: {
    'formContext.formData': 'formData',
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
            componentFqn: 'lasec-crm.LasecCRMCustomerLookup@1.0.0',
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
        title: 'CLIENT DOCUMENTS',
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
            componentProps: { mode: 'new', uiSchemaKey: 'confirm', uiSchemaId: 'confirm', liveValidate: true },
            componentPropsMap: {
              'onBeforeMutation': 'onBeforeMutation',
              'onMutationComplete': 'onMutationComplete',
              'onQueryComplete': 'onQueryComplete',
              'onBeforeQuery': 'onBeforeQuery',
            },
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
