import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import { GridUISchema } from './uiSchema';
import $graphql from './graphql';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const LasecSalesOrderGrid: Reactory.IReactoryForm = {
  id: 'LasecSalesOrderGrid',
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
  title: 'CMS Sales Order Grid',
  tags: ['CMS Sales Order Grid'],
  registerAsComponent: true,
  name: 'LasecSalesOrderGrid',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: GridUISchema,
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    filterBy: "any_field",
    orderStatus: "1",
    salesOrders: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'lasec-crm.CustomerFilter@1.0.0', widget: 'CustomerFilter' },
    { componentFqn: 'lasec-crm.ClientFilter@1.0.0', widget: 'ClientFilter' },
  ],
};

export default LasecSalesOrderGrid;
