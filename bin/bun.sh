#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script.
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#
# Reactory Bun Server Runner
# Runs the compiled Reactory Express Server using the Bun runtime.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source shell-utils (check relative to script, current dir, or REACTORY_SERVER)
if [[ -f "${SCRIPT_DIR}/shared/shell-utils.sh" ]]; then
  source "${SCRIPT_DIR}/shared/shell-utils.sh"
elif [[ -f "./bin/shared/shell-utils.sh" ]]; then
  source "./bin/shared/shell-utils.sh"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/bin/shared/shell-utils.sh" ]]; then
  source "${REACTORY_SERVER}/bin/shared/shell-utils.sh"
fi

BUN_VERSION=""
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --bun-version=*)
      BUN_VERSION="${arg#*=}"
      ;;
    --bun=*)
      BUN_VERSION="${arg#*=}"
      ;;
    --bun)
      # already default for bun.sh
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

CLIENT_KEY="${POSITIONAL[0]:-reactory}"
TARGET_ENV="${POSITIONAL[1]:-local}"

# Resolve application root and compiled app directory
SERVER_ROOT=""
APP_DIR=""

if [[ -f "./app/index.js" ]]; then
  SERVER_ROOT="$(pwd)"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "${SCRIPT_DIR}/../app/index.js" ]]; then
  SERVER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "./build/server/${CLIENT_KEY}/${TARGET_ENV}/app/index.js" ]]; then
  SERVER_ROOT="$(pwd)/build/server/${CLIENT_KEY}/${TARGET_ENV}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/build/server/${CLIENT_KEY}/${TARGET_ENV}/app/index.js" ]]; then
  SERVER_ROOT="${REACTORY_SERVER}/build/server/${CLIENT_KEY}/${TARGET_ENV}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/app/index.js" ]]; then
  SERVER_ROOT="${REACTORY_SERVER}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "/reactory/reactory-express-server/app/index.js" ]]; then
  SERVER_ROOT="/reactory/reactory-express-server"
  APP_DIR="${SERVER_ROOT}/app"
fi

if [[ -z "$APP_DIR" || ! -f "${APP_DIR}/index.js" ]]; then
  echo "❌ [bun] Error: Compiled application not found!" >&2
  echo "   Checked locations:" >&2
  echo "     - ./app/index.js" >&2
  echo "     - ${SCRIPT_DIR}/../app/index.js" >&2
  echo "     - ./build/server/${CLIENT_KEY}/${TARGET_ENV}/app/index.js" >&2
  echo "   Please run 'bin/build.sh ${CLIENT_KEY} ${TARGET_ENV}' first." >&2
  exit 1
fi

ensure_bun "$BUN_VERSION" || exit 1

# Setup environment
copy_env_file "$CLIENT_KEY" "$TARGET_ENV"
source_env_file "$CLIENT_KEY" "$TARGET_ENV"
check_env_vars

# Resolve environment file
ENV_FILE=""
if [[ -f "${SERVER_ROOT}/.env" ]]; then
  ENV_FILE="${SERVER_ROOT}/.env"
elif [[ -f "./.env" ]]; then
  ENV_FILE="./.env"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/.env" ]]; then
  ENV_FILE="${REACTORY_SERVER}/.env"
elif type get_env_file_path &>/dev/null; then
  ENV_FILE="$(get_env_file_path "$CLIENT_KEY" "$TARGET_ENV")"
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  ENV_CMD_ARG="-f ${ENV_FILE}"
else
  ENV_CMD_ARG=""
fi

export NODE_PATH="${APP_DIR}:${SERVER_ROOT}/node_modules:./node_modules:./app:.${NODE_PATH:+:$NODE_PATH}"

echo "🚀 [bun] Starting Reactory Express Server with Bun ($(bun --version))"
echo "   Server Root : ${SERVER_ROOT}"
echo "   App Entry   : ${APP_DIR}/index.js"
echo "   Env File    : ${ENV_FILE:-none}"

env-cmd ${ENV_CMD_ARG} bun run "${APP_DIR}/index.js"
