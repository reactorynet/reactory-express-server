import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import { uiSchemaTable, uiSchemaGrid} from './uiSchema';
import $graphql from './graphql';

const LasecCMSProductDetail: Reactory.IReactoryForm = {
  id: 'LasecProductDetailTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Detail',
  tags: ['CMS Product Detail'],
  registerAsComponent: true,
  name: 'LasecProductDetailTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql.product_detail_table_graph,
  uiSchema: uiSchemaTable,
  uiSchemas: [
    {
      id: 'default',
      title: 'TABLE',
      key: 'default',
      description: 'Product Details Table',
      icon: 'list',
      graphql: $graphql.product_detail_table_graph,
      uiSchema: uiSchemaTable,
    },
    {
      id: 'grid',
      title: 'GRID',
      key: 'grid',
      description: 'Product Details Grid',
      icon: 'view_module',
      graphql: $graphql.product_card_detail_graph,
      uiSchema: uiSchemaGrid,
    }
  ],
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    product: "",
    products: []
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.GridLayoutComponent@1.0.0', widget: 'GridLayoutWidget' },
    { componentFqn: 'lasec-crm.LasecProductGrid@1.0.0', widget: 'ProductGrid' }
  ],
};

export default LasecCMSProductDetail;
