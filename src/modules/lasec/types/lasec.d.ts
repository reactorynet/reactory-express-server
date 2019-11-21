declare namespace Lasec {

  /**
   * Meta type interface
   */
  export interface Meta {
    mustSync: boolean;
    lastSync: number;
    nextSync: number;
    reference: String;
    owner: String;
  }

  export interface Quote {
    id: String
    code: String
    meta: any
  }
}