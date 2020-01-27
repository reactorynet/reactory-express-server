import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';

const LasecQuoteNoteDetailForm: Reactory.IReactoryForm = {
  id: 'LasecQuoteNoteDetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Lasec Quote Note Detail',
  tags: ['Lasec Quote Note Detail'],
  registerAsComponent: true,
  name: 'LasecQuoteNoteDetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  uiSchema: $uiSchema,
};

export default LasecQuoteNoteDetailForm;
