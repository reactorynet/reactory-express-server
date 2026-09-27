# Database Connections: TLS, Aurora and DocumentDB

The server's own Postgres and MongoDB connections all take their settings from
`src/database/connectionOptions.ts` (WP-B4), so every consumer connects the same
way:

| Consumer | Code |
|---|---|
| postgres.js default connection | `src/database/postgres/ConnectionFactory.ts` |
| TypeORM runtime data sources (core, reactor, classroom) | `src/modules/<module>/models/index.ts` |
| TypeORM migration CLI data sources | `src/modules/<module>/migrations/typeorm/data-source.ts` |
| Workflow persistence (`mongo` default, or `postgres`) | `src/modules/reactory-core/workflow/WorkflowRunner/WorkflowRunner.ts` |
| Mongoose, and the Mongo session store through it | `src/models/mongoose/index.ts` |
| Reactor ops scripts | `src/modules/reactory-reactor/scripts/lib/instanceProbe.ts` |

Connections a tenant declares in its own settings (`settingType: 'connection'`)
keep their own options and are not affected.

## Settings

### Postgres

| Variable | Values | Notes |
|---|---|---|
| `REACTORY_POSTGRES_HOST`, `_PORT`, `_USER`, `_PASSWORD`, `_DB` | | Fall back to `POSTGRES_DB_HOST`, `POSTGRES_DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. postgres.js used to read only the `REACTORY_` names. |
| `REACTORY_POSTGRES_SSL` | `disable` (default), `require`, `verify-full` | `require` encrypts without checking the certificate. `verify-full` checks the chain and that the certificate names the configured host. |
| `REACTORY_POSTGRES_CA_FILE` | path to a PEM bundle | Trusted instead of the system CAs. |
| `CLASSROOM_POSTGRES_*`, including `_SSL` and `_CA_FILE` | | Classroom reads these first, then the shared settings. |

An invalid value stops the server at startup with the variable's name. The
startup log has one line, `Database connections: ...`, showing the result
without credentials.

### MongoDB

| Variable | Values | Notes |
|---|---|---|
| `MONGOOSE` | connection string | May carry `tls=true&tlsCAFile=...&retryWrites=false` itself. |
| `REACTORY_MONGO_TLS` | `true` / `false` | Set only if the URI does not say. |
| `REACTORY_MONGO_CA_FILE` | path to a PEM bundle | Implies `tls=true`. |
| `REACTORY_MONGO_RETRY_WRITES` | `true` / `false` | DocumentDB does not support retryable writes: `false`. |

Each `REACTORY_MONGO_*` variable is applied only when set, and then it
overrides the same option in the URI.

## Aurora PostgreSQL

```bash
REACTORY_POSTGRES_SSL=verify-full
REACTORY_POSTGRES_CA_FILE=/etc/ssl/rds/global-bundle.pem
```

- Use the RDS **global** bundle (`https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem`).
  The older `rds-combined-ca-bundle.pem` does not contain the current RDS CAs.
- Connect to the cluster endpoint name, not an IP address: the certificate
  names the endpoint.
- Migrations need rights to create the `uuid-ossp` and `pg_trgm` extensions
  (see `bin/migrate.md`).

## Amazon DocumentDB

```bash
MONGOOSE='mongodb://<cluster-endpoint>:27017/<db>?tls=true&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'
REACTORY_MONGO_CA_FILE=/etc/ssl/rds/global-bundle.pem
REACTORY_MONGO_RETRY_WRITES=false
```

Workflow persistence on Mongo uses the same settings. Postgres persistence
(`WORKFLOW_PERSISTENCE_PROVIDER=postgres`) keeps workflow state out of
DocumentDB entirely.

## Checks

Neither script loads `.env`; export the settings you want to test.

```bash
# Connect through every consumer; report whether each one is encrypted
bin/check-db-connections.sh --require-tls

# Run every MongoDB feature the server uses against the target, in a scratch
# database it drops afterwards; failures list the files that depend on the feature
bin/check-documentdb.sh
```

`bin/check-db-connections.sh` also checks the workflow persistence for the
configured `WORKFLOW_PERSISTENCE_PROVIDER`, which creates its tables or indexes
just as a server boot would.

## Local TLS databases

```bash
bin/dev-tls-certs.sh    # throwaway CA and server certificate in docker/config/tls/ (gitignored)
docker compose -f docker/config/docker-compose.yaml --profile tls up -d \
  reactory_postgres_tls reactory_mongodb_tls
```

Postgres listens on 5433 and refuses plain text (as `rds.force_ssl=1` does).
MongoDB listens on 27018 with `requireTLS`. Trust `docker/config/tls/ca.pem`.
The certificate names `localhost` but not `127.0.0.1`, so pointing
`verify-full` at `127.0.0.1` shows the host-name check failing.
