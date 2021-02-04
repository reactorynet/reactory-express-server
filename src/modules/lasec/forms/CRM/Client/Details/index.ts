import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecCRMClientDetail: Reactory.IReactoryForm = {
  id: 'LasecCRMClientDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Client details component',
  tags: ['Client', 'Lasec', 'Lasec Client'],
  registerAsComponent: true,
  name: 'LasecCRMClientDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {
    id: "",
    client: {
      id: ""
    },
    salesTeam: "",
    tabs: [
      {
        id: 'clientsDetails',
        title: 'Client Details',
        componentFqn: 'lasec-crm.LasecCRMPersonalInformation',
        // route: '/crm/clients/',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          'formContext.formData.id': 'formData.id',
          'formContext.formData.salesTeam': 'formData.salesTeam'
        },
        additionalComponents: [
          {
            componentFqn: 'lasec-crm.LasecCRMContactInformation',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientJobDetails',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          },

          {
            componentFqn: 'lasec-crm.LasecCRMViewClientDocuments',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientComments',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          }
        ],

      },
      {
        id: 'customer-details',
        title: 'Customer Details',
        componentFqn: 'lasec-crm.LasecCRMCustomerDetails',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          'formContext.formData.id': 'formData.id'
        },
        additionalComponents: [
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerAddress',
            componentProps: { mode: 'new', uiSchemaKey: 'new' },
            componentPropsMap: {
              'formContext.formData': 'formData',
              'formContext.formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMSpecialRequirements',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerAccountInfo',
            componentProps: { mode: 'edit', uiSchemaKey: 'display' },
            componentPropsMap: {
              'formContext.formData.id': 'formData.id'
            },
          },
        ],
      },
      {
        id: 'client-activity-quotes',
        title: 'Quotes',
        componentFqn: 'lasec-crm.LasecCRMClientQuoteActivities',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          'formContext.formData.id': 'formData.id'
        }
      },
      {
        id: 'client-activity-sales-orders',
        title: 'Sales Orders',
        componentFqn: 'lasec-crm.LasecCRMClientSalesOrderActivities',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          'formContext.formData.id': 'formData.id'
        }
      },
      {
        id: 'client-activity-invoices',
        title: 'Invoices',
        componentFqn: 'lasec-crm.LasecCRMClienInvoiceActivities',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          'formContext.formData.id': ['formData.id', 'query.id'],
          'formContext.formData.salesTeam': ['formData.salesTeam', 'query.salesTeam']
        }
      },
      {
        id: 'client-activity-sales-history',
        title: 'Sales History',
        componentFqn: 'lasec-crm.LasecCRMClientSalesHistory',
        componentProps: { mode: 'edit', uiSchemaKey: 'display' },
        componentPropsMap: {
          // 'formContext.formData.id': 'formData.id'
          'formContext.formData.id': ['formData.id', 'query.id']
        }
      }
    ]
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'lasec-crm.ClientDetailHeaderWidget@1.0.0', widget: 'ClientDetailHeaderWidget' },
    { componentFqn: 'lasec-crm.LasecClientOverviewHeaderForm@1.0.0', widget: 'LasecClientOverviewHeaderForm' },
    { componentFqn: 'core.TabbedNavigation@1.0.0', widget: 'TabbedNavWidget' },
  ],
};

export default LasecCRMClientDetail;
