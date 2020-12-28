import { Reactory } from '@reactory/server-core/types/reactory'
import { schema } from './schema';
import { uiSchema } from './uiSchema';

const LasecFreightRequestProductDetail: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestProductDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Products',
  tags: ['CRM Lasec Freight Request Products'],
  registerAsComponent: true,
  name: 'LasecFreightRequestProductDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'lasec-crm.FreightRequestProductDetailComponent@1.0.0', widget: 'ProductDetailWidget' },
  ],
};

export default LasecFreightRequestProductDetail;
