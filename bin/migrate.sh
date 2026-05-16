#!/bin/bash
# Module-aware MongoDB migration runner.
#
# Usage:
#   bin/migrate.sh <command> [client_key] [target_env] [options]
#
# Commands:
#   status    — show pending/applied migrations
#   up        — apply all pending migrations
#   down      — roll back the last applied migration
#   create    — scaffold a new migration file
#
# Options:
#   --module=<key>         target a specific module's migrations/mongo dir
#   --server               target the server-level (root ./migrations) dir only
#   --desc=<description>   migration description (required for create)
#   --validate             after `up`, verify no pending migrations remain per target
#
# Defaults: client_key=reactory  target_env=local
# When no --module or --server flag is given, 'up' and 'status' run across
# the server-level dir AND every active module that has a migrations/mongo dir.
# 'down' and 'create' require --module or --server to avoid ambiguity.
#
# Examples:
#   bin/migrate.sh status
#   bin/migrate.sh status reactory local
#   bin/migrate.sh up reactory local
#   bin/migrate.sh down reactory local --module=reactory-core
#   bin/migrate.sh down reactory local --server
#   bin/migrate.sh create reactory local --module=reactory-core --desc="add-user-email-index"
#   bin/migrate.sh create reactory local --server --desc="server-wide-baseline"

source ./bin/shared/shell-utils.sh
check_env_vars

COMMAND="${1:-status}"
shift

CLIENT_KEY="reactory"
TARGET_ENV="local"
ONLY_MODULE=""
SERVER_ONLY=false
DESCRIPTION=""
VALIDATE=false
_CLIENT_SET=0
_ENV_SET=0

for arg in "$@"; do
  case "$arg" in
    --module=*)  ONLY_MODULE="${arg#*=}" ;;
    --server)    SERVER_ONLY=true ;;
    --desc=*)    DESCRIPTION="${arg#*=}" ;;
    --validate)  VALIDATE=true ;;
    --*)         ;;  # ignore unknown flags
    *)
      if [[ $_CLIENT_SET -eq 0 ]]; then CLIENT_KEY="$arg";  _CLIENT_SET=1
      elif [[ $_ENV_SET -eq 0 ]]; then  TARGET_ENV="$arg";  _ENV_SET=1
      fi ;;
  esac
done

# ── load environment ──────────────────────────────────────────────────────────
# The .env files are in dotenv format (not bash format) — they may contain
# shell metacharacters such as & in MongoDB connection strings. We must NOT
# source them directly. Instead, pass them to child processes via env-cmd,
# exactly as start.sh does.

ENV_FILE="./config/${CLIENT_KEY}/.env.${TARGET_ENV}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found: ${ENV_FILE}"
  exit 1
fi

ENV_CMD="./node_modules/.bin/env-cmd"
if [[ ! -f "$ENV_CMD" ]]; then
  echo "Error: env-cmd not found. Run: yarn install"
  exit 1
fi

MODULES_DIR="./src/modules"
ENABLED_FILE="${MODULES_DIR}/enabled-${CLIENT_KEY}.json"
MIGRATE_BIN="./node_modules/.bin/migrate-mongo"

if [[ ! -f "$ENABLED_FILE" ]]; then
  echo "Error: enabled modules file not found: ${ENABLED_FILE}"
  exit 1
fi

if [[ ! -f "$MIGRATE_BIN" ]]; then
  echo "Error: migrate-mongo not found. Run: yarn install"
  exit 1
fi

# ── guard ambiguous commands ──────────────────────────────────────────────────

if [[ "$COMMAND" == "down" && -z "$ONLY_MODULE" && "$SERVER_ONLY" == "false" ]]; then
  echo "Error: 'down' requires --module=<key> or --server to avoid rolling back all modules at once."
  exit 1
fi

if [[ "$COMMAND" == "create" && -z "$ONLY_MODULE" && "$SERVER_ONLY" == "false" ]]; then
  echo "Error: 'create' requires --module=<key> or --server to target a migrations directory."
  exit 1
fi

if [[ "$COMMAND" == "create" && -z "$DESCRIPTION" ]]; then
  echo "Error: 'create' requires --desc=<description>."
  exit 1
fi

# ── helpers ───────────────────────────────────────────────────────────────────

# Writes a temporary migrate-mongo config for a given migrations directory.
# Prints the path to the temp file — caller is responsible for deleting it.
# process.env.* values are injected at runtime by env-cmd — no direct substitution needed.
make_module_config() {
  local module_key="$1"
  local migrations_dir="$2"
  local tmp
  tmp=$(mktemp /tmp/migrate-mongo-XXXX.js)
  cat > "$tmp" << JSEOF
module.exports = {
  mongodb: {
    url: process.env.MONGOOSE,
    options: {
      auth: process.env.MONGO_USER && process.env.MONGO_PASSWORD
        ? { username: process.env.MONGO_USER, password: process.env.MONGO_PASSWORD }
        : undefined,
    },
  },
  migrationsDir: '${migrations_dir}',
  changelogCollectionName: 'reactory_migrations_${module_key}',
  migrationFileExtension: '.js',
  useFileHash: false,
  moduleSystem: 'commonjs',
};
JSEOF
  echo "$tmp"
}

