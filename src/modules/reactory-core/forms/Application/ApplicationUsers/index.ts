import Reactory from '@reactory/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema } from './uiSchema';
import modules from './modules';
import graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = 'ApplicationUsers';
const nameSpace = 'core';

const ApplicationUsers: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema: GridUISchema,
  uiSchemas: [
    {
      id: 'default',
      description: 'Grid Schema',
      icon: 'table_view',
      key: 'default',
      title: 'User Table',
      uiSchema: GridUISchema
    }
  ],
  uiFramework: 'material',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase(),
  registerAsComponent: true,
  title: 'Application Users',
  description: 'Manage users for a specific application/client with advanced filtering and search',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['ADMIN'],
  tags: ['users', 'application', 'admin', 'management']
};

export default ApplicationUsers;
