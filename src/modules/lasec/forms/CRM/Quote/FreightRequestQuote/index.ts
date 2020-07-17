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
        city: 'Cape Town'
      },
      {
        id: '34',
        title: 'Option 2',
        transportMode: 'Mode 2',
        incoTerm: 'Term 1',
        namedPlace: 'Place 1',
        vatExempt: false,
        fromSA: true,
        totalValue: '123.00',
        companyName: 'Company 1',
        streetAddress: 'Test street addres',
        suburb: 'Test suburb',
        city: 'Cape Town'
      },
      {
        id: '56',
        title: 'Option 3',
        transportMode: 'Mode 3',
        incoTerm: 'Term 1',
        namedPlace: 'Place 1',
        vatExempt: false,
        fromSA: true,
        totalValue: '123.00',
        companyName: 'Company 1',
        streetAddress: 'Test street addres',
        suburb: 'Test suburb',
        city: 'Cape Town'
      },
      {
        id: '78',
        title: 'Option 4',
        transportMode: 'Mode 4',
        incoTerm: 'Term 1',
        namedPlace: 'Place 1',
        vatExempt: false,
        fromSA: true,
        totalValue: '123.00',
        companyName: 'Company 1',
        streetAddress: 'Test street addres',
        suburb: 'Test suburb',
        city: 'Cape Town'
      },
    ]

  },
  widgetMap: [
    { componentFqn: 'lasec.FreightRequestQuoteComponent@1.0.0', widget: 'FreightRequestWidget' },
  ],
};

export default LasecFreightRequestQuote;
