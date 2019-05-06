import dotenv from 'dotenv';
import {
  profileSmall,
} from '../menus';

import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;

let siteUrl = '';// 'http://localhost:3000' : 'https://app.towerstone-global.com/';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://lasec-crm.reactory.net';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://crm.lasec360.com';
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
  password: 'XXXXXXXXXXXXX',
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
        {
          ordinal: 1, title: 'Marketing', link: '/marketing', icon: 'speaker', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Customers', link: '/customers', icon: 'supervisor_account', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 3, title: 'Orders', link: '/orders', icon: 'share', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 4, title: 'Shipping', link: '/shipping', icon: 'local_shipping', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 5, title: 'Analytics', link: '/analytics', icon: 'bar_chart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 6, title: 'Settings', link: '/domain', icon: 'settings', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 7, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 8, title: 'Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
        },
      ],
    },
  ],
  routes: [
    ...systemRoutes,
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
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withPeers: false,
      },
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
      primary1Color: '#f05a37',
      primary: {
        light: '#ff8c63',
        main: '#f05a37',
        dark: '#b6250b',
        contrastText: '##fffebc',
      },
      secondary: {
        light: '#89ee8e',
        main: '#56bb5f',
        dark: '#1b8a32',
        contrastText: '#000000',
      },
      report: {
        empty: '#89ee8e',
        fill: '#ff8c63',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      emailLogo: `${CDN_ROOT}themes/${key}/images/logo_small.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
    },
    content: {
      appTitle: 'Lasec CRM',
      login: {
        message: `${key}@lasec powered by reactory.net`,
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
  ],
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'LOCAL',
      enabled: true,
    },
    {
      provider: 'LASEC',
      enabled: true,
      options: {
        url: 'http://endpointforauth/login',
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
