"use strict";

import { Reactory } from "@reactory/server-core/types/reactory";

/**
 * This file contains samples for the Smart Admin resource bundle as a 3rd party component provider.
 */


const { CDN_ROOT } = process.env;

const smartAdminResources = [
  {
    framework: 'bootstrap',
    uri: `${CDN_ROOT}ui/smart-admin/css/bootstrap.min.css`,
    type: 'style',
    async: true,
    name: 'bootstrap_main',
  },
  {
    framework: 'font-awesome',
    uri: `${CDN_ROOT}ui/smart-admin/css/font-awesome.min.css`,
    type: 'style',
    async: true,
    name: 'font-awesome',
  },
  {
    framework: 'bootstrap-invoice',
    uri: `${CDN_ROOT}ui/smart-admin/css/invoice.min.css`,
    type: 'style',
    async: true,
    name: 'bootstrap_invoice',
  },
  {
    framework: 'smart-admin-production',
    uri: `${CDN_ROOT}ui/smart-admin/css/smartadmin-production.min.css`,
    type: 'style',
    async: true,
    name: 'smart_admin_prod',
  },
  {
    framework: 'smart-admin-production-plugins',
    uri: `${CDN_ROOT}ui/smart-admin/css/smartadmin-production-plugins.min.css`,
    type: 'style',
    async: true,
    name: 'smart_admin_prod_plugins',
  },
  {
    framework: 'smart-admin-react',
    uri: `${CDN_ROOT}ui/smart-admin/css/smartadmin-react.css`,
    type: 'style',
    async: true,
    name: 'smart_admin_ract',
  },
  {
    framework: 'smart-admin-skins',
    uri: `${CDN_ROOT}ui/smart-admin/css/smartadmin-skins.min.css`,
    type: 'style',
    async: true,
    name: 'smart_admin_skins',
  },
];



/**
 * Default Form Sample
 */
const DefaultForm: Reactory.Forms.IReactoryForm = {
  id: 'default',
  name: 'DefaultForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: smartAdminResources,
  title: 'User Registration',
  tags: ['registration', 'user account'],
  schema: {
    title: 'User Registration',
    description: 'User Registration Form',
    type: 'object',
    required: [
      'firstName',
      'lastName',
    ],
    properties: {
      firstName: {
        type: 'string',
        title: 'First name',
      },
      lastName: {
        type: 'string',
        title: 'Last name',
      },
      middleName: {
        type: 'string',
        title: 'Middle name',
      },
      age: {
        type: 'integer',
        title: 'Age',
      },
      bio: {
        type: 'string',
        title: 'Bio',
      },
      password: {
        type: 'string',
        title: 'Password',
        minLength: 3,
      },
      telephone: {
        type: 'string',
        title: 'Telephone',
        minLength: 10,
      },
    },
  },
  uiSchema: {
    firstName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    age: {
      'ui:widget': 'updown',
      'ui:title': 'Age of person',
      'ui:description': '(earthian year)',
    },
    bio: {
      'ui:widget': 'textarea',
    },
    password: {
      'ui:widget': 'password',
      'ui:help': 'Hint: Make it strong!',
    },
    date: {
      'ui:widget': 'alt-datetime',
    },
    telephone: {
      'ui:options': {
        inputType: 'tel',
      },
    },
  },
};



/***
 * Array Form Sample
 */
