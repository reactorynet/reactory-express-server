/**
 * Connection settings for the platform's own databases (WP-B4).
 *
 * One place decides how the server reaches Postgres and MongoDB, so that
 * postgres.js, the TypeORM data sources (runtime and migration CLI), the
 * workflow persistence providers and Mongoose cannot drift apart. Before this,
 * none of them set TLS, which Aurora (`rds.force_ssl=1`) and DocumentDB refuse,
 * and postgres.js read only REACTORY_POSTGRES_* while every TypeORM data
 * source also fell back to POSTGRES_*.
 *
 * Postgres:
 *   REACTORY_POSTGRES_SSL      disable (default) | require | verify-full
 *                              require: encrypted, certificate not checked.
 *                              verify-full: certificate chain and host name
 *                              checked (Aurora in production).
 *   REACTORY_POSTGRES_CA_FILE  PEM bundle to trust instead of the system CAs,
 *                              e.g. the Amazon RDS global-bundle.pem.
 *   A data source with its own prefix (CLASSROOM_) reads <PREFIX>_POSTGRES_*
 *   first, for the connection and for SSL.
 *
 * MongoDB (DocumentDB):
 *   REACTORY_MONGO_TLS           true | false
 *   REACTORY_MONGO_CA_FILE       PEM bundle (tlsCAFile)
 *   REACTORY_MONGO_RETRY_WRITES  true | false; DocumentDB needs false
 *   Each is applied only when set, so settings already in the MONGOOSE URI
 *   (`?tls=true&retryWrites=false`, as the terraform output writes it) keep
 *   working. The driver lets these options override the URI.
 *
 * Invalid values throw: a typo must not silently downgrade to plain text.
 *
 * Loaded by the TypeORM CLI through the migration data sources, so relative
 * imports only.
 */
import fs from 'fs';
import { checkServerIdentity } from 'tls';
import type { ConnectionOptions as TlsConnectionOptions } from 'tls';

type Env = Record<string, string | undefined>;

export type PostgresSslMode = 'disable' | 'require' | 'verify-full';

const SSL_MODES: PostgresSslMode[] = ['disable', 'require', 'verify-full'];

export interface PostgresConnectionSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export class ConnectionOptionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionOptionsError';
  }
}

/** First non-empty value. */
const first = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => value !== undefined && value.trim() !== '');

const readCaFile = (name: string, path: string): string => {
  try {
    return fs.readFileSync(path, 'utf8');
  } catch (error) {
    throw new ConnectionOptionsError(`${name}=${path} cannot be read: ${(error as Error).message}`);
  }
};

const parseBoolean = (name: string, value: string | undefined): boolean | undefined => {
  if (value === undefined || value.trim() === '') return undefined;
  const normalised = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalised)) return true;
  if (['false', '0', 'no'].includes(normalised)) return false;
  throw new ConnectionOptionsError(`${name} must be true or false, got "${value}"`);
};

/**
 * Host, port, credentials and database. `<prefix>_POSTGRES_*` first, then
 * `REACTORY_POSTGRES_*`, then the `POSTGRES_*` names the env files ship with.
 */
export const postgresConnectionSettings = (
  env: Env = process.env,
  prefix?: string,
): PostgresConnectionSettings => {
  const own = (key: string) => (prefix ? env[`${prefix}_POSTGRES_${key}`] : undefined);
  return {
    host: first(own('HOST'), env.REACTORY_POSTGRES_HOST, env.POSTGRES_DB_HOST) || 'localhost',
    port: parseInt(first(own('PORT'), env.REACTORY_POSTGRES_PORT, env.POSTGRES_DB_PORT) || '5432', 10),
    username: first(own('USER'), env.REACTORY_POSTGRES_USER, env.POSTGRES_USER) || 'reactory',
    password: first(own('PASSWORD'), env.REACTORY_POSTGRES_PASSWORD, env.POSTGRES_PASSWORD) || 'reactory',
    database: first(own('DB'), env.REACTORY_POSTGRES_DB, env.POSTGRES_DB) || 'reactory',
  };
};

