import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import { GridUISchema } from './uiSchema';
import $graphql from './graphql';

const LasecQuoteGrid: Reactory.IReactoryForm = {
  id: 'LasecQuoteGrid',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client Quotes',
  tags: ['CRM Client Quotes'],
  registerAsComponent: true,
  name: 'LasecQuoteGrid',
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
    search: "",
    quotes: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' }
  ],
};

export default LasecQuoteGrid;