const ArrayForm: Reactory.Forms.IReactoryForm = {
  id: 'array',
  uiFramework: 'material',
  title: 'An array testing form',
  tags: ['registration', 'user account'],
  uiSupport: ['material', 'bootstrap'],
  uiResources: smartAdminResources,
  registerAsComponent: true,
  nameSpace: 'smart-admin',
  name: 'ArrayTestForm',
  version: '1.0.0',
  schema: {
    type: 'object',
    definitions: {
      Thing: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            default: 'Default name',
          },
        },
      },
    },

    properties: {
      listOfStrings: {
        type: 'array',
        title: 'A list of strings',
        items: {
          type: 'string',
          default: 'bazinga',
        },
      },
      multipleChoicesList: {
        type: 'array',
        title: 'A multiple choices list',
        items: {
          type: 'string',
          enum: [
            'foo',
            'bar',
            'fuzz',
            'qux',
          ],
        },
        uniqueItems: true,
      },
      fixedItemsList: {
        type: 'array',
        title: 'A list of fixed items',
        items: [
          {
            title: 'A string value',
            type: 'string',
            default: 'lorem ipsum',
          },
          {
            title: 'a boolean value',
            type: 'boolean',
          },
        ],
        additionalItems: {
          title: 'Additional item',
          type: 'number',
        },
      },
      minItemsList: {
        type: 'array',
        title: 'A list with a minimal number of items',
        minItems: 3,
        items: {
          $ref: '#/definitions/Thing',
        },
      },
      defaultsAndMinItems: {
        type: 'array',
        title: 'List and item level defaults',
        minItems: 5,
        default: [
          'carp',
          'trout',
          'bream',
        ],
        items: {
          type: 'string',
          default: 'unidentified',
        },
      },
      nestedList: {
        type: 'array',
        title: 'Nested list',
        items: {
          type: 'array',
          title: 'Inner list',
          items: {
            type: 'string',
            default: 'lorem ipsum',
          },
        },
      },
      unorderable: {
        title: 'Unorderable items',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      unremovable: {
        title: 'Unremovable items',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      noToolbar: {
        title: 'No add, remove and order buttons',
        type: 'array',
        items: {
          type: 'string',
          default: 'lorem ipsum',
        },
      },
      fixedNoToolbar: {
        title: 'Fixed array without buttons',
        type: 'array',
        items: [
          {
            title: 'A number',
            type: 'number',
            default: 42,
          },
          {
            title: 'A boolean',
            type: 'boolean',
            default: false,
          },
        ],
        additionalItems: {
          title: 'A string',
          type: 'string',
          default: 'lorem ipsum',
        },
      },
    },
  },
  uiSchema: {
    firstName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    age: {
      'ui:widget': 'updown',
      'ui:title': 'Age of person',
      'ui:description': '(earthian year)',
    },
    bio: {
      'ui:widget': 'textarea',
    },
    password: {
      'ui:widget': 'password',
      'ui:help': 'Hint: Make it strong!',
    },
    date: {
      'ui:widget': 'alt-datetime',
    },
    telephone: {
      'ui:options': {
        inputType: 'tel',
      },
    },
  },
};

/**
 * Complex Form Sample
 */
const ComplexFormSample: Reactory.Forms.IReactoryForm = {
  id: 'SmartAdminComplexFormSample',
  name: 'SmartAdminComplexFormSample',
  nameSpace: 'smart-admin',
  version: '1.0.0',
  registerAsComponent: true,
  uiFramework: 'bootstrap',
  uiSupport: ['material', 'bootstrap'],
  uiResources: smartAdminResources,
  title: 'Smart Admin Complex Form Sample',
  schema: {
    title: 'Tell m',
    type: 'object',
    required: ['firstName'],
    properties: {
      image: {
        type: 'string',
      },
      user: {
        type: 'object',
        properties: {
          password: {
            type: 'string',
            title: 'Password',
          },
          username: {
            type: 'string',
          },
        },
      },
      details: {
        type: 'boolean',
      },
      lastName: {
        type: 'string',
        title: 'Last name',
      },
      bio: {
        type: 'string',
        title: 'Bio',
      },
      firstName: {
        type: 'string',
        title: 'First name',
      },
      age: {
        type: 'integer',
        title: 'Age',
      },
    },
  },
  uiSchema: 'complex',
};

/**
 * Product Ideas Sample Form
 */
const ProductIdeas: Reactory.Forms.IReactoryForm = {
  id: 'product-ideas',
  uiFramework: 'bootstrap',
  uiSupport: ['bootstrap'],
  name: 'ProductIdeas',
  nameSpace: 'smart-admin',
  version: '1.0.0',
  registerAsComponent: true,
  uiResources: smartAdminResources,
  title: 'Product Ideas',
  tags: ['product ideas'],
  schema: {
    title: 'Product Ideas',
    description: 'Product Ideas Form',
    type: 'object',
    required: [
      'productName',
      'productDescription',
      'ideator',
      'dateCreated',
    ],
    properties: {
      activeForm: {
        type: 'string',
        enum: [
          'new-product-idea',
          'existing-product-ideas',
          'approved-product-ideas',
          'binned-product-ideas',
        ],
        enumNames: [
          'New Product Ideas',
          'Existing Product Ideas',
          'Approved Product Ideas',
          'Rejected Product Ideas',
        ],
      },
    },
  },
  uiSchema: {

  },
};

/**
 * Product Ideas Form Sample
 */