# Runs the current COMMAND against one config file, then optionally removes it.
run_for_target() {
  local label="$1"
  local config="$2"
  local cleanup="$3"   # "yes" to delete config after
  printf '\n\033[1;34m┌─ %s\033[0m\n' "$label"

  if [[ "$COMMAND" == "create" ]]; then
    "$ENV_CMD" -f "$ENV_FILE" "$MIGRATE_BIN" create -f "$config" "$DESCRIPTION"
  else
    "$ENV_CMD" -f "$ENV_FILE" "$MIGRATE_BIN" "$COMMAND" -f "$config"
  fi

  local exit_code=$?
  [[ "$cleanup" == "yes" ]] && rm -f "$config"
  printf '\033[1;34m└─ done (exit: %s)\033[0m\n' "$exit_code"
  return $exit_code
}

validate_target() {
  local label="$1"
  local config="$2"
  local status_output

  status_output=$("$ENV_CMD" -f "$ENV_FILE" "$MIGRATE_BIN" status -f "$config" 2>&1)
  local status_exit=$?

  if [[ $status_exit -ne 0 ]]; then
    printf '\033[0;31m│  validation failed: status command errored\033[0m\n'
    echo "$status_output"
    return 1
  fi

  if echo "$status_output" | grep -q "PENDING"; then
    printf '\033[0;31m│  validation failed: pending migrations remain for %s\033[0m\n' "$label"
    echo "$status_output"
    return 1
  fi

  printf '\033[0;32m│  validation passed\033[0m\n'
  return 0
}

run_server_level() {
  run_for_target "server-level  [./migrations]" "./migrate-mongo-config.js" "no"
}

run_module() {
  local module_key="$1"
  local migrations_dir="${MODULES_DIR}/${module_key}/migrations/mongo"
  [[ ! -d "$migrations_dir" ]] && return 0   # module has no mongo migrations — skip silently

  local tmp_config
  tmp_config=$(make_module_config "$module_key" "$migrations_dir")
  run_for_target "module: ${module_key}  [${migrations_dir}]" "$tmp_config" "yes"
}

FAILED=0

run_and_track() {
  local label="$1"
  local config="$2"
  local cleanup="$3"
  local cleanup_after=false

  # For `up --validate`, keep temp config alive until validation completes.
  if [[ "$cleanup" == "yes" && "$VALIDATE" == "true" && "$COMMAND" == "up" ]]; then
    cleanup_after=true
    cleanup="no"
  fi

  run_for_target "$label" "$config" "$cleanup"
  local run_exit=$?

  if [[ $run_exit -ne 0 ]]; then
    FAILED=1
    return $run_exit
  fi

  if [[ "$VALIDATE" == "true" && "$COMMAND" == "up" ]]; then
    validate_target "$label" "$config"
    local validate_exit=$?
    [[ "$cleanup_after" == "true" ]] && rm -f "$config"
    if [[ $validate_exit -ne 0 ]]; then
      FAILED=1
      return $validate_exit
    fi
  elif [[ "$cleanup_after" == "true" ]]; then
    rm -f "$config"
  fi

  return 0
}

# ── dispatch ──────────────────────────────────────────────────────────────────

echo "migrate | command: ${COMMAND} | client: ${CLIENT_KEY} | env: ${TARGET_ENV}"

if [[ "$SERVER_ONLY" == "true" ]]; then
  run_and_track "server-level  [./migrations]" "./migrate-mongo-config.js" "no"
  exit $?
fi

if [[ -n "$ONLY_MODULE" ]]; then
  module_migrations_dir="${MODULES_DIR}/${ONLY_MODULE}/migrations/mongo"
  if [[ ! -d "$module_migrations_dir" ]]; then
    echo "Error: module migration directory not found: ${module_migrations_dir}"
    exit 1
  fi
  tmp_module_config=$(make_module_config "$ONLY_MODULE" "$module_migrations_dir")
  run_and_track "module: ${ONLY_MODULE}  [${module_migrations_dir}]" "$tmp_module_config" "yes"
  exit $?
fi

# No filter — run server-level then every active module that has migrations.
run_and_track "server-level  [./migrations]" "./migrate-mongo-config.js" "no"

active_modules=$(get_active_module_keys "$CLIENT_KEY" "$MODULES_DIR")
while IFS= read -r module_key; do
  [[ -z "$module_key" ]] && continue
  module_migrations_dir="${MODULES_DIR}/${module_key}/migrations/mongo"
  [[ ! -d "$module_migrations_dir" ]] && continue
  tmp_module_config=$(make_module_config "$module_key" "$module_migrations_dir")
  run_and_track "module: ${module_key}  [${module_migrations_dir}]" "$tmp_module_config" "yes"
done <<< "$active_modules"

if [[ $FAILED -ne 0 ]]; then
  echo "Migration run completed with one or more failures."
  exit 1
fi

echo "Migration run completed successfully."
