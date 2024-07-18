import Reactory from '@reactory/reactory-core';
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import ReactoryUser from '@reactory/server-modules/reactory-core/models/User';
import lodash from 'lodash';
import { 
  clients,
} from '@reactory/server-core/data'
import { 
  strongRandom
} from '@reactory/server-core/utils/string';

type InitializeSystemUserCliApp = (vargs: string[], context: Reactory.Server.IReactoryCliContext) => Promise<void>

const InitializeSystemUser: InitializeSystemUserCliApp = async (vargs: string[], context: Reactory.Server.IReactoryContext): Promise<void> => { 
  const { 
    REACTORY_APPLICATION_EMAIL,
    REACTORY_APPLICATION_PASSWORD,
  } = process.env;

  if (!REACTORY_APPLICATION_EMAIL || !REACTORY_APPLICATION_PASSWORD) {
    context.error('[ConfigurationError] System user email or password not set. Cannot continue system user initialization.'
      + 'Please check REACTORY_APPLICATION_EMAIL and REACTORY_APPLICATION_PASSWORD configuration values');
    process.exit(1);
  }
  
  const { log } = context;

  const reactoryConfig = lodash.find(clients, { key: 'reactory' });
  if(!reactoryConfig) {
    log(`[ClientConfigurationError] Reactory client configuration not found. Cannot continue system user initialization.`);
    process.exit(1);
  }

  let reactoryClient = await ReactoryClient.findOne({ key: 'reactory' }).exec();
  if(lodash.isNil(reactoryClient) === true) { 
    // @ts-ignore
    reactoryClient = await ReactoryClient.upsertFromConfig(reactoryConfig);
    if(lodash.isNil(reactoryClient)) {
      log(`[ClientConfigurationError] Reactory client configuration not found. Cannot continue system user initialization.`);
      process.exit(1);
    }
  }

  log(`Initializing system user ${REACTORY_APPLICATION_EMAIL}...`, {}, 'info');

  //@ts-ignore
  let user: Reactory.Models.IUserDocument = await ReactoryUser.findOne({ email: REACTORY_APPLICATION_EMAIL }).exec();

  if(user) {
    log('Initial user already exists', {}, 'warning');
    process.exit(0);
  }

  //@ts-ignore
  user = new ReactoryUser({
    email: REACTORY_APPLICATION_EMAIL,
    password: "",
    firstName: 'Reactory',
    lastName: 'System',
    memberships: [],
    username: 'reactory',
    salt: strongRandom(16),
    createdAt: new Date(),
    updatedAt: new Date(),
    active: true,
    dateOfBirth: new Date(),
  });

  user.setPassword(REACTORY_APPLICATION_PASSWORD);
  user.addRole(reactoryClient._id.toString(),'SYSTEM');
  await user.save();

  log(`System user initialized successfully`, {}, 'info');
}

/**
 * ReactorCliApp definition
 */
const ReactorCliAppDefinition: Reactory.IReactoryComponentDefinition<InitializeSystemUserCliApp> = {
  nameSpace: 'core',
  name: 'InitializeSystemUser',
  version: '1.0.0',
  description: `The InitializeSystemUser cli function is used as a CLI plugin for the Reactory CLI tool.
  The InitializeSystemUser cli function is used to initialize the system user for the Reactory system.
  This function is destructive and should only be used when setting up a new Reactory system.`,
  component: InitializeSystemUser,
  domain: Reactory.ComponentDomain.function,
  features: [{
    feature: 'Initialize',
    featureType: Reactory.FeatureType.function,
    action: ['initalize', 'initilize-system-user'],
    stem: 'initialize',
  }],
  overwrite: false,
  roles: [],
  stem: 'initialize',
  tags: ['init', 'core', 'system user'],
  toString(includeVersion) {
    return includeVersion ? `${this.nameSpace}.${this.name}@${this.version}` : this.name;
  },
}

export default ReactorCliAppDefinition;