const ProductIdeasForm: Reactory.Forms.IReactoryForm = {
  id: 'new-product-idea',
  name: 'ProductIdeas',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
  uiFramework: 'bootstrap',
  uiSupport: ['bootstrap'],
  uiResources: smartAdminResources,
  title: 'Product Idea',
  tags: ['product idea'],
  schema: {
    title: 'Product Idea',
    type: 'object',
    required: [
      'productName',
      'productDescription',
      'ideator',
      'dateCreated',
    ],
    properties: {
      productName: {
        type: 'string',
        title: 'Product Name',
      },
      productClassification: {
        type: 'string',
        title: 'Product Classification',
        enum: [
          'fin',
          'tech',
        ],
        enumNames: [
          'Financial',
          'Tech',
        ],
      },
      productDescription: {
        type: 'string',
        title: 'Product Description',
      },
      version: {
        type: 'string',
        title: 'Product Version',
      },
      ideator: {
        type: 'string',
        title: 'Ideator',
        readOnly: true,
      },
      dateCreated: {
        type: 'string',
        format: 'date-time',
        title: 'Date Created',
      },
      productLandscape: {
        title: 'Product Landscape',
        type: 'object',
        properties: {
          targetAudience: {
            type: 'string',
            title: 'Target Audience',
            enum: ['b2c', 'b2b', 'internal'],
            enumNames: [
              'Business to Consumer',
              'Business to Business',
              'Internal',
            ],
          },
          problemStatement: {
            type: 'string',
            title: 'Problem Statement',
          },
          existingSolutions: {
            type: 'string',
            title: 'Benefits Of Existing Solutions',
          },
          existingSolutionsShortfall: {
            type: 'string',
            title: 'Shortfalls Of Existing Solutions',
          },
          proposedBenefits: {
            type: 'string',
            title: 'Proposed Benefits Of This Idea',
          },
          totalAddresableMarket: {
            type: 'number',
            title: 'Total Addressable Market Value',
          },
          evidence: {
            type: 'array',
            title: 'Market Value Evidence',
            items: {
              type: 'object',
              title: 'Market Value Evidence',
              properties: {
                conceptType: {
                  type: 'string',
                  title: 'Concept Type',
                  enum: [
                    'image',
                    'link',
                    'file',
                  ],
                  enumNames: [
                    'Image',
                    'Link',
                    'File',
                  ],
                },
                fileInput: {
                  type: 'string',
                  format: 'data-url',
                },
              },
            },
          },
          competitors: {
            type: 'array',
            title: 'Competitors',
            items: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  title: 'Company URL',
                },
                competitorOverview: {
                  type: 'string',
                  title: 'Overview',
                },
                competitorBenefits: {
                  type: 'string',
                  title: 'Competitor Benefits',
                },
                competitorShortfall: {
                  type: 'string',
                  title: 'Competitor Shortfalls',
                },
                socialMediaReputation: {
                  type: 'object',
                  title: 'Social Media Reputation',
                  properties: {
                    facebook: {
                      type: 'number',
                      title: 'Facebook Rating',
                      min: 0,
                      max: 5,
                    },
                    linkedin: {
                      type: 'number',
                      title: 'LinkedIn Rating',
                      min: 0,
                      max: 5,
                    },
                    twitter: {
                      type: 'number',
                      title: 'Twitter Rating',
                      min: 0,
                      max: 5,
                    },
                    instagram: {
                      type: 'number',
                      title: 'Instagram Rating',
                      min: 0,
                      max: 5,
                    },
                    pintrest: {
                      type: 'number',
                      title: 'Pintrest Rating',
                      min: 0,
                      max: 5,
                    },
                  },
                },
                marketDominance: {
                  type: 'string',
                  title: 'Market Dominance',
                },
                channelsSupported: {
                  type: 'array',
                  title: 'Channels Supported',
                  items: {
                    type: 'string',
                    enum: [
                      'SaaS',
                      'Mobile',
                      'On-Premise',
                      'ATM',
                      'Web',
                    ],
                  },
                  uniqueItems: true,
                },
                pricingRange: {
                  type: 'string',
                  title: 'Pricing Range',
                },
              },
            },
          },
        },
      },
      concepts: {
        type: 'array',
        title: 'Visual Concepts',
        items: {
          type: 'object',
          title: 'Visual',
          properties: {
            conceptType: {
              type: 'string',
              title: 'Concept Type',
              enum: [
                'image',
                'link',
                'file',
              ],
              enumNames: [
                'Image',
                'Link',
                'File',
              ],
            },
            fileInput: {
              type: 'string',
              format: 'data-url',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    productName: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    productDescription: {
      'ui:widget': 'textarea',
    },
    channelsSupported: {
      'ui:widget': 'checkboxes',
    },
  },
};


export default [
  DefaultForm,
  ComplexFormSample,
  ProductIdeas,
  ProductIdeasForm
];