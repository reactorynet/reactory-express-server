"use strcit"
import Reactory from "@reactory/reactory-core";
import { defaultFormProps } from '@reactory/server-core/data/forms/defs';
import { FormBuilder } from '@reactory/server-modules/core/forms/ReactoryFormEditor//FormBuilder';
import { HelpFormEdit, HelpListForm } from '@reactory/server-modules/core/forms/ReactoryContentCapture/HelpEditor';
import { TemplateEditor } from '@reactory/server-core/modules/core/forms/EmailTemplate/TemplateEditor/TemplateEditor';

import PageEditorForm from '@reactory/server-modules/core/forms/ReactoryFormEditor/pageEditorForm';
import PageTemplateConfig from '@reactory/server-modules/core/forms/ReactoryFormEditor/pageTemplateConfig';
import { ReactoryApplicationsForm, ReactoryDashboard, ReactoryClientAdminPage } from './ReactoryAdmin/dashboard';
import UserForms from '@reactory/server-modules/core/forms/User';

import OrganizationForms from '@reactory/server-modules/core/forms/Organization';
import MicrosoftOpenIDAuthenticationForm from '@reactory/server-modules/core/forms/Security/microsoft_auth';


const { CDN_ROOT } = process.env;

/**
 * Some core forms that are part of the system
 */


const ForgotPasswordForm: Reactory.Forms.IReactoryForm = {
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

const MessageForm: Reactory.Forms.IReactoryForm = {
  id: 'message-form',
  nameSpace: 'forms',
  name: 'MessageForm',
  version: '1.0.0',
  registerAsComponent: false,
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

const MSTeamsConfigurationTab: Reactory.Forms.IReactoryForm = {
  id: 'ms-teams-config-tab',
  name: 'MicrosoftTeamsConfigurationPage',
  nameSpace: 'microsoft-teams',
  version: '1.0.0',
  uiFramework: 'ms-teams',
  uiSupport: ['material', 'bootstrap', 'ms-teams'],
  uiResources: msTeamsResources,
  registerAsComponent: false,
  title: 'Age Of Teams',
  tags: ['forgot password', 'user account'],
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
};

const ResetPasswordForm: Reactory.Forms.IReactoryForm = {
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


const SearchUserForm: Reactory.Forms.IReactoryForm = {
  id: 'search-user',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Search',
  name: 'SearchUserForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
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
};


const ContentPages: Reactory.Forms.IReactoryForm = {
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


const FileLoader: Reactory.Forms.IReactoryForm = {
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
      'ui:widget': 'ReactoryDropZoneWidget',
      'ui:options': {
        readAsString: true,
        accept: ['text/html', 'text/text', 'application/xml'],
      },
    },
  },
};

const ExternalLinkList: Reactory.Forms.IReactoryForm = {
  id: 'ExternalLinkList',
  name: 'ExternalLinkList',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
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


const BusinessUnitList: Reactory.Forms.IReactoryForm = {
  id: 'business-units',
  name: 'BusinessUnitList',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
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
      text: `
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

const BusinessUnitForm: Reactory.Forms.IReactoryForm = {
  id: 'business-unit',
  name: 'BusinessUnitForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: false,
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
};

const CommentForm: Reactory.Forms.IReactoryForm = {
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

export default [
  FormBuilder,
  HelpListForm,
  HelpFormEdit,
  TemplateEditor,
  PageEditorForm,
  PageTemplateConfig,
  ReactoryApplicationsForm,
  ReactoryDashboard,
  ReactoryClientAdminPage,
  ...UserForms,
  ...OrganizationForms,
  ForgotPasswordForm,
  MessageForm,
  MSTeamsConfigurationTab,
  MicrosoftOpenIDAuthenticationForm,
  ResetPasswordForm,
  SearchUserForm,
  ContentPages,
  FileLoader,
  ExternalLinkList,
  BusinessUnitList,
  BusinessUnitForm,
  CommentForm
]