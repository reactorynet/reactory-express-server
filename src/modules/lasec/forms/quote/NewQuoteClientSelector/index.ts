import { Reactory } from '@reactory/server-core/types/reactory'

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecNewQuoteClientSelector: Reactory.IReactoryForm = {
  id: 'LasecNewQuoteClientSelector',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quote Email',
  tags: ['Quote Email'],
  registerAsComponent: true,
  name: 'LasecNewQuoteClientSelector',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  widgetMap: [
    { componentFqn: 'lasec-crm.RepCodeFilter@1.0.0', widget: 'RepCodeFilter' },
    { componentFqn: 'lasec-crm.ClientFilter@1.0.0', widget: 'ClientFilter' },
    { componentFqn: 'lasec-crm.LasecClientLabel@1.0.0', widget: 'LasecClientLabel' }
  ],
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {
    paging: {
        page: 1,
        pageSize: 10,
      },
      filterBy: "any_field",
      search: "",
      clients: [],
      repCode: {
        title: "",
        value: ""
      }
  }
};

export default LasecNewQuoteClientSelector;
