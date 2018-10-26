import dotenv from 'dotenv';
import {
  profileSmall,
  towerStoneMenuDef,
} from '../menus';

import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;

export default {
  key: 'towerstone',
  name: 'TowerStone Leadership Centre',
  username: 'towerstone',
  email: 'developer@towerstone-global.com',
  salt: 'generate',
  password: 'XXXXXXXXXXXXX',
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.towerstone-global.com/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/towerstone/images/avatar.jpg`,
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
      email: 'mady.eagar@towerstone-global.com', firstName: 'Mandy', lastName: 'Eagar', roles: ['USER', 'ADMIN'],
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
    ...systemRoutes,
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Dashboard@1.0.0',
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },
    {
      key: 'surveys',
      title: 'Surveys',
      path: '/surveys',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Surveys@1.0.0',
    },
    {
      key: 'reports',
      title: 'Reports',
      path: '/reports',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Report@1.0.0',
    },
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Task@1.0.0',
    },
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withProps: true,
      },
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin',
      exact: false,
      public: false,
      roles: ['ADMIN'],
      componentFqn: 'core.Administration@1.0.0',
    },
  ],
  theme: 'towerstone',
  themeOptions: {
    type: 'material',
    palette: {
      primary1Color: '#990033',
      primary: {
        light: '#cf445c',
        main: '#990033',
        dark: '#64000d',
        contrastText: '#fff',
      },
      secondary: {
        light: '#e04d43',
        main: '#a8111b',
        dark: '#720000',
        contrastText: '#fff',
      },
      report: {
        empty: '#F7BFBA',
        fill: '#990033',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/towerstone/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/towerstone/images/logo.png`,
      favicon: `${CDN_ROOT}themes/towerstone/images/favicon.png`,
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
  whitelist: [
    'localhost',
    'towerstone.reactory.net',
    'leadership.towerstone-global.com',
  ],
};

