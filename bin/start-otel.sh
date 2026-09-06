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

# Parse arguments: support --no-nodemon, --bun, --bun-version flags
USE_NODEMON="nodemon"
USE_BUN=false
BUN_VERSION=""
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --no-nodemon)
      USE_NODEMON="no-nodemon"
      ;;
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
    --*)
      # ignore other flags
      ;;
    *)
      POSITIONAL+=("$arg")
      ;;
  esac
done

CLIENT_KEY="${POSITIONAL[0]:-reactory}"
TARGET_ENV="${POSITIONAL[1]:-local}"
[[ -n "${POSITIONAL[2]:-}" ]] && USE_NODEMON="${POSITIONAL[2]}"

copy_env_file "$CLIENT_KEY" "$TARGET_ENV"
source_env_file "$CLIENT_KEY" "$TARGET_ENV"
check_env_vars
check_meili_search

# Verify that the reactory-telemetry module is installed before attempting to
# start with OpenTelemetry.  The module must be cloned into src/modules/ and
# its OTLP instrumentation entry point must exist.
TELEMETRY_MODULE_DIR="./src/modules/reactory-telemetry"
TELEMETRY_ENTRY="$TELEMETRY_MODULE_DIR/reactory.inst.otlp.ts"
if [[ ! -d "$TELEMETRY_MODULE_DIR" ]]; then
  echo "ERROR: The reactory-telemetry module is not installed."
  echo "       Install it with:  bin/install-modules.sh --module reactory-telemetry"
  echo "       Or run the full installer: bin/install.sh"
  exit 1
fi
if [[ ! -f "$TELEMETRY_ENTRY" ]]; then
  echo "ERROR: reactory-telemetry module found but the OTLP entry point is missing:"
  echo "       $TELEMETRY_ENTRY"
  echo "       The module may be incomplete. Try re-installing with: bin/install-modules.sh --module reactory-telemetry"
  exit 1
fi

GEN_EXTRA_ARGS=()
if [[ "$USE_BUN" == "true" ]]; then
  GEN_EXTRA_ARGS+=("--bun")
  [[ -n "$BUN_VERSION" ]] && GEN_EXTRA_ARGS+=("--bun-version=$BUN_VERSION")
fi

echo "Starting Reactory Development Server (OTEL) key: [${CLIENT_KEY}] target: ${TARGET_ENV} watch: ${USE_NODEMON} runtime: $([[ "$USE_BUN" == "true" ]] && echo 'bun' || echo 'node')"
sh ./bin/generate.sh "$CLIENT_KEY" "$TARGET_ENV" "${GEN_EXTRA_ARGS[@]}"
# Start the application with OpenTelemetry configuration
if [[ "$USE_BUN" == "true" ]]; then
  ensure_bun "$BUN_VERSION" || exit 1
  if [[ "$USE_NODEMON" == "no-nodemon" ]]; then
    NODE_PATH=./src env-cmd --no-override -f ./.env -- bun run -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts
  else
    NODE_PATH=./src env-cmd --no-override -f ./.env -- bun --watch -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts
  fi
else
  if type check_node &>/dev/null; then
    check_node
  fi
  if [[ "$USE_NODEMON" == "no-nodemon" ]]; then
    NODE_PATH=./src env-cmd --no-override -f ./.env -- npx babel-node --extensions '.js,.ts' -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts --presets @babel/env --max_old_space_size=2000000
  else
    NODE_PATH=./src env-cmd --no-override -f ./.env -- npx nodemon -e js,ts,tsx,graphql --exec "babel-node --extensions '.js,.ts' -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts" --presets @babel/env --max_old_space_size=2000000
  fi
fi
 