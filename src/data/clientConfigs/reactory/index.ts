import { profileSmall } from '../helpers/menus';

import themes from './themes';
import settings from './settings/settings';
import routes from './routes';
import users from './authentication/users';
import roles from './authentication/roles';
import menus from './menus';
import whitelist from './whitelist';

import Reactory from '@reactorynet/reactory-core'
import logger from '@reactory/server-core/logging';
import { safeCDNUrl } from 'utils/url/safeUrl';




const { 
  REACTORY_SITE_URL = 'http://localhost:3000',
  REACTORY_APPLICATION_USERNAME = 'reactory', 
  REACTORY_APPLICATION_EMAIL = 'machine@reactory.net',
  REACTORY_APPLICATION_PASSWORD,
} = process.env as unknown as Reactory.Server.ExtendedEnvironment<[Reactory.Server.ReactoryDefaultClientEnvironment]>;

// Validate required environment variables
if (!REACTORY_APPLICATION_PASSWORD) {
  logger.error('REACTORY_APPLICATION_PASSWORD environment variable is required but not set. Startup cannot continue.');
  process.exit(1);
}

const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
  key: 'reactory',
  name: 'reactory:reactory.application.title',
  username: REACTORY_APPLICATION_USERNAME,
  email: REACTORY_APPLICATION_EMAIL,
  salt: 'generate',
  password: REACTORY_APPLICATION_PASSWORD,
  siteUrl: REACTORY_SITE_URL || 'http://localhost:3000', 
  emailSendVia: process.env.REACTORY_EMAIL_SEND_VIA || 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY as string,
  resetEmailRoute: '/forgot-password',
  avatar: safeCDNUrl('themes/reactory/images/avatar.png'),
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
      id: 'reactory-client-core',
      nameSpace: 'core',
      name: 'reactory-client-core',
      description: 'Reactory Client Core Plugin. Contains the core components and services for the Reactory Client.',
      version: '1.0.0',
      enabled: true,
      roles: ['USER', 'ANON'],
      platform: 'web',
      mimeType: 'application/javascript',
      uri: safeCDNUrl('plugins/reactory-client-core/lib/reactory.client.core.js')      
    }
  ],
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'LOCAL',
      enabled: true,
      options: {},
    },
    {
      provider: 'FACEBOOK',
      enabled: false,
      options: {},
    },
    {
      provider: 'GOOGLE',
      enabled: false,
      options: {},
    },
  ],
  settings,
  whitelist,
  featureFlags: [
    {
      feature: 'core.WorkflowEditorBetaUI@1.0.0',
      value: true,
      roles: ['ADMIN', 'DEVELOPER'],
    },
    {
      feature: 'core.WorkflowAdvancedFeatures@1.0.0',
      value: true,
      roles: ['ADMIN', 'DEVELOPER'],      
    },
    {
      feature: 'core.WorkflowCollaboration@1.0.0',
      value: false,
      roles: ['ADMIN'],
    },
    {
      feature: 'core.WorkflowTemplatesBeta@1.0.0',
      value: true,
      roles: ['USER', 'ADMIN', 'DEVELOPER'],
    },
    {
      feature: 'core.WorkflowValidationExperimental@1.0.0',
      value: false,
      roles: ['ADMIN', 'DEVELOPER'],
    },
    {
      feature: 'core.WorkflowAIAssistance@1.0.0',
      value: false,
      roles: ['ADMIN'],
    }
  ]
};

export default REACTORY_CONFIG;