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




const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
  key: 'reactory',
  name: 'reactory:reactory.application.title',
  username: REACTORY_APPLICATION_USERNAME,
  email: REACTORY_APPLICATION_EMAIL,
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD,
  siteUrl: process.env.REACTORY_SITE_URL || 'https://localhost:3000', 
  emailSendVia: process.env.REACTORY_EMAIL_SEND_VIA || 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
  applicationRoles: roles,
  users,
  billingType: 'free',
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

export default REACTORY_CONFIG;