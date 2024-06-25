import Reactory from "@reactory/reactory-core";

const { 
  REACTORY_APPLICATION_EMAIL = 'reactory@reactory.local', 
  REACTORY_APPLICATION_PASSWORD = 'reactory-password'
} = process.env;

const users: Reactory.Server.IStaticallyLoadedUser[] = [
  {
    email: REACTORY_APPLICATION_EMAIL,
    roles: ['ADMIN', 'DEVELOPER'],
    firstName: 'Reactory',
    lastName: 'Admin',
    username: 'reactory',
    password: REACTORY_APPLICATION_PASSWORD,
  }
]

export default users;