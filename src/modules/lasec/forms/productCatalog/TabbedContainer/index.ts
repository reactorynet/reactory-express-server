import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
// import $graphql from './graphql';

const LasecCMSProductCatalogForm: Reactory.IReactoryForm = {
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
  // graphql: $graphql,
  uiSchema: $uiSchema,
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

export default LasecCMSProductCatalogForm;
