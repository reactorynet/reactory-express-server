import Reactory from "@reactory/reactory-core";

const { 
  REACTORY_APPLICATION_EMAIL = 'reactory@reactory.local', 
  REACTORY_APPLICATION_PASSWORD = 'reactory-password',
  REACTORY_APPLICATION_ANONUSER_EMAIL = 'anonymous@reactory.local',
  REACTORY_APPLICATION_ANONUSER_PASSWORD = 'anonymous-password',
} = process.env;

const users: Reactory.Server.IStaticallyLoadedUser[] = [
  {
    email: REACTORY_APPLICATION_ANONUSER_EMAIL,
    roles: ['ANON'],
    firstName: 'Anonymous',
    lastName: 'User',
    username: 'anonymous',
    password: REACTORY_APPLICATION_ANONUSER_PASSWORD,
  },
  {
    email: REACTORY_APPLICATION_EMAIL,
    roles: ['ADMIN', 'DEVELOPER'],
    firstName: 'Reactory',
    lastName: 'Admin',
    username: 'reactory',
    password: REACTORY_APPLICATION_PASSWORD,
  }
];

export default users;