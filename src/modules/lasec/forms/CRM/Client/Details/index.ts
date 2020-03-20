import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecCRMClientDetail: Reactory.IReactoryForm = {
  id: 'LasecCRMClientDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Pricing',
  tags: ['CMS Product Pricing'],
  registerAsComponent: true,
  name: 'LasecCRMClientDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,  
  defaultFormValue: {
    id: "",        
    tabs: [
      {
        id: 'clients',
        title: 'Client Details',
        componentFqn: 'lasec-crm.LasecCRMPersonalInformation',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'        
        },
        additionalComponents: [
          {
            componentFqn: 'lasec-crm.LasecCRMContactInformation',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientJobDetails',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientDocuments',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMClientComments',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          }
        ],        
      },      
      {
        id: 'customer-details',
        title: 'Customer Details',
        componentFqn: 'lasec-crm.LasecCRMCustomerDetails',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'
        },
        additionalComponents: [
          {
            componentFqn: 'lasec-crm.LasecCRMSpecialRequirements',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerAccountInfo',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },
          {
            componentFqn: 'lasec-crm.LasecCRMCustomerOrganizationDetails',
            componentProps: { mode: 'edit' },
            componentPropsMap: {
              'formContext.$formData.id': 'formData.id'
            },
          },          
        ],     
      },
      {
        id: 'client-activity-quotes',
        title: 'Client Activity:Quotes',
        componentFqn: 'lasec-crm.LasecCRMClientQuoteActivities',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'
        }
      },
      {
        id: 'client-activity-sales-orders',
        title: 'Client Activity:Sales Orders',
        componentFqn: 'lasec-crm.LasecCRMClientSalesOrderActivities',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'
        }
      },
      {
        id: 'client-activity-invoices',
        title: 'Sales History',
        componentFqn: 'lasec-crm.LasecCRMClienInvoicesActivity',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'
        }
      },
      {
        id: 'client-activity-sales-history',
        title: 'Sales History',
        componentFqn: 'lasec-crm.LasecCRMClientSalesHistory',
        componentProps: { mode: 'edit' },
        componentPropsMap: {
          'formContext.$formData.id': 'formData.id'
        }
      }         
    ]    
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'lasec-crm.LasecClientOverviewWidget@1.0.0', widget: 'LasecClientOverviewWidget'},
    { componentFqn: 'core.TabbedNavigation@1.0.0', widget: 'TabbedNavWidget' },
  ],
};

export default LasecCRMClientDetail;