import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecClientOverviewWidget: Reactory.IReactoryForm = {
  id: 'LasecClientOverviewWidget',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CMS Product Pricing',
  tags: ['CMS Product Pricing'],
  registerAsComponent: true,
  name: 'LasecClientOverviewWidget',
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
    currency: "?",
    availableBalance: 0,
    creditLimit: 0,
  },
  widgetMap: [
    { componentFqn: 'core.Label@1.0.0', widget: 'LabelWidget' },
    { componentFqn: 'core.StyledCurrencyLabel@1.0.0', widget: 'StyledCurrencyLabel' },
    { componentFqn: 'core.ImageComponent@1.0.0', widget: 'ImageComponent' },
    { componentFqn: 'core.ConditionalIconComponent@1.0.0', widget: 'ConditionalIconComponent'}    
  ],
};

export default LasecClientOverviewWidget;
