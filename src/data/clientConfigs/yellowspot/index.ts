import {
  profileSmall,
  towerStoneMenuDef,
  MenuItems,
} from '../helpers/menus';

import themeOptions from './theme';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from '../helpers/defaultRoutes';
import { Reactory } from 'types/reactory';

const key = 'yellowspot';

const {
  CDN_ROOT,
  MODE = 'DEVELOP',
  API_URI_ROOT,
  REACTORY_CLIENT_URL = 'http://localhost:3000',
  MYSQL_DB_HOST = 'localhost',
  MYSQL_DB_USER = 'mores',
  MYSQL_DB_PASSWORD = 'mores_password',
  MYSQL_DB_DATABASE = 'mores_local',
  MYSQL_DB_PORT = 3306,
  MAIL_REDIRECT_ENABLED = 'development',
  MAIL_REDIRECT_ADDRESS = 'redirected@domain.com',
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

const applicationRoles = [
  APPLICATION_ROLES.USER,
  APPLICATION_ROLES.DEVELOPER,
  APPLICATION_ROLES.ADMIN,
  APPLICATION_ROLES.ANON,
  APPLICATION_ROLES.ORGANIZATION_ADMIN,
  APPLICATION_ROLES.FACILITATOR,
  APPLICATION_ROLES.PARTNER_ADMIN
];

let siteUrl = REACTORY_CLIENT_URL;
let MSOAuthRedirect = 'http://localhost:4000/auth/microsoft/openid/complete/yellowspot';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://yellowspot.reactory.net';
    MSOAuthRedirect = 'https://yellospot-io.reactory.net/auth/microsoft/openid/complete/yellowspot';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://app.yellowspot.com';
    MSOAuthRedirect = 'https://io.yellowspot.com/auth/microsoft/openid/complete/yellowspot';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}



const MainMenu: any = {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [],
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
  DEVELOP: [],
  PRODUCTION: [
    {
      ordinal: 0,
      title: 'Home',
      link: '/',
      icon: 'home',
      items: [
        {
          ordinal: 1,
          title: 'Corporate Dashboard',
          link: '/dashboard/',
          icon: 'business',
          roles: [APPLICATION_ROLES.ORGANIZATION_ADMIN, APPLICATION_ROLES.DEVELOPER],
        },
        {
          // /dashboard/
           ordinal: 2,
           title: 'Partner Dashboard',
           link: '/dashboard/partner/',
           icon: 'groups',
           roles: [APPLICATION_ROLES.PARTNER_ADMIN,  APPLICATION_ROLES.DEVELOPER],
         },
 
         {
           ordinal: 3,
           title: 'Facilitator Dashboard',
           link: '/dashboard/facilitator/',
           icon: 'group_work',
           roles: [APPLICATION_ROLES.FACILITATOR,  APPLICATION_ROLES.DEVELOPER],
         },
        {
          ordinal: 4,
          title: 'Administrator Dashboard',
          link: '/dashboard/administrator/',
          icon: 'admin_panel_settings',
          roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
        },
      ],
      roles: ['USER'],
    },
    /*
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
    */
    {
      ordinal: 3,
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
      ordinal: 17, title: 'Develop', link: '/Forms/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
      items: [
        {
          ordinal: 8, title: 'Reactory Forms', link: '/Forms/', icon: 'code', roles: ['DEVELOPER', 'ADMIN']
        },
        {
          ordinal: 11, title: 'GraphQL Queries', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
        },
      ]
    },
    {
      ordinal: 2, title: 'Admin', link: '/admin/', icon: 'settings_power',
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
          link: '/admin/static-content/',
          icon: 'file_copy',
          roles: ['ADMIN', 'DEVELOPER'],
        },        
        {
          ordinal: 2,
          title: 'Events',
          link: '/admin/events/',
          icon: 'event',
          roles: [
            APPLICATION_ROLES.ADMIN,
            APPLICATION_ROLES.DEVELOPER,
            APPLICATION_ROLES.ORGANIZATION_ADMIN,
            APPLICATION_ROLES.PARTNER_ADMIN
          ],
        },
        {
          ordinal: 3,
          title: 'Report',
          link: '/admin/surveys/',
          icon: 'report',
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
          ordinal: 92, title: 'How to', link: '/how-to/', icon: 'help_outline', roles: ['USER'],
        },
        {
          ordinal: 93, title: 'Glossary', link: '/glossary/', icon: 'textsms', roles: ['USER', 'ANON'],
        },        
        {
          ordinal: 94, title: 'Corporate', link: 'https://yellowspot.world', icon: 'travel_explore', roles: ['USER', 'ANON']
        },
        {
          ordinal: 95, title: 'Support', link: '/glossary/', icon: 'support_agent', roles: ['USER'],
        },
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
    key: 'register-organisation',
    title: 'Consultancy / Corporate Registration',
    path: '/register/**',
    public: false,
    exact: false,
    roles: ['ANON'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/register'
        },
      }
    ]
  },
  {
    key: 'dashboard-user',
    title: 'Default Home',
    path: '/',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: `${key}.Home@1.0.0`,
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
    key: 'dashboard-organization',
    title: 'Dashboard Organization',
    path: '/dashboard/**',
    public: false,
    exact: false,
    roles: ['USER'],
    componentFqn: `${key}.AdminRouter@1.0.0`,
    args: [
      { key: 'use_case', value: { use_case: 'organization_admin' } },
    ],
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
    componentFqn: `core.Profile@1.0.0`,
  },

  /*
  {
    key: 'reactoryrouter-mode-id',
    title: 'Reactory Forms',
    path: '/Forms/:formId/:mode/:id/**',
    exact: false,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/Forms'
        },
      }
    ]
  },

  {
    key: 'reactoryrouter-mode-specific',
    title: 'Reactory Forms',
    path: '/Forms/:formId/:mode/',
    exact: true,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/Forms'
        },
      }
    ]
  },

  {
    key: 'reactoryrouter-view',
    title: 'Reactory Forms',
    path: '/Forms/:formId/',
    exact: true,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/Forms'
        },
      }
    ]
  },
  */

  {
    key: 'reactoryrouter',
    title: 'Reactory Forms',
    path: '/Forms/**',
    exact: true,
    public: false,
    roles: ['ADMIN', 'DEVELOPER'],
    componentFqn: 'core.ReactoryRouter',
    args: [
      {
        key: 'routePrefix',
        value: {
          type: 'string',
          routePrefix: '/Forms'
        },
      }
    ]
  },

  {
    key: 'admin',
    title: 'Admin',
    path: '/admin/',
    exact: false,
    public: false,
    roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER, APPLICATION_ROLES.ORGANIZATION_ADMIN,],
    componentFqn: `${key}.AdminRouter@1.0.0`,
    args: [
      { key: 'use_case', value: { use_case: 'organization_admin' } },
    ],
  },

  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/org/:organizationId/surveys/:surveyId?',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'tab',
  //       value: {
  //         type: 'string',
  //         tab: 'survey'
  //       }
  //     }
  //   ]
  // },
  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/org/:organizationId/general',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'tab',
  //       value: {
  //         type: 'string',
  //         tab: 'general'
  //       }
  //     }
  //   ]
  // },
  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/org/:organizationId/brands',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'tab',
  //       value: {
  //         type: 'string',
  //         tab: 'brands'
  //       }
  //     }
  //   ]
  // },
  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/org/:organizationId/business-units/:businessUnitId?',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'tab',
  //       value: {
  //         type: 'string',
  //         tab: 'business-units'
  //       }
  //     }
  //   ]
  // },
  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/org/:organizationId/employees/:employeeId?',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'tab',
  //       value: {
  //         type: 'string',
  //         tab: 'survey'
  //       }
  //     }
  //   ]
  // },
  // {
  //   key: 'survey-admin',
  //   title: 'Survey Admin',
  //   path: '/admin/',
  //   exact: true,
  //   public: false,
  //   roles: [APPLICATION_ROLES.ADMIN, APPLICATION_ROLES.DEVELOPER],
  //   componentFqn: 'core.Administration@1.0.0',
  //   args: [
  //     {
  //       key: 'mode',
  //       value: {
  //         type: 'string',
  //         mode: 'overview'
  //       }
  //     }
  //   ]
  // },
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

  ...staticContentMappings.map((m) => ({ ...m, componentFqn: 'core.StaticContent@1.0.0' })),


];

