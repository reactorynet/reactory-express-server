import dotenv from 'dotenv';
import { profileSmall } from '../menus';

import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;
const key = 'boxcommerce';
export default {
  key,
  name: 'Box Commerce',
  username: 'boxcommerce',
  email: 'developer@reactory.net',
  salt: 'generate',
  password: 'XXXXXXXXXXXXX',
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : `https://${key}.reactory.net/`,
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  mode: MODE,
  users: [
    {
      email: 'werner.weber@gmail.com', roles: ['ADMIN', 'USER'], firstName: 'Werner', lastName: 'Weber',
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
          ordinal: 1, title: 'Website', link: '/editor', icon: 'create', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Shop', link: '/shop', icon: 'shopping_cart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 3, title: 'Marketing', link: '/marketing', icon: 'phone_in_talk', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 4, title: 'Analytics', link: '/analytics', icon: 'multiline_chart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 12, title: 'Inbox', link: '/inbox', icon: 'email', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 13, title: 'Profile', link: '/profile', icon: 'account_circle', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 13, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER', 'ADMIN'],
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
      key: 'editor-home',
      title: 'Editor',
      path: '/editor/',
      public: false,
      exact: true,
      roles: ['ADMIN'],
      componentFqn: `${key}.PageEditorHome@1.0.0`,
      args: {
        key: 'integration',
        value: {
          type: 'string',
          integration: 'boxcommerce',
        },
      },
    },
    {
      key: 'editor',
      title: 'Editor',
      path: '/editor/:pageId',
      public: false,
      exact: true,
      roles: ['ADMIN'],
      componentFqn: `${key}.PageEditorHome@1.0.0`,
      args: {
        key: 'integration',
        value: {
          type: 'string',
          integration: 'boxcommerce',
        },
      },
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
  ],
  theme: 'boxcommerce',
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#5F12C2',
      primary: {
        light: '#E87BD6',
        main: '#5F12C2',
        dark: '#890EC1',
        contrastText: '#ffffff',
      },
      secondary: {
        light: '#4BC4B5',
        main: '#2565BF',
        dark: '#1182AC',
        contrastText: '#ffffff',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      logo: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      favicon: `${CDN_ROOT}/themes/${key}/images/favicon.png`,
    },
    content: {
      appTitle: 'BoxCommerce - Editor',
      login: {
        message: 'BoxCommerce - Editor',
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
    {
      provider: 'BOXCOMMERCE',
      enable: true,
    },
  ],
  settings: [

  ],
  whitelist: [
    'localhost',
    `${key}.reactory.net`,
  ],
};

