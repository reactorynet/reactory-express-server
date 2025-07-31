/**
 * IMPORTANT - do not use imports in this file!
 * It will break global definition.
 */
declare namespace NodeJS {
  export interface Global {
    REACTORY_SERVER_STARTUP: Date;
  }
}

declare module 'ssl-root-cas/latest' {
  const sslrootcas: any;
  export = sslrootcas;
}