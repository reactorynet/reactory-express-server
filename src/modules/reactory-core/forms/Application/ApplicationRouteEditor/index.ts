import Reactory from '@reactorynet/reactory-core';
import version from './version';
import schema from './schema';
import uiSchema from './uiSchema';
import modules from './modules';
import graphql from './graphql';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

const name = 'ApplicationRouteEditor';
const nameSpace = 'core';

const ApplicationRouteEditor: Reactory.Forms.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiSchemas: [
    {
      id: 'default',
      description: 'Route Editor Form',
      icon: 'route',
      key: 'default',
      title: 'Route Editor',
      uiSchema,
    },
  ],
  uiFramework: 'material',
  avatar: safeCDNUrl(`themes/reactory/images/forms/${nameSpace}_${name}_${version}.png`.toLowerCase()),
  registerAsComponent: true,
  title: 'Route Editor',
  description: 'Create or edit an application route',
  backButton: false,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['ADMIN'],
  tags: ['route', 'application', 'admin', 'editor'],
};

export default ApplicationRouteEditor;
