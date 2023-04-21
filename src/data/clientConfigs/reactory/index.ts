import { profileSmall } from '../helpers/menus';

import themes from './themes';
import settings from './settings/settings';
import routes from './routes';
import users from './authentication/users';
import roles from './authentication/roles';
import menus from './menus';
import whitelist from './whitelist';

import Reactory from '@reactory/reactory-core'



const { 
  CDN_ROOT,
  REACTORY_SITE_URL,
  REACTORY_APPLICATION_USERNAME = 'reactory', 
  REACTORY_APPLICATION_EMAIL = 'machine@reactory.net',
  REACTORY_APPLICATION_PASSWORD
} = process.env as unknown as Reactory.Server.ExtendedEnvironment<[Reactory.Server.ReactoryDefaultClientEnvironment]>;




const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
  key: 'reactory',
  name: 'reactory:reactory.application.title',
  username: REACTORY_APPLICATION_USERNAME,
  email: REACTORY_APPLICATION_EMAIL,
  salt: 'generate',
  password: REACTORY_APPLICATION_PASSWORD,
  siteUrl: REACTORY_SITE_URL || 'https://localhost:3000', 
  emailSendVia: process.env.REACTORY_EMAIL_SEND_VIA || 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/forgot-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
  applicationRoles: roles,
  users,
  billingType: 'free',
  components: [],
  menus,
  routes,
  theme: 'reactory',  
  themes,
  plugins: [
    {
      name: 'reactory-client-core',
      description: 'Reactory Client Core Plugin. Contains the core components and services for the Reactory Client.',
      version: '1.0.0',
      id: 'reactory-client-core',
      enabled: true,
      nameSpace: 'core',
      roles: ['USER'],
      platform: 'web',
      mimeType: 'application/javascript',
      url: `${CDN_ROOT}/plugins/reactory-client-core/lib/reactory-client-core.js`,
      loader: 'script',
    }
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
  settings,
  whitelist,
};

export default REACTORY_CONFIG;