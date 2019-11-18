declare namespace Reactory {

  export interface IAuthentication {
    provider: string
    props: any
    lastLogin: Date
  }

  export interface IPartner {
    key: string
    name: string
  }

  export interface IMemberShip {
    clientId: string | any
    organizationId: string | any
    businessUnitId: string | any
    enabled: boolean
    authProvider: string
    providerId: string
    lastLogin: Date
    roles: [String]
  }

  export interface IUser {
    id: string | any,
    email: string
    firstName: string
    lastName: string
    fullName(email: boolean): string
    addRole(clientId: string, role: string, organizationId: string, businessUnitId: string): boolean
    removeRole(clientId: string, role: string, organizationId: string): IMemberShip[],
    removeAuthentication(provider: string): boolean
    getAuthentication(provider: string): IAuthentication
  }
}
