import { defaultFormProps } from '@reactory/server-core/data/forms/defs';
import moment from 'moment';
import { Reactory } from '@reactory/server-core/types/reactory'

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';
import $defaultExport from './exports';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';


const SalesDashboard: Reactory.IReactoryForm = {
  id: 'CrmDashboard',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [
    {
      id: 'reactory.plugin.lasec360',
      name: 'reactory.plugin.lasec360',
      type: 'script',
      uri: `${ENVIRONMENT.CDN_ROOT}plugins/lasec-crm/lib/reactory.plugin.lasec360.js`,
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
  defaultExport: $defaultExport,
  helpTopics: ['sales-dashboard'],
  uiSchema: $uiSchema,
  graphql: $graphql,
  refresh: {
    onChange: [
      'period',
      'periodStart',
      'periodEnd'
    ]
  },
  defaultFormValue: {
    toolbar: {
      period: 'this-week',
      periodStart: moment().startOf('month').toISOString(),
      periodEnd: moment().endOf('month').toISOString()
    },
    options: {  
      bypassEmail: true
    }    
  },
};

export default SalesDashboard;