// @ts-ignore
const config: Reactory.IReactoryClient = {
  key,
  name: 'Swarming.live',
  username: 'swarming.live',
  email: 'swaarming.live@yellowspot.com',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD_MORES,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://swarming.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles,
  billingType: 'partner',
  users: [
    {
      email: 'werner.weber@gmail.com', firstName: 'Werner', lastName: 'Weber', roles: ['USER', 'ADMIN', APPLICATION_ROLES.DEVELOPER],
    },
    {
      email: 'gordon@imgn.africa', firstName: 'Mandy', lastName: 'Eagar', roles: ['USER', APPLICATION_ROLES.PARTNER_ADMIN, APPLICATION_ROLES.DEVELOPER],
    },
    {
      email: 'deonblaauw@imgn.africa', firstName: 'Thea', lastName: 'Shaw', roles: ['USER', APPLICATION_ROLES.ORGANIZATION_ADMIN],
    },
    {
      email: 'werner.weber+swarming.user@gmail.com', firstName: 'Werner', lastName: 'Swarm', roles: ['USER'],
    },
    {
      email: 'werner.weber+swarming.live@gmail.com', firstName: 'Werner', lastName: 'Swarm', roles: ['USER', APPLICATION_ROLES.FACILITATOR],
    },
  ],
  components: [],
  menus: [],
  mode: 'development',
  routes,
  theme: 'yellowspot',
  themeOptions: themeOptions,
  allowCustomTheme: true,
  modules: [],
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
        email: MAIL_REDIRECT_ADDRESS,
        enabled: MAIL_REDIRECT_ENABLED.indexOf('development') >= 0,
      },
    },
    {
      name: 'email_redirect/PRODUCTION',
      data: {
        email: MAIL_REDIRECT_ADDRESS,
        enabled: MAIL_REDIRECT_ENABLED.indexOf('production') >= 0,
      },
    },
    {
      name: 'login_partner_keys',
      data: {
        //partner_keys: ['plc', 'towerstone', 'mores', 'thinklead', 'reactory'],
        partner_keys: ['plc', 'towerstone', 'mores', 'thinklead', 'reactory'],
        defaultAction: 'add_default_membership',
        organization_excludes: [],
        organization_includes: [],
      },
    }
  ],
  whitelist: [
    'localhost',
    'swarming.reactory.net',
    'app.swarming.live',
  ],
};

if (MODE !== 'PRODUCTION') {
  MainMenu.entries = [...Menus.PRODUCTION, ...Menus.DEVELOP];
} else {
  MainMenu.entries = [...Menus.PRODUCTION];
}

config.menus = [TopRightMenu, MainMenu];

export default config;
