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
echo "Starting Reactory Development Server key: [${1:-reactory}] target: ${2:-local} environment: ${3:-development}"
sh ./bin/generate.sh ${1:-reactory} ${2:-local}
# Start the application with OpenTelemetry configuration
NODE_PATH=./src env-cmd -f ./config/${1:-reactory}/.env.${2:-local} npx nodemon -e js,ts,tsx,graphql --exec "babel-node --extensions '.js,.ts' -r ./src/modules/reactory-telemetry/reactory.inst.otlp.ts ./src/index.ts" --presets @babel/env --max_old_space_size=2000000
 