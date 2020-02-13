import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecCMSProductQuantities: Reactory.IReactoryForm = {
  id: 'LasecProductQuantityTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Detail',
  tags: ['CMS Product Detail'],
  registerAsComponent: true,
  name: 'LasecProductQuantityTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
  ],
};

export default LasecCMSProductQuantities;
