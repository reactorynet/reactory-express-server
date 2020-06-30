import * as dotenv from 'dotenv';
import {
  profileSmall,
  towerStoneMenuDef,
  MenuItems,
} from '../menus';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from './defaultRoutes';

dotenv.config();

const {
  CDN_ROOT,
  MODE = 'DEVELOP',
  API_URI_ROOT,
  REACTORY_CLIENT_URL = 'http://localhost:3000',
  MYSQL_DB_HOST = 'localhost',
  MYSQL_DB_USER = 'mores',
  MYSQL_DB_PASSWORD = 'mores_password',
  MYSQL_DB_DATABASE = 'mores_local',
  MYSQL_DB_PORT = 3306
} = process.env;

/**
* OAUTH_REDIRECT_URI=http://localhost:4000/auth/microsoft/openid/complete/lasec-crm
OAUTH_SCOPES="profile offline_access user.read calendars.readwrite mail.readwrite mail.send tasks.readwrite email openid"
OAUTH_AUTHORITY=https://login.microsoftonline.com/common
OAUTH_ID_METADATA=/v2.0/.well-known/openid-configuration
OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token
 */

const APPLICATION_ROLES = {
  USER: 'USER',
  DEVELOPER: 'DEVELOPER',
  ADMIN: 'ADMIN',
  ANON: 'ANON',
  ORGANIZATION_ADMIN: 'ORGANIZATION_ADMIN',
  FACILITATOR: 'FACILITATOR',
  PARTNER_ADMIN: 'PARTNER_ADMIN'
};

const  applicationRoles = [
  APPLICATION_ROLES.USER,
  APPLICATION_ROLES.DEVELOPER,
  APPLICATION_ROLES.ADMIN,
  APPLICATION_ROLES.ANON,
  APPLICATION_ROLES.ORGANIZATION_ADMIN,
  APPLICATION_ROLES.FACILITATOR,
  APPLICATION_ROLES.PARTNER_ADMIN
];

let siteUrl = REACTORY_CLIENT_URL;
let MSOAuthRedirect = 'http://localhost:4000/auth/microsoft/openid/complete/mores';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://mores.reactory.net';
    MSOAuthRedirect = 'https://api.reactory.net/auth/microsoft/openid/complete/mores';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://app.mores-assessments.com';
    MSOAuthRedirect = 'https://api.towerstone-global.com/auth/microsoft/openid/complete/mores';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}

const key = 'mores';

const MainMenu = {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [

  ],
};

const TopRightMenu = {
  name: 'Profile Small',
  key: 'profile-small',
  target: 'top-right',
  roles: ['ANON', 'USER'],
  entries: [
    MenuItems.signin,
    MenuItems.signout,
  ],
};

const staticContentMappings = [
  {
    key: 'about',
    title: 'About Us',
    path: '/about/*',
    public: true,
    exact: true,
    roles: ['USER', 'GUEST'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'about-us',
        }
      }
    ]
  },

  {
    key: 'whats-new',
    title: 'What\'s new',
    path: '/whats-new/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'whats-new',
        }
      }
    ]
  },

  {
    key: 'how-to',
    title: 'How to',
    path: '/how-to/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'how-to',
        }
      }
    ]
  },

  {
    key: 'glossary',
    title: 'Glossary',
    path: '/glossary/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'glossary',
        }
      }
    ]
  },
];

/**
 * A wrapper object for menus, makes it easier for merging during development and production
 */
