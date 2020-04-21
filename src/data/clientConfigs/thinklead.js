import * as dotenv from 'dotenv';
import {
  profileSmall,
  towerStoneMenuDef,
} from '../menus';

import {
  loginroute,
  forgotpasswordroute,
  logoutroute, formsroute, resetpasswordroute,
} from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE, API_URI_ROOT } = process.env;

let siteUrl = '';// 'http://localhost:3000' : 'https://public.thinklead.app/';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://thinklead.reactory.net';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://public.thinklead.app';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}


export default {
  key: 'thinklead',
  name: 'Thinklead GLP',
  username: 'thinklead',
  email: 'thinklead@reactory.net',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD_TOWERSTONE,
  siteUrl,
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/thinklead/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  organization: [
    {
      name: 'Demo Org', key: 'demo-org',
    },
  ],
  users: [
    {
      email: 'werner.weber@gmail.com', firstName: 'Werner', lastName: 'Weber', roles: ['USER', 'ADMIN'],
    },    
  ],
  components: [
    {
      nameSpace: 'thinklead',
      name: 'Dashboard',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['USER'],
      arguments: [],
      resources: [],
    },
    {
      nameSpace: 'thinklead',
      name: 'Surveys',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['USER'],
      arguments: [],
      resources: [],
    },
    {
      nameSpace: 'thinklead',
      name: 'Tasks',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['USER'],
      arguments: [],
      resources: [],
    },
    {
      nameSpace: 'core',
      name: 'Profile',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['USER'],
      arguments: [
        {
          key: 'withPeers',
          value: false,
        },
      ],
      resources: [],
    },
    {
      nameSpace: 'core',
      name: 'Administration',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['ADMIN'],
      arguments: [],
      resources: [],
    },
  ],
  menus: [
    profileSmall,
    {
      name: 'Main',
      key: 'left-nav',
      target: 'left-nav',
      roles: ['USER'],
      entries: [
        {
          ordinal: 0, title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER'],
        },    
        {
          ordinal: 2, title: 'I-LEAD', link: '/i-lead/', icon: 'check_circle', roles: ['USER'],
        },
        {
          ordinal: 3, title: 'Global Contributors', link: '/reports/', icon: 'bug_report', roles: ['USER'],
        },    
        {
          ordinal: 4, title: 'Daily', link: '/reports/', icon: 'chat', roles: ['USER'],
        },            
        {
          ordinal: 5, title: 'My Posts', link: '/profile/', icon: 'account_circle', roles: ['USER'],
        },
        {
          ordinal: 6, title: 'Resource Centre', link: '/admin/', icon: 'supervisor_account', roles: ['ADMIN'],
          items: [
            {
              ordinal: 0, title: 'Static Content', link: '/static-content/', icon: 'pencil', roles: ['DEVELOPER',  'ADMIN']
            },
          ],
        },
        {
          ordinal: 6, title: 'Admin', link: '/admin/', icon: 'supervisor_account', roles: ['ADMIN'],
          items: [
            {
              ordinal: 0, title: 'Static Content', link: '/static-content/', icon: 'pencil', roles: ['DEVELOPER',  'ADMIN']
            },
          ],
        },
        {
          ordinal: 17, title: 'Develop', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
          items: [
            {
              ordinal: 8, title: 'Reactory Forms', link: '/reactory/', icon: 'code', roles: ['DEVELOPER',  'ADMIN']
            },
            {
              ordinal: 11, title: 'GraphQL', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
            },        
          ]
        },
      ],
    },
  ],
  routes: [
    {
      ...loginroute,
      args: [
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
            ],
          },
        },
      ],
    },
    logoutroute,
    forgotpasswordroute,
    resetpasswordroute,
    formsroute,
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: 'thinklead.Dashboard@1.0.0',
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },    
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile/**',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withPeers: true,
      },
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin/**',
      exact: true,
      public: false,
      roles: ['ADMIN'],
      componentFqn: 'core.Administration@1.0.0',
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
      key: 'content-capture',
      title: 'Content Capture',
      path: '/content-capture/edit/:slug/',
      public: false,
      exact: false,
      roles: ['ADMIN'],
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
  ],
  theme: 'thinklead',
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#990033',
      primary: {
        light: '#fc5e58',
        main: '#c3272e',
        dark: '#8b0006',
        contrastText: '#FFFFFF',
      },
      secondary: {
        light: '#e04d43',
        main: '#a8111b',
        dark: '#720000',
        contrastText: '#FFFFFF',
      },
      report: {
        empty: '#F7BFBA',
        fill: '#990033',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/thinklead/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/thinklead/images/logo.png`,
      // emailLogo: `${CDN_ROOT}themes/thinklead/images/logo_small.png`,
      emailLogo: 'http://www.thinklead-global.com/cms/wp-content/uploads/2017/07/TowerStone-New-Logo-01_new.png',
      favicon: `${CDN_ROOT}themes/thinklead/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/thinklead/images/avatar.png`,
    },
    content: {
      appTitle: 'TowerStone Leadership Centre',
      login: {
        message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.',
      },
    },
  },
  themes: [
    {
      key: 'thinklead',
      title: 'Default Thinklead Theme',
      theme: {
        typography: {
          useNextVariants: true,
        },
        type: 'material',
        palette: {
          primary1Color: '#990033',
          primary: {
            light: '#fc5e58',
            main: '#c3272e',
            dark: '#8b0006',
            contrastText: '#FFFFFF',
          },
          secondary: {
            light: '#fc5e58',
            main: '#c3272e',
            dark: '#8b0006',
            contrastText: '#FFFFFF',
          },
          report: {
            empty: '#F7BFBA',
            fill: '#990033',
          },
        },
        assets: {
          featureImage: `${CDN_ROOT}themes/thinklead/images/featured.jpg`,
          logo: `${CDN_ROOT}themes/thinklead/images/logo.png`,
          // emailLogo: `${CDN_ROOT}themes/thinklead/images/logo_small.png`,
          emailLogo: 'http://www.thinklead-global.com/cms/wp-content/uploads/2017/07/TowerStone-New-Logo-01_new.png',
          favicon: `${CDN_ROOT}themes/thinklead/images/favicon.png`,
          avatar: `${CDN_ROOT}themes/thinklead/images/avatar.png`,
        },
        content: {
          appTitle: 'TowerStone Leadership Centre',
          login: {
            message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.',
          },
        },
      }
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
        email: 'werner.weber+twredirect@gmail.com',
        enabled: true,
      },
    },
    {
      name: 'email_redirect/PRODUCTION',
      data: {
        email: 'werner.weber+twredirect@gmail.com',
        enabled: true,
      },
    },
  ],
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'LOCAL',
      enabled: true,
    },
    {
      provider: 'FACEBOOK',
      enabled: false,
    },
    {
      provider: 'GOOGLE',
      enabled: false,
    },
    {
      provider: 'microsoft',
      enabled: true,
      /**
        OAUTH_APP_ID=ac149de8-0529-48ac-9b4d-a950a73dfbab
        OAUTH_APP_PASSWORD=<OAUTH PASSWORD>
        OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
        OAUTH_SCOPES='profile offline_access user.read calendars.read'
        OAUTH_AUTHORITY=https://login.microsoftonline.com/common
        OAUTH_ID_METADATA=/v2.0/.well-known/openid-configuration
        OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
        OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token
       */
      options: {
        identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        clientID: 'ac149de8-0529-48ac-9b4d-a950a73dfbab',
        responseType: 'code id_token',
        responseMode: 'form_post',
        redirectUrl: `${API_URI_ROOT}/auth/microsoft/done`,
        allowHttpForRedirectUrl: true,
        clientSecret: '<OAUTH PASSWORD>',
        validateIssuer: false,
        passReqToCallback: false,
        scope: 'profile offline_access user.read calendars.read calendars.write'.split(' '),
      },
    },
  ],
  whitelist: [
    'localhost',
    'thinklead.reactory.net',
    'public.thinklead.app',
  ],
};

