import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import { GridUISchema } from './uiSchema';
import modules from './modules';
import graphql from './graphql';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const name = 'ApplicationOrganizations';
const nameSpace = 'core';

const ApplicationOrganizations: Reactory.Forms.IReactoryForm = {
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
      title: 'Organizations Table',
      uiSchema: GridUISchema
    }
  ],
  uiFramework: 'material',
  avatar: `${ENVIRONMENT.CDN_ROOT}themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase(),
  registerAsComponent: true,
  title: 'Application Organizations',
  description: 'Manage organizations with search, filtering, and detailed management of business units and teams',
  backButton: true,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['ADMIN'],
  tags: ['organizations', 'application', 'admin', 'management']
};

export default ApplicationOrganizations;
