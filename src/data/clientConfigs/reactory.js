import * as dotenv from 'dotenv';
import { profileSmall } from '../menus';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;

export default {
  key: 'reactory',
  name: 'Reactory Admin Application',
  username: 'reactory',
  email: 'machine@reactory.net',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  components: [
    {
      nameSpace: 'reactory',
      name: 'Dashboard',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'machine@reactory.net',
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
      author: 'machine@reactory.net',
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
          ordinal: 1, title: 'Inbox', link: '/inbox', icon: 'email', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 1, title: 'My Applications', link: '/applications', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Reactory Clients', link: '/reactory-clients/', icon: 'check_circle', roles: ['ADMIN'],
        },
        {
          ordinal: 3, title: 'About Us', link: '/about-us/', icon: 'supervised_user_circle', roles: ['ANON', 'USER'],
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
      key: 'clients',
      title: 'My Applications',
      path: '/applications/*',
      public: false,
      exact: true,
      roles: ['ADMIN'],
      componentFqn: 'reactory.Applications@1.0.0',
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
      key: 'about-us',
      title: 'About Us',
      path: '/about-us',
      public: false,
      roles: ['USER', 'ANON'],
      componentFqn: 'static.AboutUs@1.0.0',

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
    typography: {
      useNextVariants: true,
    },
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
      avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
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

