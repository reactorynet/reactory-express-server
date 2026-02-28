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
check_env_vars
check_meili_search
copy_env_file ${1:-reactory} ${2:-local}

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

# $3 - Use "no-nodemon" to run without nodemon (default: uses nodemon)
USE_NODEMON=${3:-nodemon}

echo "Starting Reactory Development Server (OTEL) key: [${1:-reactory}] target: ${2:-local} watch: ${USE_NODEMON}"
sh ./bin/generate.sh ${1:-reactory} ${2:-local}
# Start the application with OpenTelemetry configuration
if [[ "$USE_NODEMON" == "no-nodemon" ]]; then
  NODE_PATH=./src env-cmd -f ./config/${1:-reactory}/.env.${2:-local} npx babel-node --extensions '.js,.ts' -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts --presets @babel/env --max_old_space_size=2000000
else
  NODE_PATH=./src env-cmd -f ./config/${1:-reactory}/.env.${2:-local} npx nodemon -e js,ts,tsx,graphql --exec "babel-node --extensions '.js,.ts' -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts" --presets @babel/env --max_old_space_size=2000000
fi
 