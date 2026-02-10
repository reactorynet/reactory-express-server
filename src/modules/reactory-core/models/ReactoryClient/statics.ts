import Reactory from "@reactory/reactory-core";
import logger from "@reactory/server-core/logging";
import CoreData from "@reactory/server-core/data";
import { ReactoryClientValidationError } from "@reactory/server-core/exceptions";
import { isNil, isEqual } from "lodash";
import ReactoryClientModel from ".";
import Menu from "../Menu";
import ClientComponent from "../ClientComponent";
import User from "../User";
import { strongRandom } from "@reactory/server-core/utils";
import { ObjectId } from "mongodb";

const { clients } = CoreData;

/**
 * Telemetry metrics for client configuration operations
 * These are initialized on-demand during operations
 */
interface ClientConfigTelemetry {
  clientUpsertCounter?: Reactory.Telemetry.ICounter;
  clientUpsertDuration?: Reactory.Telemetry.IHistogram;
  clientUpsertErrorCounter?: Reactory.Telemetry.ICounter;
  routeSyncCounter?: Reactory.Telemetry.ICounter;
  routeSyncDuration?: Reactory.Telemetry.IHistogram;
  routeSyncErrorCounter?: Reactory.Telemetry.ICounter;
  menuSyncCounter?: Reactory.Telemetry.ICounter;
  menuSyncErrorCounter?: Reactory.Telemetry.ICounter;
  componentInstallCounter?: Reactory.Telemetry.ICounter;
  componentInstallDuration?: Reactory.Telemetry.IHistogram;
  userCreationCounter?: Reactory.Telemetry.ICounter;
  userCreationErrorCounter?: Reactory.Telemetry.ICounter;
}

/**
 * Initialize telemetry metrics for client configuration operations
 */
const initializeTelemetry = (
  context?: Reactory.Server.IReactoryContext
): ClientConfigTelemetry => {
  if (!context?.telemetry) {
    return {};
  }

  try {
    const { telemetry } = context;

    return {
      clientUpsertCounter: telemetry.createCounter("client_config_upsert_total", {
        description: "Total number of client configuration upserts",
        persist: true,
      }),
      clientUpsertDuration: telemetry.createHistogram(
        "client_config_upsert_duration_seconds",
        {
          description: "Duration of client configuration upsert operations",
          unit: "seconds",
          persist: true,
        }
      ),
      clientUpsertErrorCounter: telemetry.createCounter(
        "client_config_upsert_errors_total",
        {
          description: "Total number of client configuration upsert errors",
          persist: true,
        }
      ),
      routeSyncCounter: telemetry.createCounter("client_route_sync_total", {
        description: "Total number of route synchronization operations",
        persist: true,
      }),
      routeSyncDuration: telemetry.createHistogram(
        "client_route_sync_duration_seconds",
        {
          description: "Duration of route synchronization operations",
          unit: "seconds",
          persist: true,
        }
      ),
      routeSyncErrorCounter: telemetry.createCounter(
        "client_route_sync_errors_total",
        {
          description: "Total number of route synchronization errors",
          persist: true,
        }
      ),
      menuSyncCounter: telemetry.createCounter("client_menu_sync_total", {
        description: "Total number of menu synchronization operations",
        persist: true,
      }),
      menuSyncErrorCounter: telemetry.createCounter(
        "client_menu_sync_errors_total",
        {
          description: "Total number of menu synchronization errors",
          persist: true,
        }
      ),
      componentInstallCounter: telemetry.createCounter(
        "client_component_install_total",
        {
          description: "Total number of component installations",
          persist: true,
        }
      ),
      componentInstallDuration: telemetry.createHistogram(
        "client_component_install_duration_seconds",
        {
          description: "Duration of component installation operations",
          unit: "seconds",
          persist: true,
        }
      ),
      userCreationCounter: telemetry.createCounter("client_user_creation_total", {
        description: "Total number of users created during client configuration",
        persist: true,
      }),
      userCreationErrorCounter: telemetry.createCounter(
        "client_user_creation_errors_total",
        {
          description: "Total number of user creation errors",
          persist: true,
        }
      ),
    };
  } catch (error) {
    logger.debug("Failed to initialize client config telemetry", { error });
    return {};
  }
};

/**
 * Result of route synchronization operation
 */
