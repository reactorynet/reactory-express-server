import Reactory from '@reactorynet/reactory-core';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import version from './version';

const GraphQLQueryForm: Reactory.Forms.IReactoryForm = {
  id: `core.GraphQLQueryForm@${version}`,
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [],
  title: 'GraphQL Query Editor',
  description: 'Execute GraphQL queries and mutations against the Reactory GraphQL API',
  registerAsComponent: true,
  nameSpace: 'core',
  name: 'GraphQLQueryForm',
  version,
  roles: ['DEVELOPER', 'ADMIN'],
};

export default GraphQLQueryForm;
