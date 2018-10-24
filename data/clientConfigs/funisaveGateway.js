import dotenv from 'dotenv';
import {
  profileSmall,
} from '../menus';

import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;
const key = 'funisave-gw';
export default {
  key,
  name: 'Funisave Payment Gateway',
  username: 'reactory',
  email: 'developer@reactory.net',
  salt: 'generate',
  password: 'XXXXXXXXXXXXX',
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.jpg`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  mode: MODE,
  components: [
    {
      nameSpace: key,
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
          ordinal: 1, title: 'Local Dashboard', link: '/dashboard/local', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Staging Dashboard', link: '/dashboard/staging', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 3, title: 'Inbox', link: '/inbox', icon: 'email', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 4, title: 'Profile', link: '/profile', icon: 'account_circle', roles: ['USER', 'ADMIN'],
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
      roles: ['ADMIN'],
      componentFqn: `${key}.Dashboard@1.0.0`,
    },
    {
      key: 'dashboard',
      title: 'Dashboard',
      path: '/dashboard/:target',
      public: false,
      exact: true,
      roles: ['ADMIN'],
      componentFqn: `${key}.Dashboard@1.0.0`,
    },
    {
      key: 'reports',
      title: 'Reports',
      path: '/reports',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.Report@1.0.0`,
    },
    {
      key: 'schedule',
      title: 'Payment Schedule',
      path: '/schedule',
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.PaymentSchedule@1.0.0`,
    },
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile',
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      args: [
        {
          key: 'withPeers',
          value: {
            type: 'bool',
            withPeers: false,
          },
        },
      ],
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin',
      public: false,
      roles: ['ADMIN'],
      componentFqn: `${key}.Administration@1.0.0`,
    },
  ],
  theme: 'funisave',
  themeOptions: {
    type: 'material',
    palette: {
      primary1Color: '#00695c',
      primary: {
        light: '#439889',
        main: '#00695c',
        dark: '#003d33',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#99d066',
        main: '#689f38',
        dark: '#387002',
        contrastText: '#fff',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}/themes/${key}/images/payments.jpg`,
      logo: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      favicon: `${CDN_ROOT}/themes/${key}/images/favicon.png`,
    },
    content: {
      appTitle: 'FuniSave - Payment Gateway Admin.',
      login: {
        message: 'Payments Admin',
      },
    },
  },
  defaultUsers: [
    {
      email: 'werner.weber@gmail.com', roles: ['ADMIN', 'USER'], firstName: 'Werner', lastName: 'Weber',
    },
    // { email: 'fred.otten@funisave.com', roles: ['ADMIN', 'USER'], firstName: 'Fred', lastName: 'Otten' },
    // { email: 'guy.platt@gmail.com', roles: ['ADMIN', 'USER'], firstName: 'Guy', lastName: 'Platt' },
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
  ],
  settings: [
    {
      name: 'graphapi-uri@develop',
      value: 'https://api-test.r4.life/',
    },
    {
      name: 'graphapi-key@develop',
      value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1YTY3M2VjYWI1Y2RjNDAwNzRkOWNhNWEiLCJ1dWlkIjoiNGI2ZGExM2YtMjc0Mi00MDczLTk3NjQtOThjYzVlNDI4MjY2Iiwicm9sZXMiOlsiTUFOQUdFUiJdfQ.rnHghjEzI1GqAWsFBXSUKLGcTDMyCcuYHKKa0VgzkOA',
    },
    {
      name: 'gateway@develop',
      value: 'http://localhost:3001/',
    },
    {
      name: 'graphapi-uri@qa',
      value: 'https://api-test.r4.life/',
    },
    {
      name: 'graphapi-key@qa',
      value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1YTY3M2VjYWI1Y2RjNDAwNzRkOWNhNWEiLCJ1dWlkIjoiNGI2ZGExM2YtMjc0Mi00MDczLTk3NjQtOThjYzVlNDI4MjY2Iiwicm9sZXMiOlsiTUFOQUdFUiJdfQ.rnHghjEzI1GqAWsFBXSUKLGcTDMyCcuYHKKa0VgzkOA',
    },
    {
      name: 'gateway@qa',
      value: 'https://payments.r4.life/',
    },
    {
      name: 'graphapi-uri@prod',
      value: 'https://api.r4.life/',
    },
    {
      name: 'graphapi-key@prod',
      value: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiI1YTY3M2VjYWI1Y2RjNDAwNzRkOWNhNWEiLCJ1dWlkIjoiNGI2ZGExM2YtMjc0Mi00MDczLTk3NjQtOThjYzVlNDI4MjY2Iiwicm9sZXMiOlsiTUFOQUdFUiJdfQ.rnHghjEzI1GqAWsFBXSUKLGcTDMyCcuYHKKa0VgzkOA',
    },

    {
      name: 'gateway@prod',
      value: 'https://payments.r4.life/',
    },
  ],
  whitelist: [
    'localhost',
    'qa-app.reactory.net',
    'reactory-app.ngrok.io',
  ],
};

