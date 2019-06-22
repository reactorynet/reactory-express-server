import * as dotenv from 'dotenv';
import { defaultFormProps } from './forms/defs';
import { FormBuilder } from './forms/core/FormBuilder';
import { HelpFormEdit, HelpListForm } from './forms/core/HelpEditor';
import { TemplateEditor, TemplateList } from './forms/core/TemplateEditor';
import { SurveySettingsForm } from './forms/towerstone/SurveySettings';
import TaskDetailForm from './forms/core/task';


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


const LoginForm = {
  id: 'LoginForm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Login',
  tags: ['login', 'user account'],
  schema: {
    title: 'Login',
    description: '',
    type: 'object',
    required: [
      'email',
      'password',
    ],
    properties: {
      baseUrl: {
        type: 'string',
        title: 'Site Base',
        default: 'devsite.ninja',
      },
      clientId: {
        type: 'string',
        title: 'Client Id',
        default: 'masonwabe',
      },
      email: {
        type: 'string',
        format: 'email',
        title: 'Email',
      },
      password: {
        type: 'string',
        format: 'password',
        title: 'Password',
      },
    },
  },
  uiSchema: {},
  layout: {},
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
  name: 'ForgotPasswordForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
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
    },
  },
  defaultFormValue: {
    email: '',
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
  id: 'ResetPasswordForm',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Password Reset',
  tags: ['forgot password reset', 'user account', 'reset passwords'],
  registerAsComponent: true,
  name: 'ResetPasswordForm',
  nameSpace: 'forms',
  version: '1.0.0',
  backButton: true,
  helpTopics: ['password-reset'],
  schema: {
    title: '',
    description: 'Provide a new password and confirm it in order to change your password',
    type: 'object',
    required: [
      'user',
      'authToken',
      'password',
      'confirmPassword',
    ],
    properties: {
      user: {
        type: 'object',
        title: 'User',
        properties: {
          firstName: {
            type: 'string',
            title: 'First name',
          },
          lastName: {
            type: 'string',
            title: 'Last name',
          },
          email: {
            type: 'string',
            title: 'Email Address',
            readOnly: true,
          },
          avatar: {
            type: 'string',
            title: 'Avatar',
          },
        },
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
    user: {
      'ui:widget': 'UserListItemWidget',
    },
    authToken: {
      'ui:widget': 'HiddenWidget',
    },
    password: {
      'ui:help': 'Ensure your password is at least 8 characters long.',
    },
    confirmPassword: {
      'ui:help': 'Please re-enter your password to ensure they match',
    },
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

const paymentStatusUpdateSchema = require('./formSchemas/payment-status-update.json');

const paymentStatusUpdateForm = {
  id: 'payment-status-update',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Send a payment status',
  tags: [],
  schema: paymentStatusUpdateSchema,
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

/** *
 *
 * {
  organization: {
    type: ObjectId,
    ref: 'Organization',
  },
  members: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  name: String,
  description: String,
  avatar: String,
  createdAt: Date,
  updatedAt: Date,
  owner: {
    type: ObjectId,
    ref: 'User',
  },
}
 *
 */

const ContentPages = {
  id: 'ContentPages',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Content Pages',
  registerAsComponent: true,
  name: 'ContentPagesList',
  nameSpace: 'forms',
  version: '1.0.0',
  tags: ['Content Pages List'],
  helpTopics: ['Content Pages', 'Page Management'],
  componentDefs: [
    'core.OrganizationLabel',
    'core.DataListItem',
    'core.Logo',
  ],
  schema: {
    title: 'Pages',
    description: 'Available Pages',
    type: 'object',
    required: [

    ],
    properties: {
      pages: {
        type: 'array',
        items: {
          type: 'object',
          title: '${formData.Name} - ${formData.Path}',
          properties: {
            WebsitePageId: {
              type: 'string',
              title: 'Page Id',
            },
            IsDefault: {
              type: 'boolean',
              title: 'Is Default',
            },
            IsSubMenu: {
              type: 'boolean',
              title: 'Submenu',
            },
            MenuLocation: {
              type: 'number',
              title: 'Menu Location',
            },
            Name: {
              type: 'string',
              title: 'Name',
            },
            Path: {
              type: 'string',
              title: 'Path',
            },
            Status: {
              type: 'string',
              title: 'Is Enabled',
            },
            Target: {
              type: 'string',
              title: 'Target',
            },
          },
        },
      },
    },
  },
  defaultFormValue: {
    pages: [{
      Name: 'Default',
      Path: '/',
    }],
  },
  uiSchema: {
    pages: {
      items: {
        WebsitePageId: {
          'ui:widget': 'LinkField',
          'ui:options': {
            format: '/editor/${formData}',
            title: 'Edit Page',
            icon: 'edit',
          },
        },
      },
    },
  },
};

const froala_version = '2.9.1';
/**
 *
  load.css(`https://cdn.jsdelivr.net/npm/froala-editor@${froala_version}/css/froala_style.min.css`),
  load.js('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0/codemirror.min.js'),
  load.js('https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0/mode/xml/xml.min.js'),
  load.js(`https://cdn.jsdelivr.net/npm/froala-editor@${froala_version}/js/froala_editor.pkgd.min.js`),
 */
const FroalaResources = [
  /* {
    framework: 'jquery',
    uri: 'https://cdnjs.cloudflare.com/ajax/libs/jquery/1.11.0/jquery.min.js',
    async: true,
    type: 'script',
    name: 'jQuery',
    // loaded: () => { return jQuery !== null && jQuery !== undefined }, //eslint-disable-line
  },
  {
    framework: 'froala',
    uri: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0/codemirror.min.js',
    type: 'script',
    async: true,
    name: 'code_mirror_js',
  },
  {
    framework: 'froala',
    uri: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0/codemirror.min.css',
    type: 'style',
    async: true,
    name: 'code_mirror_css',
  },
  {
    framework: 'froala',
    uri: 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.25.0/mode/xml/xml.min.js',
    type: 'script',
    async: true,
    name: 'code_mirror_xml',
    delay: 1500,
  },

  {
    framework: 'froala',
    uri: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.4.0/css/font-awesome.min.css',
    type: 'style',
    async: true,
    name: 'froala_font_awesome440',
  },
  {
    framework: 'froala',
    uri: `https://cdn.jsdelivr.net/npm/froala-editor@${froala_version}/css/froala_editor.pkgd.min.css`,
    type: 'style',
    async: true,
    name: 'froala_style_pkg',
  },
  {
    framework: 'froala',
    uri: `https://cdn.jsdelivr.net/npm/froala-editor@${froala_version}/css/froala_style.min.css`,
    type: 'style',
    async: true,
    name: 'froala_style',
  },
  {
    framework: 'froala',
    uri: `https://cdn.jsdelivr.net/npm/froala-editor@${froala_version}/js/froala_editor.pkgd.min.js`,
    type: 'script',
    async: true,
    name: 'editor_package',
  },
  */
];

const PageEditorForm = require('./forms/boxcommerce/pageEditorForm').default;
const PageTemplateConfig = require('./forms/boxcommerce/pageTemplateConfig').default;


const FileLoader = {
  id: 'FileLoader',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Upload File',
  tags: ['File Loader'],
  registerAsComponent: true,
  nameSpace: 'forms',
  name: 'FileLoader',
  version: '1.0.0',
  schema: {
    title: 'File Loader',
    description: 'Select a file',
    type: 'object',
    properties: {
      content: {
        type: 'string',
        title: 'File Content',
      },
    },
  },
  uiSchema: {
    content: {
      'ui:widget': 'DropZoneWidget',
      'ui:options': {
        readAsString: true,
        accept: ['text/html', 'text/text', 'application/xml'],
      },
    },
  },
};

const ExternalLinkList = {
  id: 'ExternalLinkList',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Linked Resources',
  tags: ['Links', 'Resource'],
  schema: {
    title: 'Resources',
    description: 'Resource Loader',
    type: 'array',
    items: {
      type: 'object',
      title: 'External Resource',
      properties: {
        uri: {
          type: 'string',
          format: 'data-uri',
          title: 'Resource',
        },
        linkType: {
          type: 'string',
          enum: ['script', 'style', 'image'],
        },
        name: {
          type: 'string',
          title: 'Resource Name',
        },
      },
    },
  },
  uiSchema: {

  },
};


const BusinessUnitList = {
  id: 'business-units',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Search',
  tags: ['Business Unit'],
  componentDefs: [
    'core.OrganizationLabel',
    'core.DataListItem',
    'core.Logo',
  ],
  schema: {
    title: 'Business Units',
    description: 'Listed below are your business units',
    type: 'object',
    required: [
      'organization',
    ],
    properties: {
      organization: {
        type: 'object',
        title: 'Organisation',
        properties: {
          id: {
            type: 'string',
            title: 'Organisation Id',
          },
          name: {
            type: 'string',
            title: 'Organisation Name',
          },
          logo: {
            type: 'string',
            title: 'Logo',
          },
        },
      },
      businessUnits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'id',
            },
            name: {
              type: 'string',
              title: 'Name',
            },
            avatar: {
              type: 'string',
              title: 'Avatar',
              format: 'data-url',
            },
            owner: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  title: 'Id',
                },
                avatar: {
                  type: 'string',
                  title: 'Avatar',
                },
                firstName: {
                  type: 'string',
                  title: 'First Name',
                },
                lastName: {
                  type: 'string',
                  title: 'Last Name',
                },
              },
            },
            enabled: {
              type: 'boolean',
              title: 'Is Enabled',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    organization: {
      'ui:widget': 'LogoWidget',
    },
    businessUnits: {
      'ui:options': {
        primaryText: '${data.name}',
      },
    },
  },
  graphql: {
    query: {
      name: 'businessUnitsForOrganization',
      queryText: `
        query BusinessUnitsForOrganization($id: String){
          businessUnitsForOrganization(id: $id) {
            id
            name 
            description
            organization {
              id
              name
              logo
              avatar
            }
            owner {
              id
              firstName
              lastName
              email
              avatar
            }
            members {
              id
              firstName
              lastName
              email
              avatar
            }
          }
        }
      `,
      variables: {
        id: '${organization.id}',
      },
    },
  },
};

const BusinessUnitForm = {
  id: 'business-unit',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Business Unit',
  tags: ['Business Unit'],
  schema: {
    title: null,
    description: '',
    type: 'object',
    required: [
      'organization',
      'name',
    ],
    properties: {
      id: {
        type: 'string',
        title: 'id',
      },
      organization: {
        type: 'string',
        title: 'Organization Id',
      },
      name: {
        type: 'string',
        title: 'Name',
      },
      avatar: {
        type: 'string',
        title: 'Avatar',
        format: 'data-url',
      },
      owner: {
        type: 'string',
        title: 'Business Unit Owner',
      },
      enabled: {
        type: 'boolean',
        title: 'Is Enabled',
      },
      members: {
        title: 'Business Unit Members',
        type: 'array',
        items: {
          type: 'string',
          title: 'Member Id',
        },
      },
    },
  },
  uiSchema: {
    id: {
      'ui:options': {
        hidden: 'true',
      },
    },
    organization: {

    },
    owner: {
      'ui:options': {
        componentFqn: 'core.UserListWithSearch',
        organizationId: '${organization}',
        businessUnitId: '${id}',
        multiple: false,
      },
      'ui:widget': 'email',
    },
    name: {
      'ui:autofocus': true,
      'ui:emptyValue': '',
    },
    members: {
      'ui:options': {
        componentFqn: 'core.UserListWithSearch',
        componentProps: {
          organizationId: '${organization}',
          businessUnitId: '${id}',
          multiple: true,
        },
      },
    },
    avatar: {
      'ui:options': {
        componentFqn: 'core.Avatar',
        context: 'business-unit',
        title: 'Select Avatar For Business Unit',
        organizationId: '${organization}',
        businessUnitId: '${id}',
      },
    },
  },
  layout: {
    componentFqn: 'core.SingleColumnLayout',
  },
  propTypes: {
    mode: {
      type: 'string',
      title: 'Mode',
      enum: ['new', 'edit', 'read-only'],
      defaultValue: 'new',
    },
  },
};


const TowerStoneTaskDetailUISchema = require('./forms/towerstone/TowerStoneTask').TowerStoneTaskDetailUISchema;

const TowerStoneTaskDetailForm = {
  ...TaskDetailForm,
  id: 'TowerStoneTaskDetailForm',
  name: 'TowerStoneTaskDetailForm',
  uiSchema: TowerStoneTaskDetailUISchema,
};


const CommentForm = {
  id: 'CommentForm',
  ...defaultFormProps,
  name: 'CommentForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
  schema: {
    title: 'Comment',
    type: 'object',
    properties: {
      newComment: {
        type: 'string',
        title: 'Add Comment',
      },
    },
  },
  uiSchema: {

  },
};

const ProjectDetailSchema = require('./modelSchema/Project').default;

const ProjectForm = {
  id: 'PojectForm',
  ...defaultFormProps,
  name: 'PojectForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
  schema: ProjectDetailSchema,
  uiSchema: {

  },
};

const TowerStoneSurveyConfig = require('./forms/towerstone/SurveyConfig');

const TowerStoneSurveyConfigForm = {
  id: 'TowerStoneSurveyConfig',
  ...defaultFormProps,
  nameSpace: 'forms',
  name: 'TowerStoneSurveyConfig',
  registerAsComponent: true,
  schema: TowerStoneSurveyConfig.default,
  uiSchema: TowerStoneSurveyConfig.uiSchema,
  defaultFormValue: TowerStoneSurveyConfig.defaultFormValue,
  backButton: true,
  helpTopics: ['survey-config-main'],
  graphql: {
    query: {
      name: 'surveyDetail',
      text: TowerStoneSurveyConfig.surveyQuery,
      variables: TowerStoneSurveyConfig.queryMap,
      resultMap: TowerStoneSurveyConfig.queryResultMap,
      new: false,
      edit: true,
    },
    mutation: {
      new: {
        name: 'createSurvey',
        text: TowerStoneSurveyConfig.createMutation,
        objectMap: true,
        variables: TowerStoneSurveyConfig.createMutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'redirect',
        onSuccessUrl: 'admin/org/${formData.organization}/surveys/${createSurvey.id}',
        onSuccessRedirectTimeout: 1000,
      },
      edit: {
        name: 'updateSurvey',
        text: TowerStoneSurveyConfig.updateMutation,
        objectMap: true,
        variables: TowerStoneSurveyConfig.updateMutationMap,
        options: {
          refetchQueries: [],
        },
        onSuccessMethod: 'refresh',
      },
    },
  },
};

const TowerStoneLeadershipBrandConfigForm = require('./forms/towerstone/LeadershipBrands').default;
const TowerStoneSurveyDelegateConfig = require('./forms/towerstone/SurveyDelegates').SurveyDelegatesForm;
const TowerStoneSurveySettings = require('./forms/towerstone/SurveySettings').SurveySettingsForm;
const UserPeers = require('./forms/core/user/UserPeers/index').default;
const ProjectLayout = require('./forms/core/project').default;
const ProjectListWidget = require('./forms/core/project').ProjectListWidget;
const ProjectDetailForm = require('./forms/core/project').ProjectDetailForm;
const OrganizationForm = require('./forms/core/organization').default;
const { OrganizationLoginForm } = require('./forms/core/organization');
const LasecCrmDashboardForm = require('./forms/lasec/dashboard/crmdash').default.CrmDashboardForm;
const LasecQuoteListForm = require('./forms/lasec/dashboard/crmdash').default.QuotesList;
const LasecQuoteDetailForm = require('./forms/lasec/dashboard/crmdash').default.QuoteDetail;
const LasecUpdateQuoteStatusForm = require('./forms/lasec/quote/UpdateQuoteStatus').UpdateQuoteStatusForm;
const MicrosoftOpenIDAuthenticationForm = require('./forms/microsoft/security').MicrosoftOpenIDAuthenticationForm;

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
  paymentStatusUpdateForm,
  BusinessUnitForm,
  BusinessUnitList,
  PageEditorForm,
  LoginForm,
  LasecCrmDashboardForm,
  LasecQuoteListForm,
  LasecQuoteDetailForm,
  LasecUpdateQuoteStatusForm,
  OrganizationForm,
  OrganizationLoginForm,
  ContentPages,
  FileLoader,
  ExternalLinkList,
  PageTemplateConfig,
  ProjectLayout,
  TaskDetailForm,
  CommentForm,
  ProjectForm,
  ProjectListWidget,
  ProjectDetailForm,
  TowerStoneSurveyConfigForm,
  TowerStoneLeadershipBrandConfigForm,
  TowerStoneSurveyDelegateConfig,
  TowerStoneSurveySettings,
  FormBuilder,
  HelpFormEdit,
  HelpListForm,
  TemplateEditor,
  TemplateList,
  TowerStoneTaskDetailForm,
  UserPeers,
  MicrosoftOpenIDAuthenticationForm,
];
