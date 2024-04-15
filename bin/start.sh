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

checkEnvVars(){
  echo "Checking environment variables"
  env_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER" "REACTORY_CLIENT" "REACTORY_PLUGINS")
  do_exit=0
  # Loop over each environment variable and check if it is set and points to a valid directory
  for var in ${env_vars[@]}; do
    if [[ -z "${!var}" ]]; then
      echo -e "$var is not set"
      do_exit=1
    elif [[ ! -d "${!var}" ]]; then
      echo -e "$var is not a valid directory"
      do_exit=1
    else
      echo -e "$var is set and points to a valid directory"
    fi
  done
  
  if [[ $do_exit -eq 1 ]]; then
    echo -e "Please set the environment variables listed above"
    exit 1
  fi
  
  echo "Checked Environment Variables"
}

checkEnvVars

checkMeiliSearch(){
  if curl -f http://localhost:7700/health; then
    echo "MeiliSearch is running."
  else
    echo "MeiliSearch is not running."
    sh ./bin/meilisearch.sh
  fi
  echo "Checked MeiliSearch"
}

checkMeiliSearch

echo "Starting Reactory Development Server key: [${1:-reactory}] target: ${2:-local} environment: ${3:-development}"
sh ./bin/generate.sh ${1:-reactory} ${2:-local}
NODE_PATH=./src env-cmd -f ./config/${1:-reactory}/.env.${2:-local} npx nodemon -e js,ts,tsx,graphql --exec npx babel-node ./src/index.ts --presets @babel/env --extensions ".js,.ts" --max_old_space_size=2000000
 