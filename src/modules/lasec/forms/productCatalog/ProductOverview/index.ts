import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecCMSProductCatalogForm: Reactory.IReactoryForm = {
  id: 'LasecProductOverviewTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Overview',
  tags: ['CMS Product Overview'],
  registerAsComponent: true,
  name: 'LasecProductOverviewTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    {  componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' }
  ],
};

export default LasecCMSProductCatalogForm;