const Menus = {
  DEVELOP: [
  ],

  PRODUCTION: [
    {
      ordinal: 0,
      title: 'Dashboard',
      link: '/',
      icon: 'assessment',
      items: [
        {
          ordinal: 1,
          title: 'Organization Dashboard',
          link: '/dashboard/organization/',
          icon: 'assessment',
          roles: [APPLICATION_ROLES.ORGANIZATION_ADMIN, APPLICATION_ROLES.DEVELOPER],
        },
       /* {
          ordinal: 2,
          title: 'Partner Dashboard',
          link: '/dashboard/partner/',
          icon: 'assessment',
          roles: [APPLICATION_ROLES.PARTNER_ADMIN,  APPLICATION_ROLES.DEVELOPER],
        },

        {
          ordinal: 3,
          title: 'Facilitator Dashboard',
          link: '/dashboard/facilitator/',
          icon: 'assessment',
          roles: [APPLICATION_ROLES.FACILITATOR,  APPLICATION_ROLES.DEVELOPER],
        },
        */
        {
          ordinal: 4,
          title: 'Administrator Dashboard',
          link: '/dashboard/administrator/',
          icon: 'assessment',
          roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
        },
      ],
      roles: ['USER'],
    },
    {
      ordinal: 1,
      title: 'Assessments',
      link: '/assessments/current/',
      icon: 'record_voice_over',
      roles: ['USER'],
      items: [

        {
          ordinal: 0,
          title: 'Reports',
          link: '/assessments/reports/',
          icon: 'print',
          roles: ['USER'],
        },

        {
          ordinal: 1,
          title: 'History',
          link: '/assessments/archived/',
          icon: 'restore',
          roles: ['USER'],
        },
      ]
    },
    {
      ordinal: 2,
      title: 'Profile',
      link: '/profile/',
      icon: 'perm_identity',
      roles: ['USER'],
      items: [
        {
          ordinal: 0,
          title: 'Colleagues',
          link: '/profile/collleagues/',
          icon: 'people',
          roles: ['USER'],
        },
        {
          ordinal: 1,
          title: 'Demographics',
          link: '/profile/demographics/',
          icon: 'psychology',
          roles: ['USER'],
        },
      ]
    },
    {
      ordinal: 17, title: 'Develop', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
      items: [
        {
          ordinal: 8, title: 'Reactory Forms', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN']
        },
        {
          ordinal: 11, title: 'GraphQL', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
        },
      ]
    },
    {
      orinal: 96, title: 'Admin', link: '/admin/', icon: 'settings_power',
      roles: [
        APPLICATION_ROLES.ADMIN,
        APPLICATION_ROLES.DEVELOPER,
        APPLICATION_ROLES.ORGANIZATION_ADMIN,
        APPLICATION_ROLES.PARTNER_ADMIN
      ],
      items: [
        {
          ordinal: 0,
          title: 'Static Content',
          link: '/admin/content/',
          icon: 'file_copy',
          roles: ['ADMIN', 'DEVELOPER'],
        },
        {
          ordinal: 1,
          title: 'New Static Entry',
          link: '/admin/content/new',
          icon: 'note_add',
          roles: ['ADMIN', 'DEVELOPER'],
        },
        {
          ordinal: 2,
          title: 'Organization Admin',
          link: '/admin/organization/',
          icon: 'business',
          roles: [
            APPLICATION_ROLES.ADMIN,
            APPLICATION_ROLES.DEVELOPER,
            APPLICATION_ROLES.ORGANIZATION_ADMIN,
            APPLICATION_ROLES.PARTNER_ADMIN
          ],
        },
        {
          ordinal: 3,
          title: 'Surveys',
          link: '/admin/surveys/',
          icon: 'assignment',
          roles: [
            APPLICATION_ROLES.ADMIN,
            APPLICATION_ROLES.DEVELOPER,
            APPLICATION_ROLES.ORGANIZATION_ADMIN,
            APPLICATION_ROLES.PARTNER_ADMIN
          ]
        },
        {
          ordinal: 4,
          title: 'System Administration',
          link: '/admin/system/',
          icon: 'admin_panel_settings',
          roles: ['ADMIN', 'DEVELOPER']
        },
      ]
    },
    {
      ordinal: 97, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER', 'ANON'],
      items: [
        {
          ordinal: 90, title: 'What\'s new', link: '/whats-new/', icon: 'schedule', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 91, title: 'About', link: '/about/', icon: 'info', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 92, title: 'How to', link: '/how-to/', icon: 'help_outline', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 93, title: 'Glossary', link: '/glossary/', icon: 'textsms', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 94, title: 'Linked In', link: 'https://www.linkedin.com/company/mores-assessments/', icon: 'linkedin', roles: ['USER', 'ANON']
        }
      ]
    },
  ]
};

