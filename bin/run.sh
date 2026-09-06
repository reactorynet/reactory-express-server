#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script. (As mentioned above.)
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#$? - The exit status of the most recently run process.
#$$ - The process ID of the current script.
#$USER - The username of the user running the script.
#$HOSTNAME - The hostname of the machine the script is running on.
#$SECONDS - The number of seconds since the script was started.
#$RANDOM - Returns a different random number each time is it referred to.
#$LINENO - Returns the current line number in the Bash script.
# Note this file will only run a compiled version of the application.

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

USE_BUN=false
BUN_VERSION=""
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --bun)
      USE_BUN=true
      ;;
    --bun-version=*)
      USE_BUN=true
      BUN_VERSION="${arg#*=}"
      ;;
    --bun=*)
      USE_BUN=true
      BUN_VERSION="${arg#*=}"
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

REACTORY_CONFIG_ID=${POSITIONAL[0]:-reactory}
REACTORY_ENV_ID=${POSITIONAL[1]:-local}

# Resolve application root and compiled app directory
SERVER_ROOT=""
APP_DIR=""

if [[ -f "./app/index.js" ]]; then
  SERVER_ROOT="$(pwd)"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "${SCRIPT_DIR}/../app/index.js" ]]; then
  SERVER_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "./build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/app/index.js" ]]; then
  SERVER_ROOT="$(pwd)/build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/app/index.js" ]]; then
  SERVER_ROOT="${REACTORY_SERVER}/build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/app/index.js" ]]; then
  SERVER_ROOT="${REACTORY_SERVER}"
  APP_DIR="${SERVER_ROOT}/app"
elif [[ -f "/reactory/reactory-express-server/app/index.js" ]]; then
  SERVER_ROOT="/reactory/reactory-express-server"
  APP_DIR="${SERVER_ROOT}/app"
fi

if [[ -z "$APP_DIR" || ! -f "${APP_DIR}/index.js" ]]; then
  echo "❌ [run] Error: Compiled application not found!" >&2
  echo "   Checked locations:" >&2
  echo "     - ./app/index.js" >&2
  echo "     - ${SCRIPT_DIR}/../app/index.js" >&2
  echo "     - ./build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/app/index.js" >&2
  echo "   Please run 'bin/build.sh ${REACTORY_CONFIG_ID} ${REACTORY_ENV_ID}' first." >&2
  exit 1
fi

# Resolve environment file
ENV_FILE=""
if [[ -f "${SERVER_ROOT}/.env" ]]; then
  ENV_FILE="${SERVER_ROOT}/.env"
elif [[ -f "./.env" ]]; then
  ENV_FILE="./.env"
elif [[ -n "${REACTORY_SERVER:-}" && -f "${REACTORY_SERVER}/.env" ]]; then
  ENV_FILE="${REACTORY_SERVER}/.env"
elif type get_env_file_path &>/dev/null; then
  ENV_FILE="$(get_env_file_path "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID")"
fi

if [[ -n "$ENV_FILE" && -f "$ENV_FILE" ]]; then
  ENV_CMD_ARG="-f ${ENV_FILE}"
else
  ENV_CMD_ARG=""
fi

# Runtime selection: bun vs node
if [[ "$USE_BUN" == "true" ]]; then
  if type ensure_bun &>/dev/null; then
    ensure_bun "$BUN_VERSION" || exit 1
  elif ! has_command bun; then
    echo "❌ [run] Error: Bun is not installed." >&2
    exit 1
  fi
  JS_RUNTIME="bun"
  RUNTIME_ARGS=("run")
  RUNTIME_VERSION="$(bun --version 2>/dev/null || echo 'unknown')"
else
  if type check_node &>/dev/null; then
    check_node
  fi
  JS_RUNTIME="node"
  RUNTIME_ARGS=()
  RUNTIME_VERSION="$(node --version 2>/dev/null || echo 'unknown')"
fi

export NODE_PATH="${APP_DIR}:${SERVER_ROOT}/node_modules:./node_modules:./app:.${NODE_PATH:+:$NODE_PATH}"

echo "🚀 [run] Starting Reactory Express Server from: ${SERVER_ROOT}"
echo "   App Entry   : ${APP_DIR}/index.js"
echo "   Runtime     : ${JS_RUNTIME} (${RUNTIME_VERSION})"
echo "   Env File    : ${ENV_FILE:-none}"

env-cmd --no-override ${ENV_CMD_ARG} "$JS_RUNTIME" "${RUNTIME_ARGS[@]}" "${APP_DIR}/index.js"
