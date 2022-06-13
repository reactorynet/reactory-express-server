import { profileSmall } from '../helpers/menus';

import themes from './themes';
import settings from './settings/settings';
import routes from './routes';
import users from './authentication/users';
import roles from './authentication/roles';
import menus from './menus';

import Reactory from '@reactory/reactory-core'

const { 
  CDN_ROOT,
  MODE, 
  NODE_ENV, 
  REACTORY_APPLICATION_USERNAME = 'reactory', 
  REACTORY_APPLICATION_EMAIL = 'machine@reactory.net'
} = process.env;

const staticContentMappings = [
  {
    key: 'about',
    title: 'About Reactory',
    path: '/about/*',
    public: true,
    exact: true,
    roles: ['USER', 'ANON'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'about',
        }
      }
    ]
  },
  {
    key: 'whats-new',
    title: 'What\'s new',
    path: '/whats-new/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'whats-new',
        }
      }
    ]
  },
  {
    key: 'how-to',
    title: 'How to',
    path: '/news/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'news',
        }
      }
    ]
  },
];


const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
  key: 'reactory',
  name: 'Reactory Admin Application',
  username: REACTORY_APPLICATION_USERNAME,
  email: REACTORY_APPLICATION_EMAIL,
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
  applicationRoles: roles,
  users,
  billingType: 'partner',
  components: [],
  menus,
  routes,
  theme: 'reactory',  
  themes,
  plugins: [],
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
  settings  
};


staticContentMappings.forEach((mapping) => {
  REACTORY_CONFIG.routes.push({
    ...mapping,
    componentFqn: 'core.StaticContent@1.0.0'
  });
});

export default REACTORY_CONFIG;