const routes = [
  {
    ...loginroute,
    background: {
      image: 'default',
    },
    args: [
      ...loginroute.args,
      {
        key: 'style',
        value: {
          type: 'object',
          style: {
            marginTop: '10px',
          },
        },
      },
      {
        key: 'forgotEnabled',
        value: {
          type: 'bool',
          forgotEnabled: true,
        },
      },
      {
        key: 'authlist',
        value: {
          type: 'bool',
          authlist: [
            'local',
            //'microsoft',
            //'google',
            //'linkedin'
          ],
        },
      },
    ],
  },
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  {
    key: 'dashboard-user',
    title: 'Dashboard User',
    path: '/',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: `${key}.DashboardUserHOC@1.0.0`,
  },

  {
    key: 'dashboard-organization',
    title: 'Dashboard Organization',
    path: '/dashboard/organization/**',
    public: false,
    exact: false,
    roles: ['USER'],
    componentFqn: `${key}.DashboardOrganizationHOC@1.0.0`,
  },

  {
    key: 'dashboard-organization',
    title: 'Dashboard Facilitator',
    path: '/dashboard/facilitator/**',
    public: false,
    exact: false,
    roles: [APPLICATION_ROLES.FACILITATOR, APPLICATION_ROLES.DEVELOPER],
    componentFqn: `${key}.DashboardFacilitatorHOC@1.0.0`,
  },

  {
    key: 'dashboard-administrator',
    title: 'Dashboard Administrator',
    path: '/dashboard/administrator/**',
    public: false,
    exact: false,
    roles: [APPLICATION_ROLES.ADMIN],
    componentFqn: `${key}.DashboardAdministratorHOC@1.0.0`,
  },

  {
    key: 'surveys',
    title: 'Surveys',
    path: '/surveys/**',
    exact: false,
    public: false,
    roles: ['USER'],
    componentFqn: `${key}.SurveysHOC@1.0.0`,
    componentProps: {
      minimal: false,
    },
    args: {
      key: 'minimal',
      value: {
        minimal: false,
      },
    },
  },

  {
    key: 'assessment',
    title: 'Assess',
    path: '/assessments/current/',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: `towerstone.Surveys@1.0.0`,
    args: [
      {
        key: 'view',
        value: {
          view: 'current'
        }
      }
    ]
  },

  {
    key: 'assessment',
    title: 'Assess',
    path: 'assessments/archived/',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: `towerstone.Surveys@1.0.0`,
    args: [
      {
        key: 'view',
        value: {
          view: 'archived'
        }
      }
    ]
  },

  {
    key: 'assessment',
    title: 'Assess',
    path: '/assess/**',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: `towerstone.Assessment@1.0.0`,
  },
  {
    key: 'profile',
    title: 'Profile',
    path: '/profile/**',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: `${key}.ProfileHOC@1.0.0`,
  },
  {
    key: 'reactoryrouter',
    title: 'Reactory Forms',
    path: '/reactory/**',
    exact: false,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/reactory'
        },
      }
    ]
  },
  {
    key: 'administration',
    title: 'Administration',
    path: '/admin/**',
    exact: true,
    public: false,
    roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
    componentFqn: 'core.Administration@1.0.0',
  },
  {
    key: 'content-list',
    title: 'Content List',
    path: '/static-content/',
    public: false,
    exact: true,
    roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
    componentFqn: 'static.ContentList@1.0.0',
    args: [
      {
        key: 'mode',
        value: {
          type: 'string',
          mode: 'edit',
        }
      }
    ]
  },
  {
    key: 'content-capture',
    title: 'Content Capture',
    path: '/static-content/edit/:slug/*',
    public: false,
    exact: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'static.ContentCapture@1.0.0',
    args: [
      {
        key: 'mode',
        value: {
          type: 'string',
          mode: 'edit',
        }
      }
    ]
  },

  {
    key: 'graphiql',
    title: 'GraphiQL',
    path: '/graphiql/**',
    exact: true,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryGraphiQLExplorer@1.0.0'
  },

  ...staticContentMappings.map(( m ) => ({...m, componentFqn: 'core.StaticContent@1.0.0'})),


];

