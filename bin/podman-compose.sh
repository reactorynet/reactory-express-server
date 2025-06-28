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

# Compose script is used to start the docker-compose services with 
# the given configuration name and environment. The script will check
# environment variables and the existence of the docker-compose file

REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-podman}
source ./bin/shared/shell-utils.sh
check_env_vars
check_podman_command
check_podman_compose_command
ENV_FILE=$(get_env_file_path)
export BUILD_VERSION=$(node -p "require('./package.json').version")
echo "🛠️ Loading Environment $ENV_FILE"
# Provide a warning if the environment is not set to podman
if [ $REACTORY_ENV_ID != "podman" ]; then
  echo "⚠️ Environment is not set to podman are you sure you want to proceed?"
  echo "Podman configurations are specific to the podman environment and you need"
  echo "ensure the configuration is correct before proceeding"
  # wait for input to continue
  read -p "Press enter to continue or ctrl+c to exit"
fi
# source the env file
source $ENV_FILE

if [ $PODMAN_CLEAR_CONTAINERS = "true" ]; then
  echo "🧹 Clearing containers for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  podman rm -f $(podman ps -aq --filter "label=io.podman.compose.project=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}")
  # remove the container / project pod as well
  podman pod rm -f $(podman pod ls -q --filter "name=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}")
  # remove all volumes attached to the project
  echo "🧹 Removing volumes for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  podman volume rm -f $(podman volume ls -q --filter "name=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}")
fi

echo "🚀 Launching podman for ${1:-reactory} ${2:-podman} configuration"
podman-compose -f $(pwd)/config/${1:-reactory}/docker-compose.yaml --env-file ./config/${1:-reactory}/.env.${2:-local} ${3:-up} -d