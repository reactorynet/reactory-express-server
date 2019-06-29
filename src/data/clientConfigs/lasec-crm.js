import * as dotenv from 'dotenv';
import {
  profileSmall,
} from '../menus';

import { loginroute, logoutroute, resetpasswordroute, forgotpasswordroute, notfoundroute } from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE, API_URI_ROOT } = process.env;

let siteUrl = '';// 'http://localhost:3000' : 'https://app.towerstone-global.com/';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://lasec-crm.reactory.net';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://lasec-crm.reactory.net';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}

const key = 'lasec-crm';

export default {
  key,
  name: 'Lasec 360 CRM',
  username: 'lasec',
  email: 'werner.weber+lasec-crm-admin@gmail.com',
  salt: 'generate',
  password: 'i5xJOVXIeZHB1NnAkh6fffHkJcV7HJDI',
  siteUrl,
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  organization: [
    {
      name: 'Lasec (Pty) Ltd.', key: 'lasec',
    },
  ],
  users: [
    {
      email: 'werner.weber@gmail.com', firstName: 'Werner', lastName: 'Weber', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'grahambr@awards.co.za', firstName: 'Graham', lastName: 'Bradford', roles: ['USER', 'ADMIN'],
    },
    {
      email: 'kelly.cupido@lasec.com', firstName: 'Kelly', lastName: 'Cupido', roles: ['USER', 'ADMIN'],
    },

  ],
  components: [
    {
      nameSpace: key,
      name: 'Dashboard',
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
          ordinal: 0, title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        /*
        {
          ordinal: 1, title: 'Marketing', link: '/marketing', icon: 'speaker', roles: ['USER', 'ADMIN'],
        },

        {
          ordinal: 2, title: 'Customers', link: '/360/crm/customer-search', icon: 'supervisor_account', roles: ['USER', 'ADMIN'],
        },
        */
        {
          ordinal: 3, title: 'Lasec 360', link: '/360', icon: 'share', roles: ['USER', 'ADMIN'],
        },
        /*
        {
          ordinal: 4, title: 'Shipping', link: '/shipping', icon: 'local_shipping', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 5, title: 'Analytics', link: '/analytics', icon: 'bar_chart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 6, title: 'Settings', link: '/settings', icon: 'settings', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 7, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER'],
        },
        */
        {
          ordinal: 9, title: 'Email', link: '/mail/', icon: 'mail', roles: ['USER'],
        },
        {
          ordinal: 10, title: 'Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
        },
      ],
    },
  ],
  routes: [
    {
      ...loginroute,
      background: {
        image: 'default',
      },
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
              'microsoft',
            ],
          },
        },
      ],
    },
    logoutroute,
    forgotpasswordroute,
    resetpasswordroute,
    logoutroute,
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: `${key}.Dashboard@1.0.0`,
    },
    {
      key: 'lasec-360',
      title: 'Lasec 360',
      path: '/360',
      public: false,
      exact: false,
      roles: ['USER'],
      // componentFqn: `${key}.Quotes@1.0.0`,
      componentFqn: 'core.FramedWindow@1.0.0',
      args: [
        {
          key: 'proxyRoot',
          value: {
            type: 'string',
            proxyRoot: `$ref://settings/lasec_360_root/${MODE}`,
          },
        },
        {
          key: 'frameProps',
          value: {
            type: 'object',
            frameProps: {
              url: MODE === 'PRODUCTION' ? 'https://lasec360.reactory.net/' : 'http://localhost:3001/',
              height: '100%',
              width: '100%',
              styles: {
                border: 'none',
                height: '100%',
                width: '100%',
              },
            },
          },
        },
        {
          key: 'messageHandlers',
          value: {
            type: 'array',
            messageHandlers: [{
              name: 'lasechandlers',
              id: 'lasec360messagehandlers',
              type: 'script',
              uri: `${CDN_ROOT}plugins/core.framedwindow.messagehandlers/lasec360/lib/lasec360.handler.js`,
              component: 'lasec-crm.360MessageBroker@1.0.0',
            }],
          },
        },
      ],
    },    
    {
      key: 'ProxiedWindow',
      title: '360 Proxied',
      path: '/360/crm/customer-search',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.FramedWindow@1.0.0',
      args: [
        {
          key: 'proxyRoot',
          value: {
            type: 'string',
            proxyRoot: `$ref://settings/lasec_360_root/${MODE}`,
          },
        },
        {
          key: 'frameProps',
          value: {
            type: 'object',
            frameProps: {
              url: 'http://localhost:3001/crm/customer-search',
              height: '100%',
              width: '100%',
              styles: {
                border: 'none',
                height: '100%',
                width: '100%',
              },
            },
          },
        },
      ],
    },
    {
      key: 'quote-detail',
      title: 'Quote Detail',
      path: '/quote/**details',
      public: false,
      exact: false,
      roles: ['USER'],
      componentFqn: `${key}.QuoteDetail@1.0.0`,
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/mail/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
      args: [
        {
          key: 'via',
          value: {
            type: 'string',
            via: 'microsoft',
          },
        },
      ],
    },
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withPeers: false,
      },
      args: [
        {
          key: 'withPeers',
          value: {
            type: 'boolean',
            withPeers: false,
          },
        },
      ],
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin/**',
      exact: true,
      public: false,
      roles: ['ADMIN'],
      componentFqn: `${key}.Administration@1.0.0`,
    },
  ],
  theme: key,
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#369907',
      primary: {
        light: '#6dcb43',
        main: '#6EB84A',
        dark: '#006a00',
        contrastText: '#000000',
      },
      secondary: {
        light: '#62b4b8',
        main: '#2d8488',
        dark: '#00575b',
        contrastText: '#000000',
      },
      report: {
        empty: '#89ee8e',
        fill: '#ff8c63',
      },
    },
    provider: {
      material: {
        typography: {
          useNextVariants: true,
        },
        type: 'material',
        palette: {
          primary1Color: '#369907',
          primary: {
            light: '#6dcb43',
            main: '#6EB84A',
            dark: '#006a00',
            contrastText: '#000000',
          },
          secondary: {
            light: '#62b4b8',
            main: '#2d8488',
            dark: '#00575b',
            contrastText: '#000000',
          },
          report: {
            empty: '#89ee8e',
            fill: '#ff8c63',
          },
        },
      },
      bootstrap: {

      },
      blueprint: {

      },
      mockly: {

      },
    },
    core: {
      images: [
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1280x1024.jpg`,
          aspect: '16:9', // 16:9
          orientation: 'landscape',
          size: {
            width: 1280,
            height: 1024,
          },
        },
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1024x1280.jpg`,
          aspect: '9:16', // 16:9
          orientation: 'portrait',
          size: {
            width: 1024,
            height: 1280,
          },
        },
      ],
      background: {
        color: '',
        image: '',
        alpha: 0.4,
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      emailLogo: `${CDN_ROOT}themes/${key}/images/logo_small.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
      icons: {
        Icon512: `${CDN_ROOT}themes/${key}/images/icons-512.png`,
        Icon192: `${CDN_ROOT}themes/${key}/images/icons-192.png`,
        Icon144: `${CDN_ROOT}themes/${key}/images/icons-144.png`,
      },
    },
    content: {
      appTitle: 'Lasec CRM',
      login: {
        message: `${key} powered by reactory.net`,
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
        email: 'werner.weber+lasecredirect@gmail.com',
        enabled: true,
      },
    },
    {
      name: 'lasec_360_root/DEVELOP',
      data: {
        url: 'http://localhost:3001/',
      },
    },
    {
      name: 'lasec_360_root/PRODUCTION',
      data: {
        url: 'https://lasec360.reactory.net/',
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
        scope: 'profile offline_access user.read calendars.read'.split(' '),
      },
    },
    {
      provider: 'FACEBOOK',
      enabled: false,
    },
    {
      provider: 'GOOGLE',
      enabled: false,
    },
  ],
  whitelist: [
    'localhost',
    '360crm.reactory.net',
    '360crm.lasec.co.za',
  ],
};

