import { Reactory } from '@reactory/server-core/types/reactory';

import schema from './schema';
import uiSchema from './uiSchema';
import modules from './modules';
import graphql from './graphql';

const name = "UserLoginForm";
const nameSpace = "core";
const version = "1.0.0";

const SupportTickets: Reactory.IReactoryForm = {
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
  schema,
  uiSchema,
  uiFramework: 'material',
  registerAsComponent: true,
  title: 'User Login',
  backButton: false,
  uiSupport: ['material'],
  modules,
  graphql,
  roles: ['USER']
};

export default SupportTickets;