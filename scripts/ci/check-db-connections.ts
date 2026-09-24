/**
 * Connect through every consumer of the platform databases, with the settings
 * from src/database/connectionOptions.ts, and report whether each session is
 * actually encrypted (WP-B4). Run it before the first boot against Aurora or
 * DocumentDB: a wrong CA bundle or host name shows up here, per consumer,
 * instead of as a crash loop.
 *
 *   bin/check-db-connections.sh [--postgres-only | --mongo-only] [--require-tls]
 *
 * --require-tls fails any session that is not encrypted.
 *
 * The workflow persistence check runs only for the provider the server would
 * use (WORKFLOW_PERSISTENCE_PROVIDER, default mongo): connecting creates its
 * tables or indexes, exactly as a server boot does.
 * Exit 0 when every consumer connected (and, with --require-tls, used TLS).
 */
import 'reflect-metadata';
import Postgres from 'postgres';
import mongoose from 'mongoose';
import { DataSource } from 'typeorm';
import { MongoDBPersistence } from '@reactorynet/workflow-es-mongodb';
import { PostgresPersistence } from '@reactorynet/workflow-es-postgres';
import {
  describeConnectionSecurity,
  mongoClientOptions,
  postgresJsOptions,
  postgresUrl,
  sequelizePostgresOptions,
  typeormPostgresOptions,
} from '../../src/database/connectionOptions';

const args = new Set(process.argv.slice(2));
const requireTls = args.has('--require-tls');
const checkPostgres = !args.has('--mongo-only');
const checkMongo = !args.has('--postgres-only');

const workflowProvider = (process.env.WORKFLOW_PERSISTENCE_PROVIDER || 'mongo').toLowerCase();

const SSL_QUERY = 'SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid()';

type Result = { consumer: string; ok: boolean; detail: string };
const results: Result[] = [];

const record = (consumer: string, ok: boolean, detail: string) => {
  results.push({ consumer, ok, detail });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${consumer.padEnd(34)} ${detail}`);
};

const sslVerdict = (consumer: string, row: { ssl: boolean; version: string | null } | undefined) => {
  const encrypted = !!row?.ssl;
  record(consumer, encrypted || !requireTls, encrypted ? `encrypted (${row?.version})` : 'NOT encrypted');
};

const attempt = async (consumer: string, run: () => Promise<void>) => {
  try {
    await run();
  } catch (error) {
    record(consumer, false, (error as Error).message.split('\n')[0]);
  }
};

const postgresChecks = async () => {
  await attempt('postgres.js (ConnectionFactory)', async () => {
    const sql = Postgres({ ...postgresJsOptions(), max: 1, connect_timeout: 10 });
    try {
      const [row] = await sql.unsafe(SSL_QUERY);
      sslVerdict('postgres.js (ConnectionFactory)', row as any);
    } finally {
      await sql.end({ timeout: 1 });
    }
  });

  for (const [label, prefix] of [['TypeORM (core, reactor)', undefined], ['TypeORM (classroom)', 'CLASSROOM']] as const) {
    await attempt(label, async () => {
      const ds = new DataSource({ type: 'postgres', ...typeormPostgresOptions(process.env, prefix), connectTimeoutMS: 10000 });
      await ds.initialize();
      try {
        const [row] = await ds.query(SSL_QUERY);
        sslVerdict(label, row);
      } finally {
        await ds.destroy();
      }
    });
  }

  if (workflowProvider !== 'postgres') return;
  await attempt('workflow persistence (postgres)', async () => {
    const url = process.env.WORKFLOW_POSTGRES_URL || process.env.REACTORY_POSTGRES_URL || process.env.POSTGRES_URL || postgresUrl();
    const persistence: any = new PostgresPersistence(url, sequelizePostgresOptions(process.env, url));
    try {
      await persistence.connect;
      const [rows] = await persistence.sequelize.query(SSL_QUERY);
      sslVerdict('workflow persistence (postgres)', rows[0]);
    } finally {
      await persistence.sequelize.close();
    }
  });
};

const mongoChecks = async () => {
  const uri = process.env.MONGOOSE;
  if (!uri) {
    record('mongo', false, 'MONGOOSE is not set');
    return;
  }
  const options = mongoClientOptions();
  // Credentials as the server passes them (src/models/mongoose/index.ts).
  const auth = { user: process.env.MONGO_USER, pass: process.env.MONGO_PASSWORD };

  const tlsInUse = (client: any): boolean => {
    const resolved = client?.options ?? {};
    return !!(resolved.tls || resolved.ssl);
  };

  await attempt('mongoose', async () => {
    const connection = await mongoose.createConnection(uri, { ...auth, ...options, serverSelectionTimeoutMS: 10000 }).asPromise();
    try {
      await connection.db.admin().ping();
      const encrypted = tlsInUse(connection.getClient());
      const retry = connection.getClient().options.retryWrites;
      record('mongoose', encrypted || !requireTls, `${encrypted ? 'encrypted' : 'NOT encrypted'}, retryWrites=${retry}`);
    } finally {
      await connection.close();
    }
  });

  if (workflowProvider !== 'mongo') return;
  await attempt('workflow persistence (mongo)', async () => {
    const persistence: any = new MongoDBPersistence(uri, { ...options, serverSelectionTimeoutMS: 10000 });
    try {
      await persistence.connect;
      await persistence.db.admin().ping();
      const encrypted = tlsInUse(persistence.client);
      record('workflow persistence (mongo)', encrypted || !requireTls, encrypted ? 'encrypted' : 'NOT encrypted');
    } finally {
      await persistence.close();
    }
  });
};

(async () => {
  console.log(`Settings: ${describeConnectionSecurity()}\n`);
  if (checkPostgres) await postgresChecks();
  if (checkMongo) await mongoChecks();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} consumers passed`);
  process.exit(failed ? 1 : 0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
