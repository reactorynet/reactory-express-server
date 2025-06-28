import Reactory from "@reactory/reactory-core";
import yaml from 'js-yaml';
import fs from 'fs';
import logger from '@reactory/server-core/logging';

const { 
  REACTORY_APPLICATION_EMAIL = 'reactory@reactory.local', 
  REACTORY_APPLICATION_PASSWORD = 'reactory-password',
  REACTORY_APPLICATION_ANONUSER_EMAIL = 'anonymous@reactory.local',
  REACTORY_APPLICATION_ANONUSER_PASSWORD = 'anonymous-password',
} = process.env;

const USERS_TO_LOAD: Reactory.Server.IStaticallyLoadedUser[] = [];

const USERS_YAML = `${process.env.APPLICATION_ROOT || 'app'}/data/clientConfigs/reactory/authentication/users.yaml`;
if (fs.existsSync(USERS_YAML)) {
  logger.info(`Loading users from YAML file: ${USERS_YAML}`);
  try {
    const yamlContent = fs.readFileSync(USERS_YAML, 'utf8');
    const yaml_users = yaml.load(yamlContent);
    if (yaml_users && Array.isArray(yaml_users)) {
      USERS_TO_LOAD.push(...yaml_users);
      
    }
  } catch (error) {
    logger.error(`Error loading users from YAML file: ${error.message}`);
  }
}

/**
 * The Application account is the account that will be used by the client application to connect to the 
 * server. Whenever this value changes, all client applications need to hve their password updated.
 */
const APPLICATION_ACCOUNT: Reactory.Server.IStaticallyLoadedUser = {
  email: REACTORY_APPLICATION_EMAIL,
  roles: ['ADMIN', 'DEVELOPER'],
  firstName: 'Reactory',
  lastName: 'Admin',
  password: REACTORY_APPLICATION_PASSWORD,
  username: "reactory",
};

/**
 * Each application requires an anonymous user account. The anonymous user account is required
 * for the client application to login. 
 */
const APPLICATION_ANON_USER_ACCOUNT: Reactory.Server.IStaticallyLoadedUser = {
  email: REACTORY_APPLICATION_ANONUSER_EMAIL,
  roles: ['ANON'],
  firstName: 'Anonymous',
  lastName: 'User',
  username: 'anonymous',
  password: REACTORY_APPLICATION_ANONUSER_PASSWORD,
};

const users: Reactory.Server.IStaticallyLoadedUser[] = [
  APPLICATION_ACCOUNT,
  APPLICATION_ANON_USER_ACCOUNT,
  ...USERS_TO_LOAD
];

export default users;