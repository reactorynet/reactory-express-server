// import { Reactory } from "./reactory";

declare type IUser = import("@reactory/server-core/types/reactory").Reactory.IUser
declare type IPartner = import("@reactory/server-core/types/reactory").Reactory.IPartner
/**
 * IMPORTANT - do not use imports in this file!
 * It will break global definition.
 */
declare namespace NodeJS {
  export interface Global {
    user: IUser;
    partner: IPartner;
    REACTORY_SERVER_STARTUP: Date;
    getService: Function;
  }
}
declare var user: IUser;
declare var partner: IPartner;
declare var getService: Function;
 
