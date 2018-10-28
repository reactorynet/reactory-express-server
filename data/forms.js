import dotenv from 'dotenv';

dotenv.config();

const { CDN_ROOT } = process.env;

const bootstrapMaterialResources = [
  {
    framework: 'jquery',
    uri: 'https://code.jquery.com/jquery-3.3.1.min.js',
    async: true,
    name: 'jQuery',
    // loaded: () => { return jQuery !== null && jQuery !== undefined }, //eslint-disable-line
  },
  {
    framework: 'bootstrap',
    uri: 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
    type: 'style',
    async: true,
    name: 'main_styles',
  },
  {
    framework: 'bootstrap',
    uri: `${CDN_ROOT}ui/bootstrap-material-design/css/bootstrap-material-design.css`,
    type: 'style',
    async: true,
    name: 'bootstrap_theme',
  },
  {
    framework: 'bootstrap',
    uri: `${CDN_ROOT}ui/bootstrap-material-design/js/material.js`,
    type: 'script',
    async: true,
    name: 'bootstrap_theme_js0',
  },
  {
    framework: 'bootstrap',
    uri: `${CDN_ROOT}ui/bootstrap-material-design/js/ripples.js`,
    type: 'script',
    async: true,
    name: 'bootstrap_theme_js1',
  },
];

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

const defaultForm = {
  id: 'default',
  uiFramework: 'bootstrap',
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
  layout: {

  },
};

const arrayForm = {
  id: 'array',
  uiFramework: 'material',
  title: 'An array testing form',
  tags: ['registration', 'user account'],
  uiSupport: ['material', 'bootstrap'],
  uiResources: smartAdminResources,
  schema: {
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
    type: 'object',
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

const complexForm = {
  id: 'complex',
  uiFramework: 'bootstrap',
  uiSupport: ['material', 'bootstrap'],
  uiResources: smartAdminResources,
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

const productIdeas = {
  id: 'product-ideas',
  uiFramework: 'bootstrap',
  uiSupport: ['bootstrap'],
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
  layout: {

  },
};

const productIdeasForm = {
  id: 'new-product-idea',
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
  layout: {

  },
};

const forgotPasswordForm = {
  id: 'forgot-password',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Forgot Password',
  tags: ['forgot password', 'user account'],
  schema: {
    title: 'Forgot Password',
    description: 'Enter your email address below to start reset',
    type: 'object',
    required: [
      'email',
    ],
    properties: {
      email: {
        type: 'string',
        title: 'Email Address',
      },
    },
  },
  uiSchema: {
    email: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
  },
  layout: {

  },
};

const messageForm = {
  id: 'message-form',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Message Form',
  tags: ['Message Form'],
  schema: {
    title: 'Message',
    description: '',
    type: 'object',
    required: [
      'message',
    ],
    properties: {
      title: {
        type: 'string',
        title: 'Title',
      },
      message: {
        type: 'string',
        title: 'Message',
      },
      buttons: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            route: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            icon: {
              type: 'string',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    title: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    message: {

    },
  },
  layout: {

  },
};

const msTeamsResources = [
  {
    framework: 'ms-teams',
    uri: `${CDN_ROOT}ui/ms-teams/site.css`,
    type: 'style',
    async: true,
    name: 'ms_teams',
  },
  {
    framework: 'ms-teams',
    uri: `${CDN_ROOT}ui/ms-teams/msteams-16.css`,
    type: 'style',
    async: true,
    name: 'ms_teams',
  },
  {
    framework: 'ms-teams',
    uri: 'https://statics.teams.microsoft.com/sdk/v1.0/js/MicrosoftTeams.min.js',
    type: 'script',
    async: true,
    name: 'teams_app_script',
  },
  {
    framework: 'ms-teams',
    uri: `${CDN_ROOT}ui/ms-teams/teamsapp.js`,
    type: 'script',
    async: true,
    name: 'teams_app',
  },
];

const msTeamsConfigurationTab = {
  id: 'ms-teams-config-tab',
  uiFramework: 'ms-teams',
  uiSupport: ['material', 'bootstrap', 'ms-teams'],
  uiResources: msTeamsResources,
  title: 'Age Of Teams',
  tags: ['forgot password', 'user account'],
  sidebar: {
    hide: true,
  },
  header: {
    hide: true,
  },
  components: ['ms-teams-config-page'],
  schema: {
    title: 'Age Of Teams - Setup',
    description: 'Welcome to Age of Teams',
    type: 'object',
    required: [
      'tabChoice',
    ],
    properties: {
      tabChoice: {
        type: 'string',
        title: 'Select Tab',
        enum: [
          'Tasks',
          'Kudos',
        ],
      },
    },
  },
  uiSchema: {
    tabChoice: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
  },
  layout: {

  },
};

const resetPasswordForm = {
  id: 'password-reset',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Password Reset',
  tags: ['forgot password reset', 'user account', 'reset passwords'],
  schema: {
    title: '',
    description: 'Provide a new password and confirm it in order to change your password',
    type: 'object',
    required: [
      'email',
      'authToken',
      'password',
      'confirmPassword',
    ],
    properties: {
      email: {
        type: 'string',
        title: 'Email Address',
        readOnly: true,
      },
      authToken: {
        type: 'string',
        title: 'Token',
        readOnly: true,
      },
      password: {
        type: 'string',
        title: 'Password',
        format: 'password',
      },
      confirmPassword: {
        type: 'string',
        title: 'Confirm Password',
        format: 'password',
      },
    },
  },
  uiSchema: {
    password: {
      'ui:autofocus': true,
      'ui:widget': 'password',
      'ui:help': 'Ensure your password is at least 8 characters.',
    },
    confirmPassword: {
      'ui:widget': 'password',
      'ui:help': 'Ensure both passwords match',
    },
  },
  layout: {

  },
};


const paymentScheduleAddSchema = require('./formSchemas/new-payment-schedule.json');

const customPaymentSchedule = {
  id: 'payment-schedule-add',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Submit A Payment Schedule',
  tags: ['forgot password reset', 'user account', 'reset passwords'],
  mutation: {
    query: '',
    variables: {
      name: 'data',
      type: 'string',
    },
  },
  schema: paymentScheduleAddSchema,
};

const newProductPaymentSchema = require('./formSchemas/new-product-payment.json');

const newProductPayment = {
  id: 'new-product-payment',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Submit A Manual Payment',
  tags: [],
  mutation: {
    query: '',
    variables: {
      name: 'data',
      type: 'string',
    },
  },
  schema: newProductPaymentSchema,
};


const searchUserForm = {
  id: 'search-user',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Search',
  tags: ['forgot password', 'user account'],
  schema: {
    title: null,
    description: 'Search by email or first name and last name. i.e. joe.blogs@email.com or Joe Blogs',
    type: 'object',
    required: [
      'searchString',
    ],
    properties: {
      searchString: {
        type: 'string',
        title: 'Search',
      },
    },
  },
  uiSchema: {
    searchString: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
  },
  layout: {

  },
};

export default [
  productIdeas,
  productIdeasForm,
  defaultForm,
  arrayForm,
  messageForm,
  complexForm,
  forgotPasswordForm,
  resetPasswordForm,
  msTeamsConfigurationTab,
  customPaymentSchedule,
  newProductPayment,
  searchUserForm,
];
