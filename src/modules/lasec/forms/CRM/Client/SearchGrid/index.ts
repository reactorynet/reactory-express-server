import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import { GridUISchema } from './uiSchema';
import $graphql from './graphql';

import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const LasecClientGrid: Reactory.IReactoryForm = {
  id: 'LasecClientGrid',
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
  title: 'Lasec Client Search Grid',
  tags: ['CMS Product Pricing'],
  registerAsComponent: true,
  name: 'LasecClientGrid',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: GridUISchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,      
    },
    filterBy: "any_field",
    search: "",
    clients: []
  },
  refresh: [
    { name: 'LasecCustomerDeactivated' }
  ],
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.FormSubmissionComponent@1.0.0', widget: 'FormSubmitWidget' }
  ],
};

export default LasecClientGrid;
