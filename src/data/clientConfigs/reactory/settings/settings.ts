import RouteAccessSetting from './routeAccess';
import {
  mongoConnectionSettings,
  postgresConnectionSettings,
} from '@reactory/server-core/database/connectionOptions';

/**
 * Connection defaults are derived from the same module the server's own data
 * access uses (src/database/connectionOptions.ts), so a fresh install cannot be
 * minted with a connection setting that points somewhere else.
 *
 * The MongoDB setting previously read `REACTORY_MONGO_DB || 'reactory'` while
 * the server runs from the `MONGOOSE` URI and `.env` ships `MONGO_DB`. Nothing
 * set `REACTORY_MONGO_DB`, so the setting silently resolved to the database
 * `reactory` while the server ran against `reactory-reactory`. Anyone using the
 * setting to inspect templates saw an empty database and concluded they were
 * missing. `mongoConnectionSettings` reads the URI first, exactly as the server
 * does; `REACTORY_MONGO_*` still overrides field by field.
 *
 * Note: this fixes the DEFAULTS. An existing install carries the resolved value
 * in `reactory_clients`, which is data, not code — see the repair note in this
 * ticket's completion report.
 */
const mongoConnection = mongoConnectionSettings();
const postgresConnection = postgresConnectionSettings();

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
    title: "Reactory Default MongoDB Connection",
    name: "reactory.mongodb.connection",
    componentFqn: "core.MongoConnectionForm@1.0.0",
    settingType: "connection",
    variant: "mongodb",
    data: { ...mongoConnection },
    roles: ['ADMIN'],
  },
  {
    title: 'Reactory Default Postgres Connection',
    name: 'reactory.postgres.connection',
    componentFqn: 'core.PostgresConnectionForm@1.0.0',
    settingType: 'connection',
    variant: 'postgres',
    data: { ...postgresConnection },
    roles: ['ADMIN'],
  },
  {
    title: 'Reactory Default Prometheus Connection',
    name: 'reactory.prometheus.connection',
    componentFqn: 'reactory-telemetry.PrometheusConnectionForm@1.0.0',
    settingType: 'connection',
    variant: 'prometheus',
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
    settingType: 'connection',
    variant: 'redis',
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
    settingType: 'connection',
    variant: 'loki',
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
    settingType: 'connection',
    variant: 'jaeger',
    data: {
      host: process.env.REACTORY_JAEGER_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_JAEGER_PORT || '6831'),
      protocol: process.env.REACTORY_JAEGER_PROTOCOL || 'http',
    },
    roles: ['ADMIN'],
  },
  {
    name: 'reactory.grafana.connection',
    componentFqn: 'reactory-telemetry.GrafanaConnectionForm@1.0.0',
    settingType: 'connection',
    variant: 'grafana',
    data: {
      host: process.env.REACTORY_GRAFANA_HOST || 'localhost',
      port: parseInt(process.env.REACTORY_GRAFANA_PORT || '3000'),
      protocol: process.env.REACTORY_GRAFANA_PROTOCOL || 'http',
      // Grafana service-account token for the dashboard import API
      token: process.env.REACTORY_GRAFANA_TOKEN || '',
    },
    roles: ['ADMIN'],
  },
  // Route exemptions and per-route IP allow-lists. Consumed by the tenant-auth
  // and CORS middleware via src/express/routeAccess.ts.
  RouteAccessSetting,
];