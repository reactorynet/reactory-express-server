'use strict'
import lodash, { isArray } from 'lodash';
import ReactoryApi from '@reactory/server-core/application';
import uuid from 'uuid';
import { Application, User, ReactoryClient, Menu, ClientComponent } from '@reactory/server-core/models';
import { installDefaultEmailTemplates } from '@reactory/server-core/emails';
import data from '@reactory/server-core/data';
import logger from '@reactory/server-core/logging';
import { ReactoryClientValidationError } from '@reactory/server-core/exceptions';
import { startServices, getService } from '@reactory/server-core/services';
import { Reactory } from '@reactory/server-core/types/reactory';
import ReactoryContextProvider from '@reactory/server-core/apollo/ReactoryContextProvider';

const { clients, components } = data;


/**
 * returns an array of user create for organization promises
 */
const getUserloadPromises = (usersToLoad: any[]) => {
  return usersToLoad.map((userOptions) => {
    const {
      user,
      password,
      roles,
      provider,
      partner,
      organization,
      businessUnit,
    } = userOptions;

    return ReactoryApi.Admin.User.createUserForOrganization(
      user, password,
      organization, roles,
      provider, partner, businessUnit,
    );
  });
};

/**
 * Installs and configures the main Reactory Application.
 */
const configureApplication = async () => {
  logger.info(`Configuring Core Application ${process.env.VERSION || 'alpha'}`);
  const applicationCount = await Application.count({}).then();

  if (applicationCount === 0) {
    logger.info('Adding Reactory Core Definition');
    return new Application({
      title: 'Reactory',
      description: 'Core API for reactory applications',
      version: process.env.VERSION || 'alpha',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).save().then();
  }

  return Application.findOne({ title: 'Reactory' }).then();
};


const installSystemUser = async () => {

  let sysAdminUser = await User.findOne({ email: process.env.SYSADMIN_EMAIL || 'reactory-sysadmin@mail.com' }).then();
  if (sysAdminUser === null) {
    logger.debug(`System admin user not found, creating default user`)
    sysAdminUser = new User({
      username: 'sysadmin',
      firstName: 'System',
      lastName: 'User',
      email: process.env.SYSADMIN_EMAIL || 'reactory-sysadmin@mail.com',
      authProvider: 'LOCAL',
      providerId: 'reactory-system',
      lastLogin: new Date(),
      roles: ['SYSADMIN'],
      legacyId: -1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    sysAdminUser.setPassword(uuid());
    await sysAdminUser.save().then();
  }
  return sysAdminUser;
};

const installComponents = async (componentsArray: any[]) => {
  logger.info(`Loading ${componentsArray.length} components into reactory`);
  try {
    const reactoryComponents = [];
    for (let cid = 0; cid < componentsArray.length; cid += 1) {
      const component = componentsArray[cid];
      const newComponentDef = { ...component, createdAt: new Date(), updatedAt: new Date() };
      if (newComponentDef.author) newComponentDef.author = await User.findOne({ email: component.author }) // eslint-disable-line              
      logger.info(`Loading component ${component.nameSpace}.${component.name}@${component.version}`);
      const { name, version, nameSpace } = component;

      let componentObject = await ClientComponent.findOne({ name, version, nameSpace }).then();

      if (lodash.isNil(componentObject)) {
        componentObject = await new ClientComponent({ ...newComponentDef }).save().then();
      } else {
        /**
        title: 'Dashboard',
        author: 'werner.weber+reactory-sysadmin@gmail.com',
        labels: [],
        uri: 'embed',
        roles: ['USER'],
        arguments: [],
        resources: [],
         */
        ['title', 'author', 'labels', 'uri', 'roles', 'arguments', 'resources'].forEach((p) => {
          componentObject[p] = newComponentDef[p];
          return 0;
        });

        componentObject.updatedAt = new Date();

        await componentObject.save().then();
      }
      reactoryComponents.push(componentObject);
    }

    logger.info(`(${reactoryComponents.length}) components created/updated`);
    return reactoryComponents;
  } catch (e) {
    logger.error(`Error while loading components ${e.message}`, e);
    return [];
  }
};

const installClients = async (configs: any) => {

  const makeUserArrayFromProps = (userItems: Reactory.IUser[], partner: Reactory.IPartner, organization: Reactory.IOrganization, businessUnit: Reactory.IBusinessUnit) => {
    return userItems.map((usr) => {
      return {
        partner,
        organization,
        businessUnit,
        user: { firstName: usr.firstName, lastName: usr.lastName, email: usr.email },
        password: usr.password || 'Password123!',
        roles: usr.roles,
      };
    });
  };

  try {
    const clientsLoaded = [];
    const clientsFailed = [];
    let componentIds = [];
    let clientConfig = null;
    let reactoryClient: Reactory.IReactoryClientDocument = null;

    for (let cfgId = 0; cfgId < configs.length; cfgId += 1) {
      clientConfig = configs[cfgId];
      logger.info(`Configuring client ${clientConfig.name}`);
      componentIds = await installComponents(clientConfig.components).then();
      logger.info(`Loaded (${componentIds.length}) components for client ${clientConfig.name}`);
      const { key } = clientConfig;
      logger.info(`Finding ReactoryClient with key ${key}`);
      reactoryClient = await ReactoryClient.findOne({ key }).then();

      const clientData: any = { ...clientConfig, menus: [], components: componentIds.map(c => c._id) };
      delete clientData.password;
      if (lodash.isNil(reactoryClient) === false) {
        try {
          reactoryClient = await ReactoryClient.findOneAndUpdate({ key }, { ...clientData, updatedAt: new Date() }).then();
          logger.debug(`ReactoryClient ${reactoryClient.name} updated`);
        } catch (upsertError) {
          logger.error('An error occured upserting the record', upsertError);
        }
      } else {
        try {
          logger.debug(`ReactoryClient ${key} not found, creating`);
          reactoryClient = new ReactoryClient(clientData);
          const validationResult = reactoryClient.validateSync();
          if (validationResult && validationResult.errors) {
            logger.info('Validation Result Has Errors', validationResult.errors);
            throw new ReactoryClientValidationError('Could not validate the input', validationResult);
          } else {
            reactoryClient = await reactoryClient.save().then();
          }
        } catch (saveNewError) {
          logger.error('Could not save the new client data', saveNewError);
        }
      }
      logger.debug(`Upserted ${reactoryClient.name}: ${reactoryClient && reactoryClient._id ? reactoryClient._id : 'no-id'}`);
      if (reactoryClient._id) {
        reactoryClient.setPassword(clientConfig.password);
        if (isArray(clientConfig.users) === true) {
          let defaultUsers = [];
          logger.info(`Loading (${lodash.isArray(clientConfig.users) === true ? clientConfig.users.length : 0}) default users for ${reactoryClient.name}`);
          defaultUsers = await Promise.all(getUserloadPromises(makeUserArrayFromProps(clientConfig.users || [], reactoryClient))).then();
          logger.info(`Loading (${defaultUsers.length}) default users for ${reactoryClient.name} - complete`);
        }

        await installDefaultEmailTemplates(reactoryClient).then();
        // has been saved now we can add the details
        const menuDefs = clientConfig.menus || [];
        const menuRefs = [];
        logger.info(`Loading menus for ${reactoryClient.name}`);
        for (let mid = 0; mid < menuDefs.length; mid += 1) {
          try {
            const menuFound = await Menu.findOneAndUpdate(
              { client: reactoryClient._id, key: menuDefs[mid].key },
              { ...menuDefs[mid], client: reactoryClient._id },
              { upsert: true },
            );
            if (menuFound) menuRefs.push(menuFound._id);
          } catch (menuErr) {
            logger.error('Error loading menu', menuErr);
          }
        }

        reactoryClient.menus = menuRefs;
        reactoryClient = await reactoryClient.save().then();
        clientsLoaded.push(reactoryClient);
      } else {
        logger.error(`${clientConfig.key} Validation failed, check config`, clientConfig);
        clientsFailed.push({ clientConfig });
      }
    }
    return {
      clientsLoaded,
      clientsFailed,
    };
  } catch (ex) {
    logger.error(ex.message, ex);
    throw ex;
  }
};

const initialiseStartupAwareServices = async (context: Reactory.IReactoryContext) => {
  return startServices({}, context).then();
};


const startup = async () => {
  logger.info('Startup process initializing');

  try {
    const start = new Date().valueOf();
    const applicationResponse = await configureApplication().then();
    const userResponse = await installSystemUser();
    const componentsResponse = await installComponents(components);
    const clientsInstallResponse = await installClients(clients);

    if(!process.env.DEFAULT_CLIENT_KEY) {
      logger.warn("NO DEFAULT CLIENT KEY DETECTED: falling back to reactory default 'reactory'")
    } else {
      logger.info(`DEFAULT CLIENT KEY (the default execution client key is ${process.env.DEFAULT_CLIENT_KEY}`)
    }

    let context_partner = await ReactoryClient.findOne({ key: process.env.DEFAULT_CLIENT_KEY || "reactory" }).then();// eslint-disable-line


    if (userResponse && context_partner) { // eslint-disable-line

      let context = await ReactoryContextProvider(null, { user: userResponse, partner: context_partner }).then();

      await initialiseStartupAwareServices(context);
    }


    const result = {
      application: applicationResponse,
      system_user: userResponse,
      clientsLoaded: clientsInstallResponse,
      components: componentsResponse,
    };

    let ticks = start;
    logger.info('Startup Complete', JSON.stringify(result, null, 2));
    return result;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
};
export default startup;