export const postgresSslMode = (env: Env = process.env, prefix?: string): PostgresSslMode => {
  const name = prefix && first(env[`${prefix}_POSTGRES_SSL`]) ? `${prefix}_POSTGRES_SSL` : 'REACTORY_POSTGRES_SSL';
  const raw = first(env[name]);
  if (!raw) return 'disable';
  const mode = raw.trim().toLowerCase() as PostgresSslMode;
  if (!SSL_MODES.includes(mode)) {
    throw new ConnectionOptionsError(`${name} must be one of ${SSL_MODES.join(', ')}, got "${raw}"`);
  }
  return mode;
};

/**
 * The TLS options for a Postgres connection, or `false` for plain text. The
 * same object suits pg (TypeORM, Sequelize) and postgres.js.
 *
 * verify-full pins the host-name check to the host actually connected to. pg
 * and postgres.js give `tls.connect` an existing socket and set `servername`
 * only for DNS names, so for an IP address Node checked the certificate
 * against its default, "localhost", and accepted a certificate for the wrong
 * server. `host` overrides the configured host, for a connection URL that
 * names a different one.
 */
export const postgresTlsOptions = (
  env: Env = process.env,
  prefix?: string,
  host: string = postgresConnectionSettings(env, prefix).host,
): false | TlsConnectionOptions => {
  const mode = postgresSslMode(env, prefix);
  if (mode === 'disable') return false;

  const caName = prefix && first(env[`${prefix}_POSTGRES_CA_FILE`]) ? `${prefix}_POSTGRES_CA_FILE` : 'REACTORY_POSTGRES_CA_FILE';
  const caFile = first(env[caName]);
  const tls: TlsConnectionOptions = { rejectUnauthorized: mode === 'verify-full' };
  if (caFile) tls.ca = readCaFile(caName, caFile);
  if (mode === 'verify-full') tls.checkServerIdentity = (_servername, cert) => checkServerIdentity(host, cert);
  return tls;
};

/** Connection and `ssl` for a TypeORM postgres DataSource. */
export const typeormPostgresOptions = (env: Env = process.env, prefix?: string) => ({
  ...postgresConnectionSettings(env, prefix),
  ssl: postgresTlsOptions(env, prefix),
});

/** Options for `postgres()` (postgres.js). */
export const postgresJsOptions = (env: Env = process.env) => {
  const { host, port, username, password, database } = postgresConnectionSettings(env);
  return { host, port, username, password, database, ssl: postgresTlsOptions(env) };
};

/**
 * A `postgres://` URL for consumers that take one (the workflow persistence).
 * TLS is not in the URL; pass `sequelizePostgresOptions` alongside it.
 */
