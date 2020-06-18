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

let siteUrl = '';// 'http://localhost:3000' : 'https://app.towerstone-global.com/';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://towerstone.reactory.net';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://app.towerstone-global.com';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}


export default {
  key: 'towerstone',
  name: 'TowerStone Leadership Centre',
  username: 'towerstone',
  email: 'assessments@towerstone-global.com',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD_TOWERSTONE,
  siteUrl,
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/towerstone/images/avatar.png`,
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
    {
      email: 'mandy.eagar@towerstone-global.com', firstName: 'Mandy', lastName: 'Eagar', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'thea.shaw@towerstone-global.com', firstName: 'Thea', lastName: 'Shaw', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'yolande.wheatley@towerstone-global.com', firstName: 'Yolande', lastName: 'Wheatley', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'lynne.kleu@towerstone-global.com', firstName: 'Lynne', lastName: 'Kleu', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'michelle.burger@towerstone-global.com', firstName: 'Michelle', lastName: 'Burger', roles: ['USER', 'ADMIN'],
    },
  ],
  components: [
    {
      nameSpace: 'towerstone',
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
      nameSpace: 'towerstone',
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
      nameSpace: 'towerstone',
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
    towerStoneMenuDef,
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
      componentFqn: 'towerstone.Dashboard@1.0.0',
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
      key: 'surveys',
      title: 'Surveys',
      path: '/surveys/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Surveys@1.0.0',
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
      title: 'Surveys',
      path: '/assess/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Assessment@1.0.0',
    },
    {
      key: 'reports',
      title: 'Reports',
      path: '/reports/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Report@1.0.0',
    }, /*
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Task@1.0.0',
      args: {
        key: 'lanes',
        value: [
          {
            status: 'new', title: 'New', icon: 'star_border', color: 'inherit',
          },
          {
            status: 'in-progress', title: 'In Progress', icon: 'star_half', color: 'inherit',
          },
          {
            status: 'completed', title: 'Completed', icon: 'star', color: 'inherit',
          },
          {
            status: 'overdue', title: 'Overdue', icon: 'excalmation', color: 'inherit',
          },
        ],
      },
    }, */
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
  theme: 'towerstone',
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#990033',
      primary: {
        light: '#cf445c',
        main: '#990033',
        dark: '#64000d',
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
      featureImage: `${CDN_ROOT}themes/towerstone/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/towerstone/images/logo.png`,
      // emailLogo: `${CDN_ROOT}themes/towerstone/images/logo_small.png`,
      emailLogo: 'http://www.towerstone-global.com/cms/wp-content/uploads/2017/07/TowerStone-New-Logo-01_new.png',
      favicon: `${CDN_ROOT}themes/towerstone/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/towerstone/images/avatar.png`,
    },
    content: {
      appTitle: 'TowerStone Leadership Centre',
      login: {
        message: 'Empowering Leaders To Discover Fulfillment In Their Workplace. That is our Prupose.',
      },
    },
  },
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
        enabled: false,
      },
    },
    {
      name: 'email_redirect/PRODUCTION',
      data: {
        email: 'werner.weber+twredirect@gmail.com',
        enabled: false,
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
    'towerstone.reactory.net',
    'leadership.towerstone-global.com',
  ],
};

