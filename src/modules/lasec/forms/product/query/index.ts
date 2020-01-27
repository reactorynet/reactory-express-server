import { Reactory } from '@reactory/server-core/types/reactory';
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

export const ProductQuery: Reactory.IReactoryForm = {
  id: 'ProductQuery',
  title: 'Product Query',
  tags: ['Product', 'Product Query', 'Product Query'],
  nameSpace: 'lasec-crm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  name: 'ProductQuery',
  helpTopics: ['Product Query'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: $schema,
  uiSchema: $uiSchema,
  graphql: $graphql,
};

export default ProductQuery;


