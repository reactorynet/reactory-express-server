import Reactory from "@reactory/reactory-core";
import logger from "@reactory/server-core/logging";
import CoreData from "@reactory/server-core/data";
import { ReactoryClientValidationError } from "@reactory/server-core/exceptions";
import { isNil } from "lodash";
import ReactoryClientModel from ".";
import Menu from "../Menu";
import ClientComponent from "../ClientComponent";
import User from "../User";
import { strongRandom } from "@reactory/server-core/utils";
import { ObjectId } from "mongodb";

const { clients } = CoreData;

const upsertFromConfig = async (
  clientConfig: Partial<Reactory.Models.IReactoryClient>
): Promise<Reactory.Models.ReactoryClientDocument> => {
  const { key } = clientConfig;
  logger.info(`Finding ReactoryClient with key ${key}`);

  const input = { ...clientConfig };
  delete input.menus;
  delete input.password;

  let reactoryClient: Reactory.Models.ReactoryClientDocument =
    await ReactoryClientModel.findOne({ key }).then();
  if (isNil(reactoryClient) === false) {
    try {
      // reactoryClient
      reactoryClient = await ReactoryClientModel.findOneAndUpdate(
        { key },
        { ...clientConfig, updatedAt: new Date() }
      ).then();
      logger.debug(`ReactoryClient ${reactoryClient.name} updated`);
    } catch (upsertError) {
      logger.error("An error occured upserting the record", upsertError);
      throw upsertError;
    }
  } else {
    try {
      //@ts-ignore
      reactoryClient = new ReactoryClientModel(input);
      const validationResult = reactoryClient.validateSync();
      if (validationResult && validationResult.errors) {
        logger.info("Validation Result Has Errors", validationResult.errors);
        throw new ReactoryClientValidationError(
          "Could not validate the input",
          validationResult
        );
      } else {
        reactoryClient = await reactoryClient.save().then();
      }
    } catch (saveNewError) {
      logger.error("Could not save the new client data", saveNewError);
      throw saveNewError;
    }
  }

  //
  const menuDefs = clientConfig.menus || [];
  const menuRefs = [];
  logger.info(`Loading menus for ${reactoryClient.name}`, {});
  for (const menuDef of menuDefs) {
    try {
      const menuFound = await Menu.findOneAndUpdate(
        { client: reactoryClient._id, key: menuDef.key },
        { ...menuDef, client: reactoryClient._id },
        { upsert: true, new: true }
      );
      if (menuFound && (menuFound as any)._id)
        menuRefs.push((menuFound as any)._id);
    } catch (menuErr) {
      logger.error("Error loading menu", menuErr);
    }
  }

  //@ts-ignore
  reactoryClient.menus = menuRefs;
  reactoryClient = await reactoryClient.save().then();

  logger.debug(
    `Upserted ${reactoryClient.name}: ${
      reactoryClient && reactoryClient._id ? reactoryClient._id : "no-id"
    }`
  );
  return reactoryClient;
};

