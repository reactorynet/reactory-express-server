import { defaultFormProps } from '../../../../../data/forms/defs';
import { defaultUiResources } from '../../uiResources';
import $graphql from './graphql';
import $schema from './schema';
import $uiSchema from './uiSchema';


export const QuoteIdInputForm = {
  id: 'QuoteIdInputForm',
  ...defaultFormProps,
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [...defaultUiResources],
  title: 'Update Quote Status',
  tags: ['Quote Status'],
  schema: $schema,
  // graphql: $graphql,
  //map components to widget
  widgetMap: [
    
  ],
  // component imports
  componentDefs: [
        
  ],  
  registerAsComponent: true,
  name: 'QuoteIdInputForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  uiSchema: $uiSchema
};

export default QuoteIdInputForm;