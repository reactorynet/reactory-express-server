import Reactory from '@reactorynet/reactory-core';
import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import version from './version';

const SQLQueryForm: Reactory.Forms.IReactoryForm = {
  id: `core.SQLQueryForm@${version}`,
  schema,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiSchema,
  graphql,
  uiResources: [],
  title: 'SQL Query Editor',
  description: 'Execute SQL queries across connected relational databases',
  registerAsComponent: true,
  nameSpace: 'core',
  name: 'SQLQueryForm',
  version,
  roles: ['DEVELOPER', 'ADMIN'],
};

export default SQLQueryForm;
