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
    { componentFqn: 'core.DocumentListComponent@1.0.0', widget: 'DocumentListWidget' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailHeader@1.0.0', widget: 'LasecCRMISODetailHeader' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailDeliveryDetails@1.0.0', widget: 'LasecCRMISODetailDeliveryDetails' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailOrderSummary@1.0.0', widget: 'LasecCRMISODetailOrderSummary' },
    { componentFqn: 'lasec-crm.LasecSalesOrderDocuments@1.0.0', widget: 'LasecSalesOrderDocuments' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailDocuments@1.0.0', widget: 'LasecCRMISODetailDocuments' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailComments@1.0.0', widget: 'LasecCRMISODetailComments' },
    { componentFqn: 'lasec-crm.LasecCRMISODetailLineItems@1.0.0', widget: 'LasecCRMISODetailLineItems' },
  ],
};

export default LasecCRMISODetail;