const config = {
  key,
  name: 'Mores Assessments',
  username: 'mores-assessments',
  email: 'app@mores-assessments.com',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD_MORES,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.mores-assessments.com',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles,
  billingType: 'partner',
  users: [
    {
      email: 'werner.weber@gmail.com', roles: ['ADMIN', 'USER', 'DEVELOPER', APPLICATION_ROLES.ORGANIZATION_ADMIN], firstName: 'Werner', lastName: 'Weber',
    },
    {
      email: 'drewmurphyza@gmail.com', roles: ['ADMIN', 'USER', 'DEVELOPER', APPLICATION_ROLES.ORGANIZATION_ADMIN], firstName: 'Drew', lastName: 'Murphy',
    },
    {
      email: 'garydob@gmail.com', roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.USER, APPLICATION_ROLES.DEVELOPER, APPLICATION_ROLES.ORGANIZATION_ADMIN], firstName: 'Gary', lastName: 'Dobkins',
    },
    {
      email: 'yolande.wheatley@towerstone-global.com', roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.USER, APPLICATION_ROLES.DEVELOPER, APPLICATION_ROLES.ORGANIZATION_ADMIN], firstName: 'Yolande', lastName: 'Wheatley',
    },
    {
      email: 'thea.shaw@towerstone-global.com', roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.USER, APPLICATION_ROLES.DEVELOPER, APPLICATION_ROLES.ORGANIZATION_ADMIN], firstName: 'Thea', lastName: 'Shaw',
    },
  ],
  components: [],
  menus: [],
  routes,
  theme: 'mores',
  themeOptions: {
    key,
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#52687b',
      grey: {
        light: '#757575',
        main: '#5fb848',
        dark: '#298717',
        contrastText: '#222732',
      },      
      error: {
        light: '#C7212D',
        main: '#C7212D',
        dark: '#C7212D',
        contrastText: '#C7212D',
      },      
      success: {
        light: '#6DB84A',
        main: '#6DB84A',
        dark: '#6DB84A',
        contrastText: '#222732',
      },
      warning: {
        light: '#F6950F',
        main: '#F6950F',
        dark: '#F6950F',
        contrastText: '#F6950F',
      },      
      info: {
        light: '#49B4D4',
        main: '#49B4D4',
        dark: '#49B4D4',
        contrastText: '#222732',
      },
      primary: {
        light: '#7f96aa',
        main: '#52687b',
        dark: '#85B810',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#aeca6a',
        main: '#7D993C',
        dark: '#4e6b0a',
        contrastText: '#000000',
      },
      report: {
        empty: '#ffffd2',
        fill: '#273e4f',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/stairs.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.ico`,
      emailLogo: `${CDN_ROOT}themes/${key}/images/logo.png`,
    },
    content: {
      appTitle: 'Mores Assessments',
      login: {
        message: 'Each one of us has only one precious life',
      },
    },
  },
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'local',
      enabled: true,
      properties: {

      }
    },
    {
      provider: 'microsoft',
      enabled: true,
      properties: {
        OAUTH_APP_ID: 'your app id goes here',
        OAUTH_APP_PASSWORD: 'your app pass goes here',
        OAUTH_REDIRECT_URI: MSOAuthRedirect,
        OAUTH_SCOPES: 'profile offline_access user.read calendars.read',
        OAUTH_AUTHORITY: 'https://login.microsoftonline.com/common',
        OAUTH_ID_METADATA: '/v2.0/.well-known/openid-configuration',
        OAUTH_AUTHORIZE_ENDPOINT: '/oauth2/v2.0/authorize',
        OAUTH_TOKEN_ENDPOINT: '/oauth2/v2.0/token'
      }
    },
    {
      provider: 'facebook',
      enabled: false,
    },
    {
      provider: 'google',
      enabled: false,
    },
    {
      provider: 'linkedin',
      enabled: false,
    }
  ],
  settings: [
    {
      name: 'new_user_roles',
      componentFqn: 'core.Setting@1.0.0',
      formSchema: {
        type: 'string',
        title: 'Default User Role',
        description: 'The default user role to assign to a new user',
      },
      data: ['USER'],
    },
    {
      name: 'email_redirect/DEVELOP',
      data: {
        email: 'werner.weber+moresredirect@gmail.com',
        enabled: false,
      },
    },
    {
      name: 'email_redirect/PRODUCTION',
      data: {
        email: 'werner.weber+moreredirect@gmail.com',
        enabled: false,
      },
    },
    {
      name: 'login_partner_keys',
      data: {
        partner_keys: ['plc', 'towerstone', 'mores', 'thinklead', 'reactory'],
        defaultAction: 'add_default_membership',
        organization_excludes: [],
        organization_includes: [],
      },
    }
  ],
  whitelist: [
    'localhost',
    'mores.reactory.net',
    'app.mores-assessments.com',
  ],
};

if (MODE !== 'PRODUCTION') {
  MainMenu.entries = [...Menus.PRODUCTION, ...Menus.DEVELOP];
} else {
  MainMenu.entries = [...Menus.PRODUCTION];
}

config.menus = [TopRightMenu, MainMenu];

export default config;
