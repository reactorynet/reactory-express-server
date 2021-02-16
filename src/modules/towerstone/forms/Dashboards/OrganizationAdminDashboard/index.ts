import { defaultFormProps } from '@reactory/server-core/data/forms/defs';
import moment from 'moment';
import { Reactory } from '@reactory/server-core/types/reactory'

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';
import $defaultExport from './exports';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';

/**
 * Sales Dashboard
 */
const OrganizationAdminDashboard: Reactory.IReactoryForm = {
  id: 'OrganizationAdminDashboard',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Organization Administrator Dashboard',
  tags: ['Mores Organization', 'Dashboard', 'Admin'],
  schema: $schema,
  registerAsComponent: true,
  components: [],
  name: 'OrganizationAdminDashboard',
  nameSpace: 'mores',
  version: '1.0.0',
  roles: ['ORGANIZATION_ADMIN', 'ADMIN', 'DEVELOPER'],
  defaultExport: $defaultExport,
  helpTopics: ['mores-organization-admin-dashboard'],
  uiSchema: $uiSchema,
  graphql: $graphql,
  refresh: {
    onChange: [
      'period',
      'periodStart',
      'periodEnd',
    ],
  },
  defaultFormValue: {
    toolbar: {
      period: 'this-month',
      periodStart: moment().startOf('month').toISOString(),
      periodEnd: moment().endOf('month').toISOString(),
    },
  },
};

export default OrganizationAdminDashboard;
