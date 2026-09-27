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
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';




const { 
  REACTORY_SITE_URL = 'http://localhost:3000',
  REACTORY_APPLICATION_USERNAME = 'reactory', 
  REACTORY_APPLICATION_EMAIL = 'machine@reactory.net',
  REACTORY_APPLICATION_PASSWORD,
  // Browser-facing public key (WP-A4). Non-secret, origin-bound. Must be a
  // different value from REACTORY_APPLICATION_PASSWORD.
  REACTORY_CLIENT_PUBLIC_KEY = 'reactory-local-public-key',
} = process.env as unknown as Reactory.Server.ExtendedEnvironment<[Reactory.Server.ReactoryDefaultClientEnvironment]>;

// Validate required environment variables
if (!REACTORY_APPLICATION_PASSWORD) {
  logger.error('REACTORY_APPLICATION_PASSWORD environment variable is required but not set. Startup cannot continue.');
  process.exit(1);
}

const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
  key: 'reactory',
  name: 'Reactory Management Client',
  username: REACTORY_APPLICATION_USERNAME,
  email: REACTORY_APPLICATION_EMAIL,
  salt: 'generate',
  password: REACTORY_APPLICATION_PASSWORD,
  publicKey: REACTORY_CLIENT_PUBLIC_KEY,
  browserAuth: 'origin',
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
      feature: "reactor.EnableReactor3DAvatar@1.0.0",
      group: "default",
      value: false,
      roles: ['USER', 'ANON'],
    },
    {
      // Forms-engine v5 adapter. Rolled out to the developer/admin pilot
      // group first via `roles` below. `enabled` must be explicitly true:
      // the embedded ReactoryFeatureFlagValue schema defaults it to false,
      // and the client hook resolves `enabled !== false && value === true`
      // — so a `value: true` with no `enabled` silently resolves to OFF.
      //
      // Per-form pin (`formDef.options.engine`) still wins over this flag.
      // See reactory-pwa-client/src/components/reactory/docs/forms-engine
      // for the full migration plan.
      feature: 'core.FormsEngineV5@1.0.0',
      enabled: true,
      value: true,
      roles: ['ADMIN', 'DEVELOPER'],
    }
  ]
};

export default REACTORY_CONFIG;