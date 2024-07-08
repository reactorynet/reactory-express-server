const {
  REACTORY_POSTGRES_USER = 'reactory',
  REACTORY_POSTGRES_PASSWORD = 'reactory',
  REACTORY_POSTGRES_DB = 'reactory',
  REACTORY_POSTGRES_HOST = 'localhost',
  REACTORY_POSTGRES_PORT = '5432',
} = process.env;

export default [
  {
    name: 'new_user_roles',
    componentFqn: 'core.Setting@1.0.0',
    formSchema: {
      type: 'string',
      title: 'Default User Role',
      description: 'The default user role to assign to a new user',
    },
    data: ['USER'],
  },
  {
    name: 'reactory.postgres.connection',
    componentFqn: 'core.PostgresConnectionForm@1.0.0',
    data: {
      host: REACTORY_POSTGRES_HOST,
      port: 5432,
      username: REACTORY_POSTGRES_USER,
      password: REACTORY_POSTGRES_PASSWORD,
      database: REACTORY_POSTGRES_DB,
    },
  }
];