import { Reactory } from '@reactory/server-core/types/reactory'
import { schema } from './schema';
import { uiSchema } from './uiSchema';

const LasecFreightRequestConsignmentForm: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestConsignmentForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestConsignmentForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'core.RadioGroupComponent@1.0.0', widget: 'RadioGroupComponent' },
  ],
};

export default LasecFreightRequestConsignmentForm;