interface RouteSyncResult {
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
  errors: Array<{ routeKey: string; error: any }>;
}

/**
 * Synchronize routes for a client configuration
 * This ensures routes in the config match exactly what's in the database
 */
const synchronizeRoutes = async (
  clientDocument: Reactory.Models.ReactoryClientDocument,
  configRoutes: Reactory.Routing.IReactoryRoute[],
  telemetry?: ClientConfigTelemetry
): Promise<RouteSyncResult> => {
  const startTime = Date.now();
  const result: RouteSyncResult = {
    added: 0,
    updated: 0,
    removed: 0,
    unchanged: 0,
    errors: [],
  };

  try {
    logger.info(
      `Synchronizing ${configRoutes.length} routes for client ${clientDocument.name}`
    );

    // Get existing routes from the document
    const existingRoutes = clientDocument.routes || [];
    const configRouteKeys = new Set(configRoutes.map((r) => r.key));
    const existingRouteMap = new Map(
      existingRoutes.map((r: any) => [r.key, r])
    );

    // Track which routes to keep
    const updatedRoutes: Reactory.Routing.IReactoryRoute[] = [];

    // Process each route from the configuration
    for (const configRoute of configRoutes) {
      const routeKey = configRoute.key || configRoute.path;

      if (!routeKey) {
        logger.warn("Route without key or path, skipping", { route: configRoute });
        result.errors.push({
          routeKey: "unknown",
          error: "Route missing key and path",
        });
        continue;
      }

      try {
        const existingRoute = existingRouteMap.get(routeKey);

        if (existingRoute) {
          // Check if route has changed
          const hasChanges = !isEqual(
            {
              ...existingRoute,
              // Exclude fields that might differ but aren't significant
              _id: undefined,
              id: undefined,
            },
            {
              ...configRoute,
              _id: undefined,
              id: undefined,
            }
          );

          if (hasChanges) {
            logger.debug(`Route ${routeKey} has changes, updating`);
            updatedRoutes.push({ ...configRoute, key: routeKey });
            result.updated++;
          } else {
            // Keep existing route as-is
            updatedRoutes.push(existingRoute as any);
            result.unchanged++;
          }
        } else {
          // New route
          logger.debug(`Adding new route ${routeKey}`);
          updatedRoutes.push({ ...configRoute, key: routeKey });
          result.added++;
        }
      } catch (routeError) {
        logger.error(`Error processing route ${routeKey}`, routeError);
        result.errors.push({ routeKey, error: routeError });
        if (telemetry?.routeSyncErrorCounter) {
          telemetry.routeSyncErrorCounter.add(1, {
            clientKey: clientDocument.key,
            routeKey,
            errorType: "processing_error",
          });
        }
      }
    }

    // Identify removed routes
    for (const [existingKey, existingRoute] of existingRouteMap) {
      if (!configRouteKeys.has(existingKey)) {
        logger.debug(`Route ${existingKey} removed from configuration`);
        result.removed++;
      }
    }

    // Update the client document with synchronized routes
    clientDocument.routes = updatedRoutes as any;

    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      `Route synchronization complete for ${clientDocument.name}: ` +
        `${result.added} added, ${result.updated} updated, ` +
        `${result.removed} removed, ${result.unchanged} unchanged, ` +
        `${result.errors.length} errors`,
      { duration }
    );

    if (telemetry?.routeSyncCounter) {
      telemetry.routeSyncCounter.add(1, {
        clientKey: clientDocument.key,
        added: result.added.toString(),
        updated: result.updated.toString(),
        removed: result.removed.toString(),
        hasErrors: (result.errors.length > 0).toString(),
      });
    }

    if (telemetry?.routeSyncDuration) {
      telemetry.routeSyncDuration.record(duration, {
        clientKey: clientDocument.key,
      });
    }

    return result;
  } catch (error) {
    logger.error(
      `Failed to synchronize routes for ${clientDocument.name}`,
      error
    );
    if (telemetry?.routeSyncErrorCounter) {
      telemetry.routeSyncErrorCounter.add(1, {
        clientKey: clientDocument.key,
        errorType: "sync_failed",
      });
    }
    throw error;
  }
};

/**
 * Comprehensive upsert operation for client configuration
 * Handles all aspects of client config including routes, menus, components, etc.
 */
const upsertFromConfig = async (
  clientConfig: Partial<Reactory.Models.IReactoryClient>,
  context?: Reactory.Server.IReactoryContext
): Promise<Reactory.Models.ReactoryClientDocument> => {
  const { key } = clientConfig;
  const startTime = Date.now();
  const telemetry = context ? initializeTelemetry(context) : {};

  logger.info(`Starting comprehensive upsert for client: ${key}`);

  try {
    // Prepare the input data
    const input = { ...clientConfig };
    delete input.menus;
    delete input.password;
    delete input.routes; // We'll handle routes separately

    // Find existing client
    let reactoryClient: Reactory.Models.ReactoryClientDocument =
      await ReactoryClientModel.findOne({ key }).then();

    const isNewClient = isNil(reactoryClient);

    if (!isNewClient) {
      try {
        logger.debug(`Updating existing client ${reactoryClient.name}`);

        // Update base fields
        Object.assign(reactoryClient, {
          ...input,
          updatedAt: new Date(),
        });

        // Explicitly mark complex/mixed fields as modified to ensure Mongoose saves them
        if (input.themes) reactoryClient.markModified('themes');
        if (input.auth_config) reactoryClient.markModified('auth_config');
        if (input.settings) reactoryClient.markModified('settings');
        if (input.whitelist) reactoryClient.markModified('whitelist');

        // Validate before saving
        const validationResult = reactoryClient.validateSync();
        if (validationResult && validationResult.errors) {
          logger.error("Validation errors during update", validationResult.errors);
          throw new ReactoryClientValidationError(
            "Could not validate the client update",
            validationResult
          );
        }

        logger.debug(`ReactoryClient ${reactoryClient.name} base fields updated`);
      } catch (upsertError) {
        logger.error("Error updating existing client record", upsertError);
        if (telemetry.clientUpsertErrorCounter) {
          telemetry.clientUpsertErrorCounter.add(1, {
            clientKey: key,
            operation: "update",
            errorType: "update_failed",
          });
        }
        throw upsertError;
      }
    } else {
      try {
        logger.info(`Creating new client ${clientConfig.name}`);
        //@ts-ignore
        reactoryClient = new ReactoryClientModel(input);
        const validationResult = reactoryClient.validateSync();
        if (validationResult && validationResult.errors) {
          logger.error("Validation errors during creation", validationResult.errors);
          throw new ReactoryClientValidationError(
            "Could not validate the new client",
            validationResult
          );
        }

        reactoryClient = await reactoryClient.save().then();
        logger.info(`New client ${reactoryClient.name} created successfully`);
      } catch (saveNewError) {
        logger.error("Could not save the new client data", saveNewError);
        if (telemetry.clientUpsertErrorCounter) {
          telemetry.clientUpsertErrorCounter.add(1, {
            clientKey: key,
            operation: "create",
            errorType: "creation_failed",
          });
        }
        throw saveNewError;
      }
    }

    // Synchronize routes
    if (clientConfig.routes && Array.isArray(clientConfig.routes)) {
      try {
        const routeSyncResult = await synchronizeRoutes(
          reactoryClient,
          clientConfig.routes as Reactory.Routing.IReactoryRoute[],
          telemetry
        );

        logger.info(
          `Route synchronization completed for ${reactoryClient.name}`,
          routeSyncResult
        );

        if (routeSyncResult.errors.length > 0) {
          logger.warn(
            `${routeSyncResult.errors.length} errors during route synchronization`,
            routeSyncResult.errors
          );
        }
      } catch (routeError) {
        logger.error("Failed to synchronize routes", routeError);
        // Don't throw - continue with other operations
      }
    } else {
      logger.debug(`No routes to synchronize for ${reactoryClient.name}`);
    }

    // Synchronize menus
    const menuDefs = clientConfig.menus || [];
    const menuRefs = [];
    logger.info(`Synchronizing ${menuDefs.length} menus for ${reactoryClient.name}`);

    for (const menuDef of menuDefs) {
      try {
        const menuFound = await Menu.findOneAndUpdate(
          { client: reactoryClient._id, key: menuDef.key },
          { ...menuDef, client: reactoryClient._id },
          { upsert: true, new: true }
        );

        if (menuFound && (menuFound as any)._id) {
          menuRefs.push((menuFound as any)._id);
          if (telemetry.menuSyncCounter) {
            telemetry.menuSyncCounter.add(1, {
              clientKey: key,
              menuKey: menuDef.key,
            });
          }
        }
      } catch (menuErr) {
        logger.error(`Error synchronizing menu ${menuDef.key}`, menuErr);
        if (telemetry.menuSyncErrorCounter) {
          telemetry.menuSyncErrorCounter.add(1, {
            clientKey: key,
            menuKey: menuDef.key,
          });
        }
      }
    }

    //@ts-ignore
    reactoryClient.menus = menuRefs;

    // Save the final document with all updates
    reactoryClient = await reactoryClient.save().then();

    const duration = (Date.now() - startTime) / 1000;

    logger.info(
      `Comprehensive upsert completed for ${reactoryClient.name} in ${duration.toFixed(2)}s`
    );

    if (telemetry.clientUpsertCounter) {
      telemetry.clientUpsertCounter.add(1, {
        clientKey: key,
        operation: isNewClient ? "create" : "update",
        success: "true",
      });
    }

    if (telemetry.clientUpsertDuration) {
      telemetry.clientUpsertDuration.record(duration, {
        clientKey: key,
        operation: isNewClient ? "create" : "update",
      });
    }

    return reactoryClient;
  } catch (error) {
    const duration = (Date.now() - startTime) / 1000;
    logger.error(
      `Comprehensive upsert failed for ${key} after ${duration.toFixed(2)}s`,
      error
    );

    if (telemetry.clientUpsertErrorCounter) {
      telemetry.clientUpsertErrorCounter.add(1, {
        clientKey: key,
        operation: "upsert",
        errorType: "general_failure",
      });
    }

    throw error;
  }
};

