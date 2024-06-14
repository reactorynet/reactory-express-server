import { v4 as uuid } from "uuid";
import { getService, services, listServices } from "@reactory/server-core/services"; // eslint-disable-line
import logger from "@reactory/server-core/logging";
import Hash from "@reactory/server-core/utils/hash";
import { objectMapper } from "@reactory/server-core/utils";
import lodash, { isArray } from "lodash";
import colors from "colors/safe";
import { ReactoryContainer } from "@reactory/server-core/ioc";
import modules from "@reactory/server-core/modules";
import i18next, { t } from "i18next";
import Reactory from "@reactory/reactory-core";
import { scrubEmail } from "@reactory/server-core/utils/string";
import Cache from "@reactory/server-modules/core/models/CoreCache";

colors.setTheme({
  silly: "rainbow",
  input: "grey",
  verbose: "cyan",
  prompt: "grey",
  info: "green",
  data: "grey",
  help: "cyan",
  warn: "yellow",
  debug: "blue",
  error: "red",
});
/***
 * The Reactory Context Provider creates a context
 * for the execution thread which is passed through with each request
 * and response. The context provider is the the primary
 * interaction point for the application and the services.
 *
 * It acts as a micro container for the application and provides
 * a set of services and utilities that can be used by the application
 *
 * The graph and REST API are built on top of the context provider.
 */
export default async <TC extends Reactory.Server.IReactoryContext>(
  $session: any,
  currentContext: Partial<TC> = {}
): Promise<TC> => {
  const $id = uuid();
  const context_state = {};
  let $context: Partial<TC> = currentContext || {};    
  
  const $log = (
    message: string,
    meta: any = null,
    type: Reactory.Service.LOG_TYPE = "debug",
    clazz: string = ''
  ) => {
    const $message = `${message}`;
    switch (type) {
      case "e":
      case "err":
      case "error": {
        logger.error(colors.red($message), meta);
        break;
      }
      case "w":
      case "warn":
      case "warning": {
        logger.warn(colors.yellow($message), meta);
        break;
      }
      case "i":
      case "info": {
        logger.warn(colors.gray($message), meta);
        break;
      }
      case "d":
      case "deb":
      case "debug":
      default: {
        logger.debug(colors.blue($message), meta);
      }
    }
  };

  const $debug = (
    message: string,
    meta: any = null,
    clazz: string = ''
  ) => {
    $log(message, meta, "debug", clazz);
  };

  const $warn = (
    message: string,
    meta: any = null,
    clazz: string = ''
  ) => {
    $log(message, meta, "warn", clazz);
  };

  const $error = (
    message: string,
    meta: any = null,
    clazz: string = ''
  ) => {
    $log(message, meta, "error", clazz);
  };

  const $info = (
    message: string,
    meta: any = null,
    clazz: string = ''
  ) => {
    $log(message, meta, "info", clazz);
  };

  let $user: Reactory.Models.IUserDocument = $context.user
    ? $context.user
    : null;
  let $partner: Reactory.Models.TReactoryClient = $context.partner
    ? $context.partner
    : null;
  let $request = null;
  let $response = null;
  let $i18n: typeof i18next = null;
  let $lng: string = process.env.DEFAULT_LOCALE || "en";
  let $langs: string[] = [$lng];
  //if the context is being used in the context of a session
  if ($session !== null && $session !== undefined) {
    $user = $session.req.user;
    $partner = $session.req.partner;
    $request = $session.req;
    $response = $session.res;    
    $i18n = $session.req.i18n;
    $lng = $session.req.langauage;
    $langs = $session.req.langauages;
  } else {
    if (!$context)
      throw new Error(
        `No context provided to the context provider while using outside of a session`
      );
    $i18n = i18next;
    $partner = $context.partner;
    //@ts-ignore
    $lng = $context.lng;
    $langs = $context.langs;
    //@ts-ignore
    $user = $context.user;
  }

  let theme: Reactory.UX.IReactoryTheme = null;

  if ($partner?.themes && isArray($partner?.themes) === true) {
    $partner.themes.forEach((t: Reactory.UX.IReactoryTheme) => {
      if (t.name == $partner.theme) {
        theme = t;
      }
    });
  }

  let palette: Reactory.UX.IThemePalette = null;

  if (theme && theme.modes) {
    theme.modes.forEach((themeMode) => {
      if (themeMode.mode === theme.defaultThemeMode) {
        palette = themeMode.options.palette;
      }
    });
  }

  /**
   * The Reactory Context Provider is the base provider and
   * can be considerd as the component and user container for the
   * duration of the exection.
   */
  let newContext: Partial<TC> = {
    ...$context,
    id: $id,
    user: $user,
    partner: $partner,
    $request,
    $response,
    i18n: $i18n,
    lng: $lng,
    langs: $langs,
    modules: modules.enabled,
    container: ReactoryContainer,
    log: $log,
    info: $info,
    warn: $warn,
    debug: $debug,
    error: $error,
    hasRole: (
      role: string,
      partner?: Reactory.Models.IReactoryClient,
      organization?: Reactory.Models.IOrganizationDocument,
      businessUnit?: Reactory.Models.IBusinessUnitDocument
    ) => {
      if ($session.req.user === null || $session.req.user === undefined) {
        return false;
      }

      if ($session.req.user && $session.req.user.hasRole) {
        return $session.req.user.hasRole(
          partner && partner._id ? partner._id : $session.req.partner._id,
          role,
          organization && organization._id ? organization._id : undefined,
          businessUnit && businessUnit._id ? businessUnit._id : undefined
        );
      } else {
        return false;
      }
    },
    utils: {
      hash: Hash,
      objectMapper,
      lodash,
    },
    colors,
    state: context_state,
    theme,
    palette,
    services,
  };

  /**
   * Internal function wrapper for getting a service from the service registry
   * @param id
   * @param props
   * @param $context
   * @param lifeCycle
   * @returns
   */
  const $getService = <TService>(
    id: string,
    props: any = undefined,
    $context?: Reactory.Server.IReactoryContext,
    lifeCycle?: Reactory.Service.SERVICE_LIFECYCLE
  ): TService => {
    $log(`Getting service ${id} [${lifeCycle || "instance"}]`);
    if ($context && Object.keys($context).length > 0) {
      newContext = {
        ...newContext,
        ...$context,
      };
    }

    return getService(
      id,
      props,
      {
        ...newContext,
        getService: $getService,
      } as TC,
      lifeCycle
    );
  };

  newContext.getService = $getService;

  if (
    $session !== null &&
    $session !== undefined &&
    $session.req !== null &&
    $session.req !== undefined
  ) {
    $session.req.context = newContext;
  }

  if ($partner && $partner.getSetting) {
    /**
     * We check in the configuration settings if there is a "execution_context_service" key.
     * if the key is found and if it is a string with an @ in the indicator then we can assume
     * this is specific provider for the partner which will extend / overwrite elements of the
     * context provider.
     */
    const executionContextServiceName = newContext.partner.getSetting<string>(
      "execution_context_service"
    );
    if (
      executionContextServiceName &&
      executionContextServiceName.data &&
      `${executionContextServiceName.data}`.indexOf("@") > 0
    ) {
      const partnerContextService: Reactory.Server.IExecutionContextProvider =
        $getService(executionContextServiceName.data);
      if (
        partnerContextService &&
        typeof partnerContextService.getContext === "function"
      ) {
        newContext = await partnerContextService.getContext(newContext as Reactory.Server.IReactoryContext).then();
      }
    }
  }

  const getValue = async <T>(key: string): Promise<T> => {
    // @ts-ignore
    return (await Cache.getItem(key, false, newContext)) as T;
  };

  const setValue = async <T>(
    key: string,
    value: T,
    ttl?: number
  ): Promise<void> => {
    // @ts-ignore
    return await Cache.setItem(key, value, ttl, newContext.partner);
  };

  const removeValue = async (key: string): Promise<void> => {
    await Cache.deleteOne({ key, partner: newContext.partner._id }).exec();
  };

  newContext.getValue = getValue;
  newContext.setValue = setValue;
  newContext.removeValue = removeValue;
  newContext.listServices = listServices;
  return newContext as TC;
};
