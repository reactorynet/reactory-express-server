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
    options: [
      {
        id: '12',
        title: 'Option 1',
        transportMode: 'Mode 1',
        incoTerm: 'Term 1',
        namedPlace: 'Place 1',
        vatExempt: false,
        fromSA: true,
        totalValue: '123.00',
        companyName: 'Company 1',
        streetAddress: 'Test street addres',
        suburb: 'Test suburb',
        city: 'Cape Town',
        province: 'Wester Cape',
        country: 'South Africa'
      },
    ]

  },
  widgetMap: [
    { componentFqn: 'lasec.FreightRequestQuoteComponent@1.0.0', widget: 'FreightRequestWidget' },
    { componentFqn: 'core.RadioGroupComponent@1.0.0', widget: 'RadioGroupComponent' },
  ],
};

export default LasecFreightRequestQuote;
