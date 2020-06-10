import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $graphql from './graphql';
import $uiSchema from './uiSchema';


const LasecCRMISODetail: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetail',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetail',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {},
  widgetMap: [
    // { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
  ],
};

export default LasecCRMISODetail;
