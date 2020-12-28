import { Reactory } from '@reactory/server-core/types/reactory';

import QuoteOptionDetailForm from './forms/quoteOptionDetail';
/**
 * Schema that represents the Request Freight Quote page
 */
const schema: Reactory.ISchema = {
  type: "object",
  required: [
    'email',
    'communicationMethod'
  ],
  properties: {
    quote_id: {
      type: "string",
      title: "Quote Id"
    },
    email: {
      type: "string",
      title: "Email Address"
    },
    communicationMethod: {
      type: "string",
      title: "How would you like to send Quote Options?"
    },    
    options: {
      type: 'array',
      items: {  
        type: 'object',
        properties: {
          name: {
            type: "string",
            title: "Option Name",
          },
          transportMode: {
            type: "string",
            title: "Transport Mode",
          },
          incoTerm: {
            type: "string",
            title: "Inco Term",
          },
          vatExempt: {
            type: "string",
            title: "VAT Exempt",
          },
          place: {
            type: "string",
            title: "Place",
          },
          fromSA: {
            type: "string",
            title: "Exporting From SA?",
          },
          totalValue: {
            type: "string",
            title: "Total Value",
          },
          companyName: {
            type: "string",
            title: "Company",
          },
          streetAddress: {
            type: "string",
            title: "Street Address",
          },
          suburb: {
            type: "string",
            title: "Suburb",
          },
          city: {
            type: "string",
            title: "City",
          },
          province: {
            type: "string",
            title: "Province",
          },
          country: {
            type: "string",
            title: "Country",
          },
          freightFor: {
            type: "string",
            title: "Request Freight For",
          },
          offloadRequired: {
            type: "string",
            title: "Offloading Required",
          },
          hazardous: {
            type: "string",
            title: "Contains Lithium Batteries?",
          },
          refrigerationRequired: {
            type: "string",
            title: "Refrigeration Required?",
          },
          containsLithium: {
            type: "string",
            title: "Contains Lithium Batteries?",
          },
          sample: {
            type: "string",
            title: "Sample / Repair?",
          },
        }
      },
    },    
  }
};

export default schema;