const onStartup = async (context: Reactory.Server.IReactoryContext) => {
  const startupStartTime = Date.now();
  const telemetry = initializeTelemetry(context);

  logger.info("Starting client configuration startup process");

  const userService = context.getService<Reactory.Service.IReactoryUserService>(
    "core.UserService@1.0.0"
  );

  /**
   * Load users for a client configuration
   * Returns an array of created users
   */
  const loadUsers = async (
    usersToLoad: Reactory.Server.IStaticallyLoadedUser[],
    partner: Reactory.Models.IReactoryClientDocument,
    telemetry: ClientConfigTelemetry
  ) => {
    const results = [];
    const errors = [];

    logger.info(`Loading ${usersToLoad.length} users for ${partner.name}`);

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
        errors.push({ email, error: "Missing required fields" });
        if (telemetry.userCreationErrorCounter) {
          telemetry.userCreationErrorCounter.add(1, {
            clientKey: partner.key,
            errorType: "missing_fields",
          });
        }
        continue;
      }

      try {
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
                  const teamsArray = organizationDocument.teams as any[];
                  const hasTeam = teamsArray.includes(teamDoc._id);
                  if (!hasTeam) {
                    teamsArray.push(teamDoc._id);
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
              const teamName = (team as any).name;
              const teamDoc = await orgService.findTeam(
                organizationDocument._id,
                teamName
              );
              if (teamDoc) {
                teamDocuments.push(teamDoc);
              } else {
                const newTeam = await orgService.createTeam(
                  organizationDocument._id,
                  teamName
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

        if (telemetry.userCreationCounter) {
          telemetry.userCreationCounter.add(1, {
            clientKey: partner.key,
            userEmail: email,
          });
        }
      } catch (userError) {
        logger.error(`Failed to create user ${email}`, userError);
        errors.push({ email, error: userError });
        if (telemetry.userCreationErrorCounter) {
          telemetry.userCreationErrorCounter.add(1, {
            clientKey: partner.key,
            errorType: "creation_failed",
            userEmail: email,
          });
        }
      }
    }

    if (errors.length > 0) {
      logger.warn(
        `${errors.length} user creation errors for ${partner.name}`,
        errors
      );
    }

    return results;
  };

  /**
   * Install/update components for a client
   */
  const installComponents = async (
    componentsArray: any[],
    clientKey: string,
    telemetry: ClientConfigTelemetry
  ) => {
    const startTime = Date.now();
    logger.info(`Installing ${componentsArray.length} components into reactory`);

    try {
      const reactoryComponents = [];
      const errors = [];

      for (const component of componentsArray) {
        try {
          const newComponentDef = {
            ...component,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          if (newComponentDef.author) {
            newComponentDef.author = await User.findOne({
              email: component.author,
            }); // eslint-disable-line
          }

          logger.debug(
            `Installing component ${component.nameSpace}.${component.name}@${component.version}`
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
            logger.debug(`Component ${nameSpace}.${name}@${version} created`);
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

            //@ts-ignore
            await componentObject.save();
            logger.debug(`Component ${nameSpace}.${name}@${version} updated`);
          }

          reactoryComponents.push(componentObject);

          if (telemetry.componentInstallCounter) {
            telemetry.componentInstallCounter.add(1, {
              clientKey,
              componentFqn: `${nameSpace}.${name}@${version}`,
              operation: isNil(componentObject) ? "create" : "update",
            });
          }
        } catch (componentError) {
          logger.error(
            `Error installing component ${component.nameSpace}.${component.name}@${component.version}`,
            componentError
          );
          errors.push({ component, error: componentError });
        }
      }

      const duration = (Date.now() - startTime) / 1000;
      logger.info(
        `Installed (${reactoryComponents.length}) components in ${duration.toFixed(2)}s`
      );

      if (telemetry.componentInstallDuration) {
        telemetry.componentInstallDuration.record(duration, {
          clientKey,
          componentCount: componentsArray.length.toString(),
        });
      }

      if (errors.length > 0) {
        logger.warn(`${errors.length} component installation errors`, errors);
      }

      return reactoryComponents;
    } catch (e) {
      logger.error(`Error while loading components ${e.message}`, e);
      return [];
    }
  };

  try {
    const clientsLoaded = [];
    const clientsFailed = [];

    logger.info(`Processing ${clients.length} client configurations`);

    for (const clientConfig of clients) {
      const clientStartTime = Date.now();
      logger.info(`Configuring client ${clientConfig.name} (${clientConfig.key})`);

      try {
        let componentIds: any[] = [];

        // Install components if present
        if (clientConfig.components && clientConfig.components!.length > 0) {
          componentIds = await installComponents(
            clientConfig.components,
            clientConfig.key,
            telemetry
          ).then();
          logger.info(
            `Installed (${componentIds.length}) components for client ${clientConfig.name}`
          );
        }

        // Prepare client data with components
        const clientDataWithComponents = {
          ...clientConfig,
          components: componentIds.map((c) => c._id),
        };

        // Use the comprehensive upsert function
        let reactoryClient = await upsertFromConfig(
          clientDataWithComponents,
          context
        );

        // Set password if provided
        if (clientConfig.password && reactoryClient._id) {
          reactoryClient.setPassword(clientConfig.password);
          await reactoryClient.save();
        }

        // Load users if present
        if (
          Array.isArray(clientConfig.users) === true &&
          clientConfig.users.length > 0
        ) {
          logger.info(
            `Loading (${clientConfig.users.length}) default users for ${reactoryClient.name}`
          );
          const defaultUsers = await loadUsers(
            clientConfig.users || [],
            reactoryClient as any,
            telemetry
          );
          logger.info(
            `Loaded (${defaultUsers.length}) default users for ${reactoryClient.name}`
          );
        }

        const clientDuration = (Date.now() - clientStartTime) / 1000;
        logger.info(
          `Client ${reactoryClient.name} configured successfully in ${clientDuration.toFixed(2)}s`
        );

        clientsLoaded.push(reactoryClient);
      } catch (clientError) {
        logger.error(`Failed to configure client ${clientConfig.name}`, clientError);
        clientsFailed.push({ clientConfig, error: clientError });

        if (telemetry.clientUpsertErrorCounter) {
          telemetry.clientUpsertErrorCounter.add(1, {
            clientKey: clientConfig.key,
            operation: "startup",
            errorType: "configuration_failed",
          });
        }
      }
    }

    const totalDuration = (Date.now() - startupStartTime) / 1000;
    logger.info(
      `Client startup process completed in ${totalDuration.toFixed(2)}s: ` +
        `${clientsLoaded.length} succeeded, ${clientsFailed.length} failed`
    );

    if (clientsFailed.length > 0) {
      logger.error("Failed client configurations:", clientsFailed);
    }

    return {
      clientsLoaded,
      clientsFailed,
    };
  } catch (ex) {
    logger.error("Critical error during client startup process", ex);
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
