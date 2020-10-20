import { Reactory } from '@reactory/server-core/types/reactory'

import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecQuoteEmailForm: Reactory.IReactoryForm = {
  id: 'LasecQuoteEmail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quote Email',
  tags: ['Quote Email'],
  registerAsComponent: true,
  name: 'LasecQuoteEmail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',  
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,  
  widgetMap: [
    { componentFqn: 'lasec-crm.QuoteEmailTypeSelector@1.0.0', widget: 'QuoteEmailTypeSelector' }
  ],
};

export default LasecQuoteEmailForm;
