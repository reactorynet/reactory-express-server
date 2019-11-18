/**
 * IMPORTANT - do not use imports in this file!
 * It will break global definition.
 */
declare namespace NodeJS {
  export interface Global {
      user: Reactory.IUser;
      partner: Reactory.IPartner;
  }
}

declare var user: Reactory.IUser;
declare var partner: Reactory.IPartner;