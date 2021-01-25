import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
// import $graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const LasecCRMTabs: Reactory.IReactoryForm = {
  id: 'LasecCRMComponent',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
  title: 'CRM Tabs',
  tags: ['CRM Tabs'],
  registerAsComponent: true,
  name: 'LasecCRMComponent',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  defaultFormValue: {   
    tabs: [
      {
        id: 'clients',
        title: 'Clients',
        componentFqn: 'lasec-crm.LasecClientGrid',
        route: '/crm/clients/',
        componentProps: {},
        componentPropsMap: {
          'formContext.$formData.toolbar.search': 'formData.search',
        }
      },
      {
        id: 'quotes',
        title: 'Quotes',
        componentFqn: 'lasec-crm.LasecQuoteGrid',
        componentProps: {},
        route: '/crm/quotes/',
        componentPropsMap: {
          'formContext.$formData.toolbar.search': 'formData.search',
          'formContext.$route': '$route',
        }
      },
      {
        id: 'sales-orders',
        title: 'Sales Orders',
        componentFqn: 'lasec-crm.LasecSalesOrderGrid',
        componentProps: {},
        route: '/crm/sales-orders/',
        componentPropsMap: {
          'formContext.$formData.toolbar.search': 'formData.search'
        }
      },
      {
        id: 'invoices',
        title: 'Invoices',
        componentFqn: 'lasec-crm.LasecCRMInvoiceGrid',
        componentProps: {},
        route: '/crm/invoices/',
        componentPropsMap: {
          'formContext.$formData.toolbar.search': 'formData.search'
        }
      },
      {
        id: 'sales-history',
        title: 'Sales History',
        componentFqn: 'lasec-crm.LasecSalesHistoryGrid',
        componentProps: {},
        route: '/crm/sales-history/',
        componentPropsMap: {
          'formContext.$formData.toolbar.search': 'formData.search'
        }
      }
    ]
  },
  uiSchemas: [
    {
      id: 'default',
      title: 'Grid View',
      key: 'default',
      description: 'View Clients As Grid',
      icon: 'list',
      uiSchema:  $uiSchema,
    },
    {
      id: 'detail',
      title: 'Card View',
      key: 'detail',
      description: 'View Clients As Cards',
      icon: 'view_module',
      uiSchema:  $uiSchema,
    },
  ],
  dependencies: [
    { fqn: "lasec-crm.Lasec360Plugin@1.0.0", componentType: "plugin" }
  ],
  widgetMap: [
    {
      componentFqn: 'core.MaterialInput@1.0.0',
      widget: 'InputWidget',
    },
    {
      componentFqn: 'core.FormSubmissionComponent@1.0.0',
      widget: 'FormSubmitWidget',
    },
    {
      componentFqn: 'core.TabbedNavigation@1.0.0',
      widget: 'TabbedNavWidget',
    },
    {
      componentFqn: 'core.SlideOutLauncher@1.0.0',
      widget: 'SlideOutLauncher'
    },
    {
      componentFqn: 'lasec-crm.NewClientModal@1.0.0',
      widget: 'NewClientModal'
    },
    {
      componentFqn: 'lasec-crm.CRMToolbar@1.0.0',
      widget: 'CRMToolbar'
    }
  ],
};

export default LasecCRMTabs;
