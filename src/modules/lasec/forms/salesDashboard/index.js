import { defaultFormProps } from '@reactory/server-core/data/forms/defs';
import moment from 'moment';

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const {
  CDN_ROOT,
} = process.env;


export default {
  id: 'CrmDashboard',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360', 
      name: 'reactory.plugin.lasec360', 
      type: 'script', 
      uri: `${CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
    },
  ],
  title: 'CRM Dashboard',
  tags: ['CRM Dashboard'],
  schema: $schema,
  registerAsComponent: true,
  components: ['lasec-crm.Lasec360Plugin@1.0.0'],
  name: 'Dashboard',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  roles: ['*'],
  helpTopics: ['sales-dashboard'],
  uiSchema: $uiSchema,
  graphql: $graphql,
  refresh: {
    onChange: ['period', 'periodStart', 'periodEnd']
  },
  defaultFormValue: {
    toolbar: {
      period: 'this-month',
      periodStart: moment().startOf('month').toISOString(),
      periodEnd: moment().endOf('month').toISOString()
    }
  }
};