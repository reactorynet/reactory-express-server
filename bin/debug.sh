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

source ./bin/shared/shell-utils.sh
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
    --version=*)
      BUN_VERSION="${arg#*=}"
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

CLIENT_KEY="${POSITIONAL[0]:-reactory}"
TARGET_ENV="${POSITIONAL[1]:-local}"

copy_env_file "$CLIENT_KEY" "$TARGET_ENV"
source_env_file "$CLIENT_KEY" "$TARGET_ENV"
check_env_vars

if [[ "$USE_BUN" == "true" ]]; then
  ensure_bun "$BUN_VERSION" || exit 1
  echo "🚀 [debug] Starting Reactory Debugger with Bun ($(bun --version))"
  NODE_PATH=./src env-cmd --no-override -f ./.env bun --inspect --watch ./src/index.ts
else
  if type check_node &>/dev/null; then
    check_node
  fi
  NODE_PATH=./src env-cmd --no-override -f ./.env npx nodemon --exec npx babel-node ./src/index.ts --inspect --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000
fi