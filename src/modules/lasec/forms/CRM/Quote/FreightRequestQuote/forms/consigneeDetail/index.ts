import { Reactory } from '@reactory/server-core/types/reactory'
import { uiSchema } from './uiSchema';
import { schema } from './schema';



const LasecFreightRequestConsigneeForm: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestConsigneeForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestConsigneeForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecFreightRequestConsigneeForm;
