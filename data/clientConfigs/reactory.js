import dotenv from 'dotenv';
import {
  profileSmall,
} from '../menus';

import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;

export default {
  key: 'reactory',
  name: 'Reactory Admin Application',
  username: 'reactory',
  email: 'developer@reactory.net',
  salt: 'generate',
  password: 'XXXXXXXXXXXXX',
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.jpg`,
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
          ordinal: 2, title: 'Reactory Clients', link: '/surveys', icon: 'check_circle', roles: ['USER'],
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
      roles: ['SYS-ADMIN'],
      componentFqn: 'reactory.Dashboard@1.0.0',
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox',
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },
    {
      key: 'clients',
      title: 'Reactory Clients',
      path: '/reactory-clients',
      public: false,
      roles: ['SYS-ADMIN'],
      componentFqn: 'reactory.Clients@1.0.0',
    },
    {
      key: 'reports',
      title: 'Reports',
      path: '/reports',
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Report@1.0.0',
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
  themeOptions: {
    type: 'material',
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
      featureImage: `${CDN_ROOT}/themes/reactory/images/phoenix.png`,
      logo: `${CDN_ROOT}/themes/reactory/images/logo.png`,
      favicon: `${CDN_ROOT}/themes/reactory/images/favicon.png`,
    },
    content: {
      appTitle: 'Reactory - Build Apps. Fast.',
      login: {
        message: 'Building Apps. Just. Like. That.',
      },
    },
  },
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
  whitelist: [
    'localhost',
    'app.reactory.net',
    'reactory-app.ngrok.io',
  ],
};

