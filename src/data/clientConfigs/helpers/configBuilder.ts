
import Reactory from '@reactory/reactory-core';
import {
  profileSmall,
} from './menus';

// TODO: Werner - upgrade config builder for V1.


const { CDN_ROOT, MODE } = process.env;

let siteUrl = '';// 'http://localhost:3000' : 'https://app.towerstone-global.com/';


const getSiteUrl = (key: string) => {
  switch (MODE) {
    case 'QA': {
      siteUrl = `https://${key}-app.reactory.net`;
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
};


function makeid(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const baseConfig: any = {
  name: 'My New Application',
  salt: 'generate',
  password: makeid(20),
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',

  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  components: [
    {
      nameSpace: 'reactory',
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
      nameSpace: 'reactory',
      name: 'Clients',
      version: '1.0.0',
      title: 'Clients',
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
          ordinal: 1, title: 'Inbox', link: '/inbox', icon: 'email', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Reactory Clients', link: '/reactory-clients/', icon: 'check_circle', roles: ['USER'],
        },
      ],
    },
  ],
  routes: [
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['SYS-ADMIN'],
      componentFqn: 'reactory.Dashboard@1.0.0',
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },
    {
      key: 'clients',
      title: 'Reactory Clients',
      path: '/reactory-clients/*',
      public: false,
      exact: true,
      roles: ['SYS-ADMIN'],
      componentFqn: 'reactory.Clients@1.0.0',
    },
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks',
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Task@1.0.0',
    },
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile',
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin',
      public: false,
      roles: ['ADMIN'],
      componentFqn: 'core.Administration@1.0.0',
    },
  ],
  theme: 'reactory',
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
  ],
  whitelist: [
    'localhost',
    'app.reactory.net',
    'reactory.net',
  ],
};


/**
 * Returns a basic config setup
 * @param {*} key
 * @param {*} props
 */
const makeConfig = (key: string, props: any) => ({
  key,
  ...baseConfig,
  siteUrl: getSiteUrl(key),
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.jpg`,
  themeOptions: {
    type: 'material', // material || bootstrap
    palette: {
      primary1Color: '#424242',
      primary: {
        light: '#6d6d6d',
        main: '#424242',
        dark: '#1b1b1b',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#ff9e40',
        main: '#ff6d00',
        dark: '#c43c00',
        contrastText: '#fff',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}/themes/${key}/images/feature.png`,
      logo: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      favicon: `${CDN_ROOT}/themes/${key}/images/favicon.png`,
    },
    content: {
      appTitle: 'My App Title',
      login: {
        message: 'Built With Reactory',
      },
    },
  },
  ...props,
});

export default makeConfig;
