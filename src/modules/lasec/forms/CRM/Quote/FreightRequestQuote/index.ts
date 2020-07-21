import { Reactory } from '@reactory/server-core/types/reactory'
import $schema from './schema';
import $uiSchema from './uiSchema';
import $graphql from './graphql';

const LasecFreightRequestQuote: Reactory.IReactoryForm = {
  id: 'LasecFreightRequestQuote',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Lasec Freight Request Quote',
  tags: ['CRM Lasec Freight Request Quote'],
  registerAsComponent: true,
  name: 'LasecFreightRequestQuote',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: $schema,
  graphql: $graphql,
  uiSchema: $uiSchema,
  defaultFormValue: {
    options: [],
    productDetails: []
  },
  widgetMap: [
    { componentFqn: 'lasec.FreightRequestQuoteComponent@1.0.0', widget: 'FreightRequestWidget' },
    { componentFqn: 'core.RadioGroupComponent@1.0.0', widget: 'RadioGroupComponent' },
  ],
};

export default LasecFreightRequestQuote;
