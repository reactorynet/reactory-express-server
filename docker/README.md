# Reactory Docker / Podman Configuration

This directory contains the default framework-level Docker/Podman configuration templates for the Reactory Express Server.

> **Important:** The scripts `bin/podman-compose.sh` and `bin/docker-compose.sh` do **not** read from this
> `docker/` directory. They resolve compose files and environment variables from
> `config/<CONFIG_ID>/` at the server root. See [How the Scripts Work](#how-the-scripts-work) below.

## Directory Structure

```
docker/
  config/                        # Default framework template (CONFIG_ID = "reactory")
    Dockerfile                   # Server image definition
    docker-compose.yaml          # Production-style compose (named volumes)
    docker-compose-develop.yaml  # Development compose (bind-mounted local paths)
  reactory-fullstack/            # Runtime data directory for the default named-volume stack
    mongodb/                     # MongoDB data files (gitignored)
    postgres/                    # PostgreSQL data files (gitignored)
    meilisearch/                 # MeiliSearch index data (gitignored)
    redis/                       # Redis persistence data (gitignored)
```

## How the Scripts Work

The compose scripts are invoked from the **server root** and accept two positional arguments:

```bash
# Podman
bin/podman-compose.sh <CONFIG_ID> <ENV_ID> [command]

# Docker
bin/docker-compose.sh <CONFIG_ID> <ENV_ID> [command]
```

| Argument | Default | Description |
|---|---|---|
| `CONFIG_ID` | `reactory` | Identifies the client/install config |
| `ENV_ID` | `podman` / `local` | Selects the environment-specific `.env` file |
| `command` | `up` | Compose command to run (e.g., `up`, `down`, `ps`) |

Both scripts resolve their files under `config/<CONFIG_ID>/` at the server root:

- **Compose file:** `config/<CONFIG_ID>/${DOCKER_COMPOSE_FILENAME:-docker-compose.yaml}`
- **Env file:** `config/<CONFIG_ID>/.env.<ENV_ID>`

Each `config/<CONFIG_ID>/` directory is a **separate git repository** containing the full configuration for one Reactory install identity (compose files, `.env.*` files, forms, PM2 config, Terraform, etc.). The default install ships with `config/reactory/`.

## Default Framework Template (`docker/config/`)

> **This is the default configuration for the out-of-the-box `reactory` install identity.**
> It serves as the canonical reference template. When setting up a new client config,
> copy these files into `config/<your-client-id>/` and customise from there.
> Do not modify these files for client-specific purposes.

The `docker/config/` folder provides two compose variants:

| File | Purpose |
|---|---|
| `docker-compose.yaml` | Production-style stack using named Docker/Podman volumes |
| `docker-compose-develop.yaml` | Development stack using bind-mounted paths from `$REACTORY_SERVER` |

### Services

Both variants bring up the full Reactory platform stack:

| Service | Image | Default Port |
|---|---|---|
| MongoDB | `mongo` | `27017` |
| PostgreSQL | `postgres` | `5432` |
| MeiliSearch | `getmeili/meilisearch` | `7700` |
| Redis | `redis` | `6379` |
| Jaeger (tracing) | `jaegertracing/all-in-one` | `4318`, `16686` |
| Grafana | `grafana/grafana` | `3000` |
| Grafana Loki | `grafana/loki` | `3100` |
| Prometheus | `prom/prometheus` | `9090` |
| Reactory Express Server | local build | `4000`, `9464` |

### Dockerfile

The `Dockerfile` builds the Reactory Express Server image. Key build arguments:

| Argument | Default | Description |
|---|---|---|
| `NODE_VERSION` | `20.19.4` | Node.js version (matches `.nvmrc`) |
| `REACTORY_CONFIG_ID` | `reactory` | Client config identifier |
| `REACTORY_ENV_ID` | `podman` | Environment identifier |
| `HAS_CUSTOM_CERTS` | `false` | Set to `true` when custom CA certs are present |
| `BUILD_VERSION` | `latest` | Server build version |

Custom CA certificates can be placed in a `certificates/` directory alongside the Dockerfile before building. When `HAS_CUSTOM_CERTS=true`, the build verifies and installs them into the image trust store.

## Usage

### Default install (Podman, development)

```bash
# From the server root
bin/podman-compose.sh reactory podman-develop
```

This reads `config/reactory/docker-compose-develop.yaml` and `config/reactory/.env.podman-develop`. Data is bind-mounted under `$REACTORY_SERVER/docker/reactory-develop/<service>/`.

### Default install (Podman, named volumes)

```bash
bin/podman-compose.sh reactory podman
```

This reads `config/reactory/docker-compose.yaml` and `config/reactory/.env.podman`. Data is persisted in named Podman volumes.

### Docker (legacy)

```bash
bin/docker-compose.sh reactory local
```

### Custom client config

```bash
bin/podman-compose.sh my-client podman
```

Requires `config/my-client/docker-compose.yaml` and `config/my-client/.env.podman` to exist.

## Environment Variables

Key variables expected in the resolved `.env.*` file:

| Variable | Description |
|---|---|
| `REACTORY_SERVER` | Path to the reactory-express-server checkout |
| `REACTORY_DATA` | Path to the reactory-data directory |
| `REACTORY_CLIENT` | Path to the reactory-pwa-client checkout |
| `PODMAN_COMPOSE_PROJECT_NAME` | Compose project name (required by `podman-compose.sh`) |
| `DOCKER_COMPOSE_FILENAME` | Override the compose filename (default: `docker-compose.yaml`) |
| `MONGO_USER` / `MONGO_PASSWORD` / `MONGO_DB` | MongoDB credentials |
| `REACTORY_POSTGRES_USER` / `REACTORY_POSTGRES_PASSWORD` | PostgreSQL credentials |
| `REACTORY_REDIS_PASSWORD` | Redis password |
| `MEILISEARCH_MASTER_KEY` | MeiliSearch master key |
| `BUILD_VERSION` | Image tag for the express server |

## Notes

- `docker/reactory-fullstack/` holds runtime data for the default named-volume compose stack. Its contents are gitignored — do not commit database files.
- Grafana and Prometheus configuration is sourced from the `reactory-telemetry` module at `src/modules/reactory-telemetry/data/`.
- Each client config in `config/<CONFIG_ID>/` is an independent git repository and should be managed separately from the server repo.
