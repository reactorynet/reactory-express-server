import co from 'co';
import { isArray } from 'lodash';
import ReactoryApi from '../application';
import { Application, User, ReactoryClient, Menu, ClientComponent } from '../models';
import { installDefaultEmailTemplates } from '../emails';

import data from '../data';
import logger from '../logging';
import { ReactoryClientValidationError } from '../exceptions';


const { clients, users, components } = data;

const startup = co.wrap(function* startupGenerator() {
  const appPromise = new Promise((resolve, reject) => {
    Application.count({}, function (err, result) { //eslint-disable-line
      if (result === 0) {
        logger.info('Adding Reactory Core Definition');
        const app = new Application({
          title: 'Reactory',
          description: 'Core API for reactory applications',
          version: process.env.VERSION || 'alpha',
          createdAt: new Date(),
          updatedAt: new Date(),
        }).save(function (err) { //eslint-disable-line
          if (err) reject(err);
          resolve(app);
        });
      } else {
        Application.findOne({ title: 'Reactory' }).exec(function (err, result) { //eslint-disable-line
          if (err) reject(err);
          resolve(result);
        });
      }
    });
  });

  const systemUserPromise = new Promise((resolve, reject) => {
    User.findOne({ username: 'sysadmin' }).then((result) => {
      if (result === null) {
        const systemUser = new User({
          username: 'sysadmin',
          firstName: 'System',
          lastName: 'User',
          email: 'werner.weber+reactory-sysadmin@gmail.com',
          authProvider: 'LOCAL',
          providerId: 'reactory-system',
          lastLogin: new Date(),
          roles: ['SYSADMIN'],
          legacyId: -1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        systemUser.setPassword('XXXXXXXXXXXXX');
        systemUser.save(function (err) { //eslint-disable-line
          if (err) reject(err);
          resolve(systemUser);
        });
      } else {
        resolve(result);
      }
    }).catch((error) => {
      reject(error);
    });
  });

  /**
   * Returns an array of promises
   */
  const getUserloadPromises = (usersToLoad) => {
    return usersToLoad.map((userOptions) => {
      return co.wrap(function* userPromiseResolver(opts) {
        const {
          user,
          password,
          roles,
          provider,
          partner,
          organization,
          businessUnit,
        } = opts;
        return yield ReactoryApi.Admin.User.createUserForOrganization(user, password, organization, roles, provider, partner, businessUnit);
      })(userOptions);
    });
  };

  const componentsPromise = co.wrap(function* loadComponents(componentsArray) {
    logger.debug(`Loading ${componentsArray.length} components into reactory`);
    try {
      const reactoryComponents = [];
      for (let cid = 0; cid < componentsArray.length; cid += 1) {
        const component = componentsArray[cid];
        const newComponentDef = { ...component };
        if (newComponentDef.author) newComponentDef.author = yield User.findOne({ email: component.author }) // eslint-disable-line              
        logger.debug(`Loading component ${component.name} component into reactory`, { newComponentDef });
        const { name, version, nameSpace } = component;
        const componentObject = yield ClientComponent.findOneAndUpdate(
          { name, version, nameSpace },
          { ...newComponentDef },
          { upsert: true, fields: { _id: 1, name: 1 } },
        );
        logger.info(`Loading component ${component.name} done`);
        reactoryComponents.push(componentObject);
      }

      return reactoryComponents;
    } catch (e) {
      logger.error('Error while loading components', { message: e.message });
      return [];
    }
  });

  const makeUserArrayFromProps = (userItems, partner, organization, businessUnit) => {
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

  const clientsPromise = co.wrap(function* clientConfigGenerator(configs) {
    try {
      const clientsLoaded = [];
      const clientsFailed = [];
      for (let cfgId = 0; cfgId < configs.length; cfgId += 1) {
        const clientConfig = configs[cfgId];
        logger.info(`Configuring client ${clientConfig.name}`);

        const componentIds = yield componentsPromise(clientConfig.components).then();
        logger.info(`Loaded (${componentIds.length}) components for client ${clientConfig.name}`);
        const { key } = clientConfig;
        let reactoryClient = yield ReactoryClient.findOne({ key }).then();
        const clientData = { ...clientConfig, menus: [], components: componentIds.map(c => c._id) };
        delete clientData.password;
        if (reactoryClient) {
          try {
            reactoryClient = yield ReactoryClient.findOneAndUpdate({ key }, clientData).then();
          } catch (upsertError) {
            logger.error('An error occured upserting the record', upsertError);
          }
        } else {
          try {
            reactoryClient = new ReactoryClient(clientData);
            const validationResult = reactoryClient.validateSync();
            if (validationResult && validationResult.errors) {
              logger.info('Validation Result Has Errors', validationResult.errors);
              throw new ReactoryClientValidationError('Could not validate the input', validationResult);
            } else {
              reactoryClient = yield reactoryClient.save().then();
            }
          } catch (saveNewError) {
            logger.error('Could not save the new client data');
          }
        }
        logger.info(`Upserted ${reactoryClient.name}: ${reactoryClient && reactoryClient._id ? reactoryClient._id : 'no-id'}`);
        if (reactoryClient._id) {
          reactoryClient.setPassword(clientConfig.password);
          if (isArray(clientConfig.users) === true) {
            let defaultUsers = [];
            logger.info('Loading default users', { users: clientConfig.users });
            defaultUsers = yield Promise.all(getUserloadPromises(makeUserArrayFromProps(clientConfig.users || [], reactoryClient)));
            logger.info(`Loaded users ${defaultUsers.length} for ${reactoryClient.name}`);
          }
          yield installDefaultEmailTemplates(reactoryClient).then();
          // has been saved now we can add the details
          const menuDefs = clientConfig.menus || [];
          const menuRefs = [];
          logger.info(`Loading menus for ${reactoryClient.name}`);
          for (let mid = 0; mid < menuDefs.length; mid += 1) {
            try {
              const menuFound = yield Menu.findOneAndUpdate(
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
          reactoryClient = yield reactoryClient.save().then();
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
  });


  logger.info('Startup initializing');
  try {
    const appResult = yield appPromise.then();
    const userResponse = yield systemUserPromise.then();
    const componentsResponse = yield componentsPromise(components).then();
    const clientsInstall = yield clientsPromise(clients);

    let testUsersResult = null;
    if (process.env.TEST_USERS === 'load') {
      testUsersResult = yield Promise.all(getUserloadPromises(users)).then();
    }

    const result = {
      application: appResult,
      system_user: userResponse,
      clientsLoaded: clientsInstall,
      componentsResponse,
      testUsersResult,
    };
    logger.info('Startup Complete');
    return result;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
});
export default startup;
