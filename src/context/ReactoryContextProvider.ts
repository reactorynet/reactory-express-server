import { v4 as uuid } from "uuid";
import { getService, services, listServices } from "@reactory/server-core/services"; // eslint-disable-line
import logger from "@reactory/server-core/logging";
import Hash from "@reactory/server-core/utils/hash";
import { objectMapper } from "@reactory/server-core/utils";
import lodash, { has } from "lodash";
import colors from "colors/safe";
import { ReactoryContainer } from "@reactory/server-core/ioc";
import modules from "@reactory/server-core/modules";
import i18next, { t } from "i18next";
import Reactory, { React } from "@reactory/reactory-core";
import Cache from "@reactory/server-modules/core/models/CoreCache";
import { Container } from "inversify";

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

export class ReactoryContext implements Reactory.Server.IReactoryContext {
  id: string;
  user: Reactory.Models.IUserDocument;
  partner: Reactory.Models.IReactoryClientDocument;
  colors: unknown;
  lang: string;
  languages: string[];
  theme: Reactory.UX.IReactoryTheme;
  palette: Reactory.UX.IThemePalette;
  services: Reactory.Service.IReactoryService[];
  state: {
    [key: string]: unknown;
  };
  utils: any;
  session: any;
  response?: Express.Response;
  request?: Express.Request;
  i18n: typeof i18next;
  lng: string;
  langs: string[];
  modules: Reactory.Server.IReactoryModule[];
  container: Container;
  host: string | "cli" | "express"; 
  [key: string]: unknown;
  
  constructor(session: any, currentContext: Partial<Reactory.Server.IReactoryContext> = {}) {
    this.id = uuid();
    this.state = currentContext?.state || {};
    this.user = currentContext?.user || null;
    this.partner = currentContext?.partner || null;
    this.colors = currentContext?.colors || colors;
    this.session = currentContext?.session || session;
    this.services = currentContext?.services || services;
    this.request = currentContext?.request || null;
    this.response = currentContext?.response || null;
    this.i18n = currentContext?.i18n || i18next;
    this.lang = currentContext?.lang || process.env.DEFAULT_LOCALE || "en";
    this.languages = currentContext?.languages || [this.lang];
    this.theme = currentContext?.theme || null;
    this.modules = currentContext?.modules || modules.enabled;
    this.utils = {
      hash: Hash,
      lodash,
      objectMapper,
    }
    this.container = ReactoryContainer;
  }
  

  listServices(filter: Reactory.Server.ReactoryServiceFilter): Reactory.Service.IReactoryServiceDefinition<any>[] {
    return listServices(filter);
  }

  log(message: string, meta: any = null, type: Reactory.Service.LOG_TYPE = "debug", clazz: string = '') {
    const logMessage = `${message}`;
    switch (type) {
      case "e":
      case "err":
      case "error":
        logger.error(colors.red(logMessage), meta);
        break;
      case "w":
      case "warn":
      case "warning":
        logger.warn(colors.yellow(logMessage), meta);
        break;
      case "i":
      case "info":
        logger.info(colors.gray(logMessage), meta);
        break;
      case "d":
      case "deb":
      case "debug":
      default:
        logger.debug(colors.blue(logMessage), meta);
        break;
    }
  }

  debug(message: string, meta: any = null, clazz: string = '') {
    this.log(message, meta, "debug", clazz);
  }

  warn(message: string, meta: any = null, clazz: string = '') {
    this.log(message, meta, "warn", clazz);
  }

  error(message: string, meta: any = null, clazz: string = '') {
    this.log(message, meta, "error", clazz);
  }

  info(message: string, meta: any = null, clazz: string = '') {
    this.log(message, meta, "info", clazz);
  }

  getService<TService>(id: string, props: any = undefined, lifeCycle?: Reactory.Service.SERVICE_LIFECYCLE): TService {
    this.log(`Getting service ${id} [${lifeCycle || "instance"}]`);
    
    return getService(
      id,
      props,
      this,
      lifeCycle
    ) as TService;
  }

  hasRole(role: string, partner?: Reactory.Models.IPartner, organization?: Reactory.Models.IOrganizationDocument, businessUnit?: Reactory.Models.IBusinessUnitDocument):boolean {
    if (this.user && typeof this.user.hasRole === "function") {
      return this.user.hasRole(
        partner && partner._id ? partner._id : this.partner._id,
        role,
        organization && organization._id ? organization._id.toString() : undefined,
        businessUnit && businessUnit._id ? businessUnit._id.toString() : undefined
      );
    } else {
      return false;
    }
  };

  getValue<T>(key: string, defaultValue?: Promise<T>): Promise<T> {
    //@ts-ignore
    return Cache.getItem(key, false, this.partner) as Promise<T>;
  }

  setValue<T>(key: string, value: T, ttl?: number): Promise<void> {
    //@ts-ignore
    return Cache.setItem(key, value, ttl, this.partner);
  }

  removeValue(key: string): Promise<void> {
    Cache.deleteOne({ key, partner: this.partner._id }).exec();
    return Promise.resolve();
  }

  async extend<TResult extends Reactory.Server.IReactoryContext>(): Promise<TResult> { 
    if(this.partner) {
      const serviceName = this.partner.getSetting<string>("context-provider")
      if (serviceName.data) {
        const service = this.getService<Reactory.Server.IExecutionContextProvider>(serviceName.data);
        return await service.getContext(this) as TResult;      
      }
    }
    return this as unknown as TResult;
  }
}

const getContext = async <TResult extends Reactory.Server.IReactoryContext>(session: any, currentContext: Partial<Reactory.Server.IReactoryContext> = {}): Promise<Reactory.Server.IReactoryContext> => { 
  const context = new ReactoryContext(session, currentContext);
  return await context.extend<TResult>();
}

export default getContext;