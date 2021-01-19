import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecProductCatalogTabs: Reactory.IReactoryForm = {
  id: 'LasecCMSProductCatalog',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Catalog',
  tags: ['CMS Product Catalog'],
  registerAsComponent: true,
  name: 'LasecCMSProductCatalog',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  // graphql: $graphql,
  uiSchemas: [
    {
      id: 'default',
      title: 'Grid View',
      key: 'default',
      description: 'View Product Catalog As Grid',
      icon: 'list',
      uiSchema:  $schema,
    },
    {
      id: 'detail',
      title: 'Card View',
      key: 'detail',
      description: 'View Product Catalog As Card',
      icon: 'view_module',
      uiSchema:  $schema,
    },
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
  ],
};

export default LasecProductCatalogTabs;
