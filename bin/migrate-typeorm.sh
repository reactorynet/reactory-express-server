#!/bin/bash
# Module-aware TypeORM migration runner.
#
# Usage:
#   bin/migrate-typeorm.sh <command> [client_key] [target_env] [options]
#
# Commands:
#   status   - show pending/applied migrations
#   up       - run pending migrations
#   down     - revert the last migration
#   create   - create a migration file in a module's migrations/typeorm dir
#
# Options:
#   --module=<key>     target a specific module
#   --name=<name>      migration name (required for create)
#
# Notes:
# - Without --module, status/up run across all active modules that define
#   src/modules/<module>/migrations/typeorm/data-source.ts.
# - down/create require --module to avoid unsafe global operations.

source ./bin/shared/shell-utils.sh
check_env_vars

COMMAND="${1:-status}"
shift

CLIENT_KEY="reactory"
TARGET_ENV="local"
ONLY_MODULE=""
MIGRATION_NAME=""
_CLIENT_SET=0
_ENV_SET=0

for arg in "$@"; do
  case "$arg" in
    --module=*) ONLY_MODULE="${arg#*=}" ;;
    --name=*)   MIGRATION_NAME="${arg#*=}" ;;
    --*)        ;;
    *)
      if [[ $_CLIENT_SET -eq 0 ]]; then
        CLIENT_KEY="$arg"
        _CLIENT_SET=1
      elif [[ $_ENV_SET -eq 0 ]]; then
        TARGET_ENV="$arg"
        _ENV_SET=1
      fi
      ;;
  esac
done

if [[ "$COMMAND" == "down" && -z "$ONLY_MODULE" ]]; then
  echo "Error: 'down' requires --module=<key>."
  exit 1
fi

if [[ "$COMMAND" == "create" && -z "$ONLY_MODULE" ]]; then
  echo "Error: 'create' requires --module=<key>."
  exit 1
fi

if [[ "$COMMAND" == "create" && -z "$MIGRATION_NAME" ]]; then
  echo "Error: 'create' requires --name=<migration-name>."
  exit 1
fi

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

TYPEORM_CLI="./node_modules/typeorm/cli.js"
if [[ ! -f "$TYPEORM_CLI" ]]; then
  echo "Error: TypeORM CLI not found. Run: yarn install"
  exit 1
fi

MODULES_DIR="./src/modules"

run_for_module() {
  local module_key="$1"
  local module_dir="${MODULES_DIR}/${module_key}"
  local ds_file="${module_dir}/migrations/typeorm/data-source.ts"

  if [[ ! -f "$ds_file" ]]; then
    return 0
  fi

  printf '\n\033[1;34m┌─ module: %s\033[0m\n' "$module_key"

  if [[ "$COMMAND" == "status" ]]; then
    NODE_PATH="" "$ENV_CMD" -f "$ENV_FILE" node -r ts-node/register "$TYPEORM_CLI" migration:show -d "$ds_file"
  elif [[ "$COMMAND" == "up" ]]; then
    NODE_PATH="" "$ENV_CMD" -f "$ENV_FILE" node -r ts-node/register "$TYPEORM_CLI" migration:run -d "$ds_file"
  elif [[ "$COMMAND" == "down" ]]; then
    NODE_PATH="" "$ENV_CMD" -f "$ENV_FILE" node -r ts-node/register "$TYPEORM_CLI" migration:revert -d "$ds_file"
  elif [[ "$COMMAND" == "create" ]]; then
    local target="${module_dir}/migrations/typeorm/${MIGRATION_NAME}"
    NODE_PATH="" "$ENV_CMD" -f "$ENV_FILE" node -r ts-node/register "$TYPEORM_CLI" migration:create "$target"
  else
    echo "Error: unsupported command '$COMMAND'"
    return 1
  fi

  local exit_code=$?
  printf '\033[1;34m└─ done (exit: %s)\033[0m\n' "$exit_code"
  return $exit_code
}

echo "typeorm-migrate | command: ${COMMAND} | client: ${CLIENT_KEY} | env: ${TARGET_ENV}"

if [[ -n "$ONLY_MODULE" ]]; then
  run_for_module "$ONLY_MODULE"
  exit $?
fi

active_modules=$(get_active_module_keys "$CLIENT_KEY" "$MODULES_DIR")
while IFS= read -r module_key; do
  [[ -z "$module_key" ]] && continue
  run_for_module "$module_key"
done <<< "$active_modules"
