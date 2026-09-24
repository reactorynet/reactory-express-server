import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ConnectionOptionsError,
  describeConnectionSecurity,
  mongoClientOptions,
  postgresConnectionSettings,
  postgresJsOptions,
  postgresTlsOptions,
  postgresUrl,
  sequelizePostgresOptions,
  typeormPostgresOptions,
} from '../connectionOptions';

describe('connectionOptions (WP-B4)', () => {
  let caFile: string;

  beforeAll(() => {
    caFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'conn-opts-')), 'ca.pem');
    fs.writeFileSync(caFile, '-----BEGIN CERTIFICATE-----\nfixture\n-----END CERTIFICATE-----\n');
  });

  describe('postgres connection settings', () => {
    it('prefers REACTORY_POSTGRES_* and falls back to the POSTGRES_* names the env files use', () => {
      expect(postgresConnectionSettings({
        POSTGRES_DB_HOST: 'db', POSTGRES_DB_PORT: '6543', POSTGRES_USER: 'u', POSTGRES_PASSWORD: 'p', POSTGRES_DB: 'd',
      })).toEqual({ host: 'db', port: 6543, username: 'u', password: 'p', database: 'd' });

      expect(postgresConnectionSettings({ REACTORY_POSTGRES_HOST: 'aurora', POSTGRES_DB_HOST: 'db' }).host).toBe('aurora');
    });

    it('reads a data source prefix first', () => {
      const env = { CLASSROOM_POSTGRES_DB: 'classroom', REACTORY_POSTGRES_DB: 'reactory', REACTORY_POSTGRES_HOST: 'h' };
      expect(postgresConnectionSettings(env, 'CLASSROOM')).toMatchObject({ database: 'classroom', host: 'h' });
    });

    it('gives postgres.js the same fallbacks as TypeORM', () => {
      // postgres.js used to read REACTORY_POSTGRES_* only, so in development it
      // authenticated with the literal default password.
      const env = { POSTGRES_PASSWORD: 'from-env-file' };
      expect(postgresJsOptions(env).password).toBe('from-env-file');
      expect(typeormPostgresOptions(env).password).toBe('from-env-file');
    });

    it('builds an encoded URL', () => {
      expect(postgresUrl({ POSTGRES_USER: 'a b', POSTGRES_PASSWORD: 'p@ss', POSTGRES_DB_HOST: 'h', POSTGRES_DB: 'd' }))
        .toBe('postgres://a%20b:p%40ss@h:5432/d');
    });
  });

  describe('postgres TLS', () => {
    it('is off by default', () => {
      expect(postgresTlsOptions({})).toBe(false);
      expect(typeormPostgresOptions({}).ssl).toBe(false);
      expect(sequelizePostgresOptions({})).toEqual({});
    });

    it('require encrypts without verifying the certificate', () => {
      expect(postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'require' })).toEqual({ rejectUnauthorized: false });
    });

    it('verify-full verifies, with the CA bundle when one is given', () => {
      expect(postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify-full' })).toMatchObject({ rejectUnauthorized: true });
      const tls = postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'VERIFY-FULL', REACTORY_POSTGRES_CA_FILE: caFile });
      expect(tls).toMatchObject({ rejectUnauthorized: true, ca: expect.stringContaining('BEGIN CERTIFICATE') });
    });

    it('applies the same TLS to every consumer', () => {
      const env = { REACTORY_POSTGRES_SSL: 'verify-full' };
      expect(postgresJsOptions(env).ssl).toMatchObject({ rejectUnauthorized: true });
      expect(typeormPostgresOptions(env).ssl).toMatchObject({ rejectUnauthorized: true });
      expect(sequelizePostgresOptions(env)).toMatchObject({ dialectOptions: { ssl: { rejectUnauthorized: true } } });
    });

    describe('verify-full host-name check', () => {
      // pg and postgres.js leave `servername` unset for an IP address, so Node
      // used to check the certificate against "localhost" instead.
      const localhostCert: any = { subject: { CN: 'localhost' }, subjectaltname: 'DNS:localhost' };
      const identity = (env: Record<string, string>, url?: string) => {
        const tls = url ? (sequelizePostgresOptions(env, url) as any).dialectOptions.ssl : postgresTlsOptions(env);
        return tls.checkServerIdentity('ignored-servername', localhostCert);
      };

      it('checks the configured host, not the default', () => {
        expect(identity({ REACTORY_POSTGRES_SSL: 'verify-full', REACTORY_POSTGRES_HOST: 'localhost' })).toBeUndefined();
        expect(identity({ REACTORY_POSTGRES_SSL: 'verify-full', REACTORY_POSTGRES_HOST: '127.0.0.1' })?.message).toMatch(/127\.0\.0\.1/);
      });

      it('checks the host of a connection URL', () => {
        const env = { REACTORY_POSTGRES_SSL: 'verify-full', REACTORY_POSTGRES_HOST: 'localhost' };
        expect(identity(env, 'postgres://u:p@localhost:5432/d')).toBeUndefined();
        expect(identity(env, 'postgres://u:p@10.0.0.9:5432/d')?.message).toMatch(/10\.0\.0\.9/);
      });

      it('is not added for require', () => {
        expect(postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'require' })).toEqual({ rejectUnauthorized: false });
      });
    });

    it('lets a prefixed data source set its own mode, else inherits', () => {
      expect(postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify-full' }, 'CLASSROOM')).toMatchObject({ rejectUnauthorized: true });
      expect(postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify-full', CLASSROOM_POSTGRES_SSL: 'disable' }, 'CLASSROOM')).toBe(false);
    });

    it('refuses an unknown mode instead of falling back to plain text', () => {
      expect(() => postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify_full' })).toThrow(ConnectionOptionsError);
      expect(() => postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify_full' })).toThrow(/REACTORY_POSTGRES_SSL/);
    });

    it('names the variable when the CA file cannot be read', () => {
      expect(() => postgresTlsOptions({ REACTORY_POSTGRES_SSL: 'verify-full', REACTORY_POSTGRES_CA_FILE: '/nope.pem' }))
        .toThrow(/REACTORY_POSTGRES_CA_FILE=\/nope\.pem/);
    });
  });

  describe('mongo', () => {
    it('sets nothing when no variable is set, leaving the URI in charge', () => {
      expect(mongoClientOptions({})).toEqual({});
    });

    it('maps the DocumentDB settings', () => {
      expect(mongoClientOptions({
        REACTORY_MONGO_TLS: 'true', REACTORY_MONGO_CA_FILE: caFile, REACTORY_MONGO_RETRY_WRITES: 'false',
      })).toEqual({ tls: true, tlsCAFile: caFile, retryWrites: false });
    });

    it('turns TLS on when only a CA bundle is given', () => {
      expect(mongoClientOptions({ REACTORY_MONGO_CA_FILE: caFile })).toEqual({ tls: true, tlsCAFile: caFile });
    });

    it('refuses unparseable booleans and unreadable CA files', () => {
      expect(() => mongoClientOptions({ REACTORY_MONGO_RETRY_WRITES: 'nope' })).toThrow(/REACTORY_MONGO_RETRY_WRITES/);
      expect(() => mongoClientOptions({ REACTORY_MONGO_CA_FILE: '/nope.pem' })).toThrow(/REACTORY_MONGO_CA_FILE/);
    });
  });

  it('describes the settings without credentials', () => {
    const line = describeConnectionSecurity({
      REACTORY_POSTGRES_SSL: 'verify-full', REACTORY_POSTGRES_PASSWORD: 'secret', REACTORY_MONGO_RETRY_WRITES: 'false',
    });
    expect(line).toBe('postgres ssl=verify-full; mongo tls=from URI, retryWrites=false');
    expect(line).not.toContain('secret');
  });
});
