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

# Parse arguments: support --no-nodemon flag anywhere in the args list
USE_NODEMON="nodemon"
POSITIONAL=()

for arg in "$@"; do
  case "$arg" in
    --no-nodemon)
      USE_NODEMON="no-nodemon"
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

copy_env_file "$CLIENT_KEY" "$TARGET_ENV"

echo "Starting Reactory Development Server key: [${CLIENT_KEY}] target: ${TARGET_ENV} watch: ${USE_NODEMON}"
sh ./bin/generate.sh "$CLIENT_KEY" "$TARGET_ENV"
# TODO: Update the start script so that it checks the loaded modules
# and runs any pre-start scripts that are available in the module.
if [[ "$USE_NODEMON" == "no-nodemon" ]]; then
  NODE_PATH=./src env-cmd -f ./config/${CLIENT_KEY}/.env.${TARGET_ENV} npx babel-node ./src/index.ts --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000
else
  NODE_PATH=./src env-cmd -f ./config/${CLIENT_KEY}/.env.${TARGET_ENV} npx nodemon -e js,ts,tsx,graphql --ignore 'docker/**' --exec npx babel-node ./src/index.ts --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000
fi
