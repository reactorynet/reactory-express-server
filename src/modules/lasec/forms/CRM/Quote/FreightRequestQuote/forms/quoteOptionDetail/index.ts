import { Reactory } from '@reactory/server-core/types/reactory'
import { schema } from './schema';
import { uiSchema } from './uiSchema';

const LasecFreightRequestOptionForm: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestOptionForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestOptionForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
  ],
};

export default LasecFreightRequestOptionForm;