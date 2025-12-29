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
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.postgres.connection',
    componentFqn: 'core.PostgresConnectionForm@1.0.0',
    data: {
      host: REACTORY_POSTGRES_HOST,
      port: parseInt(REACTORY_POSTGRES_PORT),
      username: REACTORY_POSTGRES_USER,
      password: REACTORY_POSTGRES_PASSWORD,
      database: REACTORY_POSTGRES_DB,
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.prometheus.connection',
    componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
    data: {
      host: process.env.REACTORY_PROMETHEUS_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_PROMETHEUS_PORT || '9090'),
      protocol: process.env.REACTORY_PROMETHEUS_PROTOCOL || 'http',
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.redis.connection',
    componentFqn: 'reactory-cache.RedisConnectionForm@1.0.0',
    data: {
      host: process.env.REACTORY_REDIS_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_REDIS_PORT || '6379'),
      password: process.env.REACTORY_REDIS_PASSWORD || '',
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.loki.connection',
    componentFqn: 'reactory-telemetry.LokiConnectionForm@1.0.0',
    data: {
      host: process.env.REACTORY_LOKI_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_LOKI_PORT || '3100'),
      protocol: process.env.REACTORY_LOKI_PROTOCOL || 'http',
    },  
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.jaeger.connection',
    componentFqn: 'reactory-telemetry.JaegerConnectionForm@1.0.0',
    data: {
      host: process.env.REACTORY_JAEGER_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_JAEGER_PORT || '6831'),
      protocol: process.env.REACTORY_JAEGER_PROTOCOL || 'http',
    },  
    roles: ['ADMIN'],
  }
];