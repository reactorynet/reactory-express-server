import { profileSmall } from '../helpers/menus';

import systemRoutes from '../helpers/defaultRoutes';


const { CDN_ROOT, MODE } = process.env;
const key = 'commerce';
export default {
  key,
  name: 'Reactory Commerce',
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
          ordinal: 0, title: 'Home', link: '/', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 1, title: 'Edit Site', link: '/editor', icon: 'create', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Products', link: '/products', icon: 'shop', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 3, title: 'Orders', link: '/orders', icon: 'share', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 4, title: 'Shipping', link: '/shipping', icon: 'local_shipping', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 12, title: 'Customers', link: '/customers', icon: 'supervisor_account', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 13, title: 'Marketing', link: '/marketing', icon: 'speaker', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 14, title: 'Analytics', link: '/analytics', icon: 'bar_chart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 15, title: 'Domain', link: '/domain', icon: 'public', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 15, title: 'Settings', link: '/domain', icon: 'settings', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 15, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER', 'ADMIN'],
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
      primary1Color: '#6D7381',
      primary: {
        light: '#F4F5FA',
        main: '#6D7381',
        dark: '#899BF6',
        contrastText: '#F4F5FA',
      },
      secondary: {
        light: '#F4F5FA',
        main: '#6D7381',
        dark: '#899BF6',
        contrastText: '#F4F5FA',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      logo: `${CDN_ROOT}/themes/${key}/images/logo.png`,
      favicon: `${CDN_ROOT}/themes/${key}/images/favicon.png`,
    },
    content: {
      appTitle: 'BoxCommerce',
      login: {
        message: 'BoxCommerce',
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

