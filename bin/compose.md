# compose.sh — Reactory Compose Launcher

`bin/compose.sh` is the unified entry point for starting Reactory's containerised services. It auto-detects the available container runtime and selects the appropriate compose file, replacing the older `bin/docker-compose.sh` and `bin/podman-compose.sh` wrappers for day-to-day use.

## Usage

```
bin/compose.sh [config-id] [env-id] [compose-variant] [compose-command]
```

| Argument          | Default       | Description |
|-------------------|---------------|-------------|
| `config-id`       | `reactory`    | Client configuration directory under `config/`. |
| `env-id`          | `local`       | Environment suffix. Selects `config/<config-id>/.env.<env-id>`. |
| `compose-variant` | *(empty)*     | Compose file variant. Empty = `docker-compose.yaml`. Any other value = `docker-compose-<variant>.yaml`. |
| `compose-command` | `up -d`       | Raw command forwarded to the compose runtime (e.g. `down`, `logs`, `ps`). |

## Runtime Detection

The script selects a compose runtime in this order:

1. **podman-compose** — preferred when available (rootless, daemon-free).
2. **docker compose** (v2 plugin) — used when Docker is installed and the plugin is present.
3. **docker-compose** (v1 legacy binary) — fallback if the v2 plugin is absent.

If none of these are available the script exits with an error.

## Compose File Selection

Config directories live under `config/<config-id>/`. The compose file chosen depends on `compose-variant`:

| `compose-variant` | File resolved |
|-------------------|---------------|
| *(empty)*         | `docker-compose.yaml` |
| `develop`         | `docker-compose-develop.yaml` |
| `podman`          | `docker-compose-podman.yaml` |
| `<anything>`      | `docker-compose-<anything>.yaml` |

Use the `develop` variant when you want to run only the infrastructure services (MongoDB, PostgreSQL, Redis, MeiliSearch, Jaeger, Grafana, Loki, Prometheus) and run the server and/or client locally:

```bash
bin/compose.sh reactory local develop
```

Use the default variant (or omit it) when you also want the server and/or client running as containers alongside the infrastructure:

```bash
bin/compose.sh reactory podman
```

## Local Image Preflight

Services whose `image:` value starts with `localhost/` are locally-built images that cannot be pulled from a registry. Before starting, the script:

1. Parses the selected compose file.
2. Resolves `${VAR:-default}` substitutions using the sourced env file.
3. Checks every `localhost/` image against the local image store (`podman image exists` or `docker image inspect`).
4. Exits early with a clear message if any image is missing, rather than letting the runtime produce a confusing connection-refused error.

If the compose file contains no `localhost/` images (e.g. `docker-compose-develop.yaml`) this check is skipped automatically.

When an image is missing, build it first:

```bash
bin/build-image.sh <config-id> <env-id>
```

## Common Workflows

### Infrastructure only (develop locally against containers)

```bash
# Start MongoDB, PostgreSQL, Redis, MeiliSearch, Jaeger, Grafana, Loki, Prometheus
bin/compose.sh reactory local develop

# Then start the server locally
bin/start.sh reactory local

# And the client locally
# (from the pwa-client directory)
bin/start.sh reactory local
```

### Full stack in containers (podman)

```bash
# Build the server and/or client images first
bin/build-image.sh reactory podman

# Start everything
bin/compose.sh reactory podman
```

### Tear down and remove volumes

```bash
bin/compose.sh reactory local develop "down -v"
```

### View logs

```bash
bin/compose.sh reactory local develop logs
```

### Check status

```bash
bin/compose.sh reactory local develop ps
```

## Environment Files

Each configuration + environment pair maps to a `.env` file:

```
config/
  reactory/
    .env.local        # local development (default)
    .env.podman       # full-stack podman run
    .env.staging
    .env.production
```

The env file is sourced before the image preflight runs so that variable substitutions inside compose files (e.g. `${BUILD_VERSION}`, `${REACTORY_CONFIG_ID}`) are resolved correctly.

## Choosing Between `compose.sh`, `podman-compose.sh`, and `docker-compose.sh`

| Script | When to use |
|--------|-------------|
| `bin/compose.sh` | **Preferred.** Auto-detects runtime; handles both docker and podman; dynamic image preflight; supports all compose variants. |
| `bin/podman-compose.sh` | Podman-specific with additional preflight (YAML validation, `PODMAN_COMPOSE_PROJECT_NAME` check, container clearing). Use when you need those extra guards. |
| `bin/docker-compose.sh` | Thin legacy wrapper. Retained for backwards compatibility only. |