export const postgresUrl = (env: Env = process.env): string => {
  const { host, port, username, password, database } = postgresConnectionSettings(env);
  return `postgres://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
};

/**
 * Sequelize options carrying the TLS settings (workflow-es-postgres), for the
 * host in `url` when one is given.
 */
export const sequelizePostgresOptions = (env: Env = process.env, url?: string) => {
  // URL.hostname keeps the brackets of an IPv6 address; the identity check does not want them.
  const host = url ? new URL(url).hostname.replace(/^\[|\]$/g, '') : undefined;
  const ssl = postgresTlsOptions(env, undefined, host);
  return ssl ? { dialectOptions: { ssl } } : {};
};

export interface MongoTlsClientOptions {
  tls?: boolean;
  tlsCAFile?: string;
  retryWrites?: boolean;
}

/**
 * MongoClient / Mongoose options. Only the keys whose variable is set are
 * returned, so the connection string stays in charge otherwise.
 */
export const mongoClientOptions = (env: Env = process.env): MongoTlsClientOptions => {
  const options: MongoTlsClientOptions = {};

  const tls = parseBoolean('REACTORY_MONGO_TLS', env.REACTORY_MONGO_TLS);
  if (tls !== undefined) options.tls = tls;

  const caFile = first(env.REACTORY_MONGO_CA_FILE);
  if (caFile) {
    // Read now so a wrong path fails at boot with the variable's name, not as a
    // TLS handshake error from the driver.
    readCaFile('REACTORY_MONGO_CA_FILE', caFile);
    options.tlsCAFile = caFile;
    if (options.tls === undefined) options.tls = true;
  }

  const retryWrites = parseBoolean('REACTORY_MONGO_RETRY_WRITES', env.REACTORY_MONGO_RETRY_WRITES);
  if (retryWrites !== undefined) options.retryWrites = retryWrites;

  return options;
};

export interface MongoConnectionSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  /**
   * Driver options the URI carries that the flat connection setting cannot
   * express. `authSource` matters: a user created in `admin` cannot authenticate
   * against a URI whose auth source defaults to the target database.
   */
  options?: Record<string, any>;
}

/**
 * The pieces of a `mongodb://` URI that describe where the server connects.
 * Returns `{}` (not an error) for an absent or unparseable URI: this feeds a
 * settings default, and a malformed MONGOOSE would already have failed at boot.
 * Multi-host replica-set URIs are not understood and fall through to the
 * explicit variables or the defaults.
 */
const parseMongoUri = (uri?: string): Partial<MongoConnectionSettings> => {
  const raw = first(uri);
  if (!raw) return {};

  try {
    const url = new URL(raw);
    const path = url.pathname.replace(/^\/+/, '');
    const database = path.split('/')[0];

    return {
      host: url.hostname || undefined,
      port: url.port ? parseInt(url.port, 10) : undefined,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: database ? decodeURIComponent(database) : undefined,
    };
  } catch {
    return {};
  }
};

/**
 * The `authSource` query parameter of a `mongodb://` URI, if any. It lives
 * outside `parseMongoUri` because it belongs in the driver options, not in the
 * flat host/port/credentials shape.
 */
const readAuthSource = (uri?: string): string | undefined => {
  const raw = first(uri);
  if (!raw) return undefined;

  try {
    return first(new URL(raw).searchParams.get('authSource') || undefined);
  } catch {
    return undefined;
  }
};

/**
 * Host, port, credentials and database for MongoDB, from the same source of
 * truth the server uses.
 *
 * Precedence is per field: `REACTORY_MONGO_*` (an explicit setting override),
 * then the `MONGOOSE` URI the server actually opens, then the loose `MONGO_*`
 * names, then the historical defaults. The database in the URI wins over
 * `MONGO_DB` on purpose: the URI is what Mongoose connects with, so a settings
 * default derived from anything else can point at a different, empty database.
 * That is exactly how `reactory.mongodb.connection` came to name `reactory`
 * while the server was running against `reactory-reactory`.
 */
export const mongoConnectionSettings = (
  env: Env = process.env,
  uri: string | undefined = env.MONGOOSE,
): MongoConnectionSettings => {
  const fromUri = parseMongoUri(uri);
  const port = first(
    env.REACTORY_MONGO_PORT,
    fromUri.port ? String(fromUri.port) : undefined,
    env.MONGO_PORT,
  );
  const authSource = readAuthSource(uri);

  const settings: MongoConnectionSettings = {
    host: first(env.REACTORY_MONGO_HOST, fromUri.host, env.MONGO_HOST) || 'localhost',
    port: parseInt(port || '27017', 10),
    username: first(env.REACTORY_MONGO_USER, fromUri.username, env.MONGO_USER) || '',
    password: first(env.REACTORY_MONGO_PASSWORD, fromUri.password, env.MONGO_PASSWORD) || '',
    database: first(env.REACTORY_MONGO_DB, fromUri.database, env.MONGO_DB) || 'reactory',
  };

  // Only present when the URI names one, so a default install keeps the driver
  // behaviour (auth source = the database being connected to).
  if (authSource) settings.options = { authSource };

  return settings;
};

/** A one-line description for the startup log, without credentials. */
export const describeConnectionSecurity = (env: Env = process.env): string => {
  const mongo = mongoClientOptions(env);
  const mongoTls = mongo.tls === undefined ? 'from URI' : String(mongo.tls);
  const retry = mongo.retryWrites === undefined ? 'from URI' : String(mongo.retryWrites);
  return `postgres ssl=${postgresSslMode(env)}${first(env.REACTORY_POSTGRES_CA_FILE) ? ' (custom CA)' : ''}; ` +
    `mongo tls=${mongoTls}${mongo.tlsCAFile ? ' (custom CA)' : ''}, retryWrites=${retry}`;
};
