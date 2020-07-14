import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const LasecSalesHistoryGrid: Reactory.IReactoryForm = {
  id: 'LasecSalesHistoryGrid',
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
  title: 'CMS Sales History Grid',
  tags: ['CMS Sales History Grid'],
  registerAsComponent: true,
  name: 'LasecSalesHistoryGrid',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
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
    { componentFqn: 'core.LookupComponent@1.0.0', widget: 'LookupComponent' },
  ],
};

export default LasecSalesHistoryGrid;
