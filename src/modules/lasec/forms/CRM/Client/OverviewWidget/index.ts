import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecClientOverviewWidget: Reactory.IReactoryForm = {
  id: 'LasecClientOverviewHeaderForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Pricing',
  tags: ['CMS Product Pricing'],
  registerAsComponent: true,
  name: 'LasecClientOverviewHeaderForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {
    id: "",
    clientStatus: "active",
    fullName: "Loading",
    accountNumber: "Loading",
    customerStatus: "not-on-hold",
    customer: "Loading",
    currency: "ZAR",
  },
  widgetMap: [
    {
      componentFqn: 'lasec-crm.ClientDetailHeaderWidget@1.0.0', widget: 'ClientDetailHeaderWidget'
    },
  ],
};

export default LasecClientOverviewWidget;
