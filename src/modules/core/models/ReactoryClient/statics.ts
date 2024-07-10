import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import CoreData from '@reactory/server-core/data';
import { ReactoryClientValidationError } from '@reactory/server-core/exceptions';
import { isNil } from 'lodash';
import ReactoryClientModel from './'
import Menu from '../Menu';
import ClientComponent from '../ClientComponent';
import User from '../User';
import { strongRandom } from '@reactory/server-core/utils';

const {
  clients,
} = CoreData;


const upsertFromConfig = async (clientConfig: Partial<Reactory.Models.IReactoryClient>): Promise<Reactory.Models.ReactoryClientDocument> => { 
  const { key } = clientConfig;
  logger.info(`Finding ReactoryClient with key ${key}`);
  
  const input = { ...clientConfig };
  delete input.menus;
  delete input.password;

  let reactoryClient: Reactory.Models.ReactoryClientDocument = await ReactoryClientModel.findOne({ key }).then();
  if (isNil(reactoryClient) === false) {
    try {
      // reactoryClient
      reactoryClient = await ReactoryClientModel.findOneAndUpdate({ key }, { ...clientConfig, updatedAt: new Date() }).then();
      logger.debug(`ReactoryClient ${reactoryClient.name} updated`);
    } catch (upsertError) {
      logger.error('An error occured upserting the record', upsertError);
      throw upsertError;
    }
  } else {
    try {
      //@ts-ignore
      reactoryClient = new ReactoryClientModel(input);
      const validationResult = reactoryClient.validateSync();
      if (validationResult && validationResult.errors) {
        logger.info('Validation Result Has Errors', validationResult.errors);
        throw new ReactoryClientValidationError('Could not validate the input', validationResult);
      } else {
        reactoryClient = await reactoryClient.save().then();
      }
    } catch (saveNewError) {
      logger.error('Could not save the new client data', saveNewError);
      throw saveNewError;
    }
  }

  // 
  const menuDefs = clientConfig.menus || [];
  const menuRefs = [];        
  logger.info(`Loading menus for ${reactoryClient.name}`, {}, );
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

  //@ts-ignore
  reactoryClient.menus = menuRefs;
  reactoryClient = await reactoryClient.save().then();


  logger.debug(`Upserted ${reactoryClient.name}: ${reactoryClient && reactoryClient._id ? reactoryClient._id : 'no-id'}`);
  return reactoryClient;
};

const onStartup = async (context: Reactory.Server.IReactoryContext) => { 

  const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');

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
      
      return userService.createUser({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        roles,
        avatarProvider: user.avatarProvider,
        dateOfBirth: user.dateOfBirth,
        mobileNumber: user.mobileNumber,      
        username: user.username,
        password: password
        //@ts-ignore
      }, organization);
    });
  };


  const makeUserArrayFromProps = (userItems: Reactory.Server.IStaticallyLoadedUser[], partner: Reactory.Models.IReactoryClientDocument, organization?: Reactory.Models.IOrganization, businessUnit?: Reactory.Models.IBusinessUnit) => {
    return userItems.map((usr) => {
      return {
        partner,
        organization,
        businessUnit,
        user: { 
          firstName: usr.firstName, 
          lastName: usr.lastName, 
          email: usr.email,
          username: usr.username, 
        },
        password: usr.password || strongRandom(),
        roles: usr.roles || ['USER'],
      };
    });
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
  
        if (isNil(componentObject)) {
          componentObject = await new ClientComponent({ ...newComponentDef }).save().then();
        } else {
         
          ['title', 'author', 'labels', 'uri', 'roles', 'arguments', 'resources'].forEach((p) => {
            //@ts-ignore
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
  

  try {
    const clientsLoaded = [];
    const clientsFailed = [];
    let componentIds: any[] = [];
    let clientConfig = null;
    let reactoryClient: Reactory.Models.IReactoryClientDocument = null;

    for (let cfgId = 0; cfgId < clients.length; cfgId += 1) {
      clientConfig = clients[cfgId];
      logger.info(`Configuring client ${clientConfig.name}`);
      if(clientConfig.components && clientConfig.components!.length > 1) {
        componentIds = await installComponents(clientConfig.components).then();
        logger.debug(`Loaded (${componentIds.length}) components for client ${clientConfig.name}`);
      }

      const { key } = clientConfig;
      logger.info(`Finding ReactoryClient with key ${key}`);
      reactoryClient = await ReactoryClientModel.findOne({ key }).then();

      const clientData: any = { ...clientConfig, menus: [], components: componentIds.map(c => c._id) };
      delete clientData.password;
      if (isNil(reactoryClient) === false) {
        try {
          reactoryClient = await ReactoryClientModel.findOneAndUpdate({ key }, { ...clientData, updatedAt: new Date() }).then();
          logger.debug(`ReactoryClient ${reactoryClient.name} updated`);
        } catch (upsertError) {
          logger.error('An error occured upserting the record', upsertError);
        }
      } else {
        try {
          logger.debug(`ReactoryClient ${key} not found, creating`);
          //@ts-ignore
          reactoryClient = new ReactoryClientModel(clientData);
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
        if (Array.isArray(clientConfig.users) === true) {
          let defaultUsers = [];
          logger.info(`Loading (${Array.isArray(clientConfig.users) === true ? clientConfig.users.length : 0}) default users for ${reactoryClient.name}`);
          defaultUsers = await Promise.all(getUserloadPromises(makeUserArrayFromProps(clientConfig.users || [], reactoryClient))).then();
          logger.info(`Loading (${defaultUsers.length}) default users for ${reactoryClient.name} - complete`);
        }

        //await installDefaultEmailTemplates(reactoryClient).then();
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

        //@ts-ignore
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
    logger.error('Error loading clients', ex);
    return {
      clientsLoaded: [],
      clientsFailed: [],
    };
  }
  
};

export default {
  onStartup,
  upsertFromConfig,
}