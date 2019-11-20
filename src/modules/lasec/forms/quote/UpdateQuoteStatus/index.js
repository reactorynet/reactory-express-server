import { defaultFormProps } from '../../../../../data/forms/defs';
import { defaultUiResources } from '../../uiResources';
import $graphql from './graphql';
import $schema from './schema';
import $uiSchema from './uiSchema';


export const UpdateQuoteStatusForm = {
  id: 'UpdateQuoteStatus',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'Update Quote Status',
  tags: ['Quote Status'],
  schema: $schema,
  graphql: $graphql,
  //map components to widget
  widgetMap: [
    {
      component: 'InboxComponent',
      widget: 'InboxComponent',
    },
    {
      componentFqn: 'lasec-crm.QuoteStatusWidget@1.0.0',
      widget: 'QuoteStatusWidget',
    },      
  ],
  // component imports
  componentDefs: [
    'core.InboxComponent@1.0.0',
    {
      componentFqn: 'lasec-crm.QuoteStatusWidget@1.0.0',
      alias: 'QuoteStatusWidget',
      required: true
    }    
  ],
  defaultValue: {
    nextAction: 'follow-up-call',
    reminder: 1
  },
  roles: ['*'],
  startWith: '${!formData.quote_id ? \'lasec-crm.QuoteIdInputForm@1.0.0\' : null}',    
  registerAsComponent: true,
  name: 'UpdateQuoteStatus',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: $uiSchema
};

export default UpdateQuoteStatusForm;