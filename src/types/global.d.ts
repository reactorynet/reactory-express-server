// import { Reactory } from "./reactory";

/**
 * IMPORTANT - do not use imports in this file!
 * It will break global definition.
 */
declare namespace NodeJS {
  export interface Global {
    user: Reactory.IUser;
    partner: Reactory.IPartner;
    REACTORY_SERVER_STARTUP: Date;
    getService: Function;
  }
}
declare var user: Reactory.IUser;
declare var partner: Reactory.IPartner;
declare var getService: Function;
declare module 'human-number';
  // declare module 'object-mapper';
