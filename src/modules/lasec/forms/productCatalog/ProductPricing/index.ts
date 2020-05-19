import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
// import $uiSchema from './uiSchema';
import $graphql from './graphql';
import { tableUiSchema, gridUiSchema} from './uiSchema';

const LasecCMSProductPricing: Reactory.IReactoryForm = {
  id: 'LasecProductPricingTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Pricing',
  tags: ['CMS Product Pricing'],
  registerAsComponent: true,
  name: 'LasecProductPricingTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: tableUiSchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    product: "",
    products: []
  },
  uiSchemas: [
    {
      id: 'default',
      title: 'TABLE',
      key: 'default',
      description: 'Product Details Table',
      icon: 'list',
      uiSchema: tableUiSchema,
    },
    {
      id: 'grid',
      title: 'GRID',
      key: 'grid',
      description: 'Product Details Grid',
      icon: 'view_module',
      uiSchema: gridUiSchema,
    }
  ],
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.GridLayoutComponent@1.0.0', widget: 'GridLayoutWidget' }
  ],
};

export default LasecCMSProductPricing;