const onStartup = async (context: Reactory.Server.IReactoryContext) => {
  const userService = context.getService<Reactory.Service.IReactoryUserService>(
    "core.UserService@1.0.0"
  );

  /**
   * returns an array of user create for organization promises
   */
  const loadUsers = async (
    usersToLoad: Reactory.Server.IStaticallyLoadedUser[],
    partner: Reactory.Models.IReactoryClientDocument
  ) => {
    const results = [];
    for (const userOptions of usersToLoad) {
      const {
        email,
        firstName,
        lastName,
        username,
        password,
        roles,
        authProviders,
        organization,
        businessUnit,
        teams,
      } = userOptions;

      if (isNil(email) || isNil(firstName) || isNil(lastName)) {
        logger.warn(`User ${email} is missing required fields, skipping...`);
        continue;
      }

      let organizationDocument: Reactory.Models.IOrganizationDocument | null =
        null;
      let businessUnitDocument: Reactory.Models.IBusinessUnitDocument | null =
        null;
      let teamDocuments: Reactory.Models.ITeamDocument[] = [];
      const orgService =
        context.getService<Reactory.Service.IReactoryOrganizationService>(
          "core.OrganizationService@1.0.0"
        );

      // check the type of the organization and then load / create it if it does not exist
      if (organization) {
        if (typeof organization === "string") {
          // check if it is a valid ObjectId
          if (ObjectId.isValid(organization) === true) {
            // assume it's an ObjectId
            organizationDocument = await orgService.get(organization);
          }
          // assume it's an organization name
          const org = await orgService.findWithName(organization);
          if (org) {
            organizationDocument = org;
          } else {
            organizationDocument = await orgService.create(organization);
          }
        } else if (
          typeof organization === "object" &&
          !("_id" in organization)
        ) {
          // assume it's an object with a name property
          const org = await orgService.findWithName(
            (organization as Reactory.Models.IOrganization).name
          );
          if (org) {
            organizationDocument = org;
          } else {
            organizationDocument = await orgService.create(
              (organization as Reactory.Models.IOrganization).name
            );
          }
        }
      }

      // check the type of the businessUnit and then load / create it if it does not exist
      // we use the organization service to load the business unit
      if (businessUnit) {
        if (typeof businessUnit === "string") {
          // check if it is a valid ObjectId
          if (ObjectId.isValid(businessUnit)) {
            // assume it's an ObjectId
            businessUnitDocument = await orgService.findBusinessUnit(
              organizationDocument._id,
              businessUnit
            );
          } else {
            // assume it's a name
            const bu = await orgService.findBusinessUnit(
              organizationDocument._id,
              businessUnit
            );
            if (bu) {
              businessUnitDocument = bu;
            } else {
              businessUnitDocument = await orgService.createBusinessUnit(
                organizationDocument._id,
                businessUnit
              );
            }
          }
        } else if (
          typeof businessUnit === "object" &&
          !("_id" in businessUnit)
        ) {
          // assume it's an object with a name property
          const bu = await orgService.findBusinessUnit(
            organizationDocument._id,
            (businessUnit as unknown as Reactory.Models.IBusinessUnit).name
          );
          if (bu) {
            businessUnitDocument = bu;
          } else {
            businessUnitDocument = await orgService.createBusinessUnit(
              organizationDocument._id,
              (businessUnit as unknown as Reactory.Models.IBusinessUnit).name
            );
          }
        }        
      }

      // check the type of the teams and then load / create them if they do not exist
      if (teams && Array.isArray(teams) && teams.length > 0) {
        for (const team of teams) {
          if (typeof team === "string") {
            // check if it is a valid ObjectId
            if (ObjectId.isValid(team)) {
              // assume it's an ObjectId
              const teamDoc = await orgService.findTeam(
                organizationDocument._id,
                team
              );
              if (teamDoc) {
                teamDocuments.push(teamDoc);
                if (!organizationDocument.teams)
                  organizationDocument.teams = [];
                // check if the team document has it in the teams array
                const hasTeam = organizationDocument.teams.includes(
                  teamDoc._id
                );
                if (!hasTeam) {
                  organizationDocument.teams.push(teamDoc._id);
                  await organizationDocument.save();
                }
              }
            } else {
              // assume it's a name
              const teamDoc = await orgService.findTeam(
                organizationDocument._id,
                team
              );
              if (teamDoc) {
                teamDocuments.push(teamDoc);
              } else {
                const newTeam = await orgService.createTeam(
                  organizationDocument._id,
                  team
                );
                teamDocuments.push(newTeam);
              }
            }
          } else if (typeof team === "object" && !("_id" in team)) {
            // assume it's an object with a name property
            const teamDoc = await orgService.findTeam(
              organizationDocument._id,
              (team as Reactory.Models.ITeam).name
            );
            if (teamDoc) {
              teamDocuments.push(teamDoc);
            } else {
              const newTeam = await orgService.createTeam(
                organizationDocument._id,
                (team as Reactory.Models.ITeam).name
              );
              teamDocuments.push(newTeam);
            }
          }
        }
      }

      const createdUser = await userService.createUser(
        {
          firstName,
          lastName,
          email,
          roles,
          username: username,
          password: password,
          organization: organizationDocument,
        },
        organizationDocument,
        businessUnitDocument,
        teamDocuments,
        partner // this is the reactory client document
      );
      results.push(createdUser);
    }
    return results;
  };

  const installComponents = async (componentsArray: any[]) => {
    logger.info(`Loading ${componentsArray.length} components into reactory`);
    try {
      const reactoryComponents = [];
      for (const component of componentsArray) {
        const newComponentDef = {
          ...component,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (newComponentDef.author)
          newComponentDef.author = await User.findOne({
            email: component.author,
          }); // eslint-disable-line
        logger.info(
          `Loading component ${component.nameSpace}.${component.name}@${component.version}`
        );
        const { name, version, nameSpace } = component;

        let componentObject = await ClientComponent.findOne({
          name,
          version,
          nameSpace,
        }).exec();

        if (isNil(componentObject)) {
          componentObject = await new (ClientComponent as any)({
            ...newComponentDef,
          }).save();
        } else {
          [
            "title",
            "author",
            "labels",
            "uri",
            "roles",
            "arguments",
            "resources",
          ].forEach((p) => {
            //@ts-ignore
            componentObject[p] = newComponentDef[p];
            return 0;
          });

          //@ts-ignore
          componentObject.updatedAt = new Date();

          await componentObject.save();
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

    for (const clientConfig of clients) {
      logger.info(`Configuring client ${clientConfig.name}`);
      if (clientConfig.components && clientConfig.components!.length > 1) {
        componentIds = await installComponents(clientConfig.components).then();
        logger.debug(
          `Loaded (${componentIds.length}) components for client ${clientConfig.name}`
        );
      }

      const { key } = clientConfig;
      logger.info(`Finding ReactoryClient with key ${key}`);
      reactoryClient = await ReactoryClientModel.findOne({ key }).then();

      const clientData: any = {
        ...clientConfig,
        menus: [],
        components: componentIds.map((c) => c._id),
      };
      delete clientData.password;
      if (isNil(reactoryClient) === false) {
        try {
          reactoryClient = await ReactoryClientModel.findOneAndUpdate(
            { key },
            { ...clientData, updatedAt: new Date() }
          ).then();
          logger.debug(`ReactoryClient ${reactoryClient.name} updated`);
        } catch (upsertError) {
          logger.error("An error occured upserting the record", upsertError);
        }
      } else {
        try {
          logger.debug(`ReactoryClient ${key} not found, creating`);
          //@ts-ignore
          reactoryClient = new ReactoryClientModel(clientData);
          const validationResult = reactoryClient.validateSync();
          if (validationResult && validationResult.errors) {
            logger.info(
              "Validation Result Has Errors",
              validationResult.errors
            );
            throw new ReactoryClientValidationError(
              "Could not validate the input",
              validationResult
            );
          } else {
            reactoryClient = await reactoryClient.save().then();
          }
        } catch (saveNewError) {
          logger.error("Could not save the new client data", saveNewError);
        }
      }
      logger.debug(
        `Upserted ${reactoryClient.name}: ${
          reactoryClient && reactoryClient._id ? reactoryClient._id : "no-id"
        }`
      );
      if (reactoryClient._id) {
        reactoryClient.setPassword(clientConfig.password);
        if (Array.isArray(clientConfig.users) === true) {
          let defaultUsers = [];
          logger.info(
            `Loading (${
              Array.isArray(clientConfig.users) === true
                ? clientConfig.users.length
                : 0
            }) default users for ${reactoryClient.name}`
          );
          defaultUsers = await loadUsers(
            clientConfig.users || [],
            reactoryClient
          );
          logger.info(
            `Loading (${defaultUsers.length}) default users for ${reactoryClient.name} - complete`
          );
        }

        //await installDefaultEmailTemplates(reactoryClient).then();
        // has been saved now we can add the details
        const menuDefs = clientConfig.menus || [];
        const menuRefs = [];
        logger.info(`Loading menus for ${reactoryClient.name}`);
        for (const menuDef of menuDefs) {
          try {
            const menuFound = await Menu.findOneAndUpdate(
              { client: reactoryClient._id, key: menuDef.key },
              { ...menuDef, client: reactoryClient._id },
              { upsert: true, new: true }
            );
            if (menuFound && (menuFound as any)._id)
              menuRefs.push((menuFound as any)._id);
          } catch (menuErr) {
            logger.error("Error loading menu", menuErr);
          }
        }

        //@ts-ignore
        reactoryClient.menus = menuRefs;
        reactoryClient = await reactoryClient.save().then();
        clientsLoaded.push(reactoryClient);
      } else {
        logger.error(
          `${clientConfig.key} Validation failed, check config`,
          clientConfig
        );
        clientsFailed.push({ clientConfig });
      }
    }
    return {
      clientsLoaded,
      clientsFailed,
    };
  } catch (ex) {
    logger.error("Error loading clients", ex);
    return {
      clientsLoaded: [],
      clientsFailed: [],
    };
  }
};

export default {
  onStartup,
  upsertFromConfig,
};
