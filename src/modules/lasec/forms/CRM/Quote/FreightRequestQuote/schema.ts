import { Reactory } from '@reactory/server-core/types/reactory';

const optionsSchema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    transportMode: {
      type: 'string',
      title: 'Transport Mode'
    },
    incoTerm: {
      type: 'string',
      title: 'Incoterm'
    },
    namedPlace: {
      type: 'string',
      title: 'Named Place'
    },
    vatExempt: {
      type: 'boolean',
      title: 'If DDP, is the importer duty/VAT exempt?'
    },
    fromSA: {
      type: 'boolean',
      title: 'If FCA, is the customer exporting from SA via road freight?'
    },
    totalValue: {
      type: 'string',
      title: 'Total Value of Order'
    },
    companyName: {
      type: 'string',
      title: 'Company Name'
    },
    streetAddress: {
      type: 'string',
      title: 'Street Address'
    },
    suburb: {
      type: 'string',
      title: 'Street Address'
    },
    city: {
      type: 'string',
      title: 'City'
    },
    province: {
      type: 'string',
      title: 'Province'
    },
    country: {
      type: 'string',
      title: 'Country'
    },
    freightFoe: {
      type: 'array',
      title: 'Request Freight for:',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string'
          },
          text: {
            type: 'string'
          }
        }
      }
    },
    offloadRequired: {
      type: 'boolean',
      title: 'Offloading Reuired?'
    },
    hazardous: {
      type: 'boolean',
      title: 'Hazardous?'
    },
    refrigerationRequired: {
      type: 'boolean',
      title: 'Refrigeration Required?'
    },
    containsLithium: {
      type: 'boolean',
      title: 'Contains Lithium Batteries?'
    },
    sample: {
      type: 'string',
      title: 'Sample/Repair'
    },
    additionalDetails: {
      type: 'string',
      title: 'Additional Delivery Details'
    },
    productDetails: {
      type: 'string',
      title: 'Product Details'
    },
  }
}

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    code: {
      type: "string",
      title: "Code"
    },
    email: {
      type: "string",
      title: "Email Address"
    },
    communicationOptions: {
      type: "array",
      title: "How would you like to send Quote Options?"
    },
    options: {
      type: 'array',
      items: {
        type: 'object',
        properies: {
          id: {
            type: 'string'
          },
          option: optionsSchema
        }
      },
    },
  }
};

export default schema;
