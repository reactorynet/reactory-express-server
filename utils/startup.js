import co from 'co';
import { isNil } from 'lodash';
import { Application, User, ReactoryClient, Menu, ClientComponent } from '../models';
import { installDefaultEmailTemplates } from '../emails';
import data from '../data';
import logger from '../logging';
import ApiError, { ReactoryClientValidationError } from '../exceptions';
import { react } from 'babel-types';


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
  const testUsersPromise = () => {
    return users.map((user) => {
      return new Promise((reject, resolve) => {
        User.findOne({ email: user.email }).then((result) => {
          if (result === null) {
            const newUser = new User({
              ...user,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
            newUser.setPassword(user.password || 'P@ssw0rd_99!');
            return newUser.save(function (err) { //eslint-disable-line
              if (err) reject(err);
              resolve(newUser);
            });
          }
          resolve(result);
        });
      });
    });
  };

  const componentsPromise = co.wrap(function* loadComponents(componentsArray) {
    logger.info(`Loading ${componentsArray.length} components into reactory`);
    try {
      const reactoryComponents = [];
      for (let cid = 0; cid < componentsArray.length; cid += 1) {
        const component = componentsArray[cid];
        logger.info(`Loading component ${component.name} component into reactory`);
        const newComponentDef = { ...component };
        if (newComponentDef.author) newComponentDef.author = yield User.findOne({ email: component.author }) // eslint-disable-line      
        const { name, version, nameSpace } = component;
        const componentObject = yield ClientComponent.findOneAndUpdate(
          { name, version, nameSpace },
          { ...newComponentDef },
          { upsert: true },
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
        let reactoryClient = yield ReactoryClient.findOneAndUpdate(
          { key },
          { ...clientConfig, menus: [], components: componentIds.map(c => c._id) },
          { upsert: true },
        );
        logger.info(`Upserted ${clientConfig.name}: ${reactoryClient && reactoryClient._id ? reactoryClient._id : 'no-id'}`);
        if (reactoryClient) {
          reactoryClient.setPassword(clientConfig.password);
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
          reactoryClient = yield reactoryClient.save();
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
    const installedTemplates = yield installDefaultEmailTemplates().then();

    let testUsersResult = null;
    if (process.env.TEST_USERS === 'load') {
      testUsersResult = yield Promise.all(testUsersPromise()).then();
    }

    const result = {
      application: appResult,
      system_user: userResponse,
      clientsLoaded: clientsInstall,
      componentsResponse,
      installedTemplates,
      testUsersResult,
    };
    logger.info('StartupGenerator Complete', result);
    return result;
  } catch (startupError) {
    logger.error('Could not initialize the system correctly. Fatal errors.', startupError);
    throw startupError;
  }
});
export default startup;
