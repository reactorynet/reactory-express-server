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
if [[ $REACTORY_ENV_ID != podman* ]]; then
  echo "⚠️ Environment is not set to podman are you sure you want to proceed?"
  echo "Podman configurations are specific to the podman environment and you need"
  echo "ensure the configuration is correct before proceeding"
  # wait for input to continue
  read -p "Press enter to continue or ctrl+c to exit"
fi
# source the env file and export all variables so podman-compose can resolve them
set -a
source $ENV_FILE
set +a

# Check if PODMAN_COMPOSE_PROJECT_NAME is set
if [ -z "$PODMAN_COMPOSE_PROJECT_NAME" ]; then
  echo "❗ PODMAN_COMPOSE_PROJECT_NAME is not set in the environment file $ENV_FILE"
  echo "Please set the PODMAN_COMPOSE_PROJECT_NAME variable to a unique name for your project"
  exit 1
fi



# Check if we need to clear existing containers
if [ "$PODMAN_CLEAR_CONTAINERS" = "true" ]; then
  echo "🧹 Clearing containers for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  
  # Get container IDs with error handling
  CONTAINER_IDS=$(podman ps -aq --filter "label=io.podman.compose.project=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}" 2>/dev/null)
  if [ -n "$CONTAINER_IDS" ]; then
    podman rm -f $CONTAINER_IDS
  else
    echo "ℹ️  No containers found for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  fi
  
  # Get pod IDs with error handling
  POD_IDS=$(podman pod ls -q --filter "name=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}" 2>/dev/null)
  if [ -n "$POD_IDS" ]; then
    podman pod rm -f $POD_IDS
  else
    echo "ℹ️  No pods found for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  fi
  
  # Remove volumes with error handling
  echo "🧹 Removing volumes for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  VOLUME_IDS=$(podman volume ls -q --filter "name=${PODMAN_COMPOSE_PROJECT_NAME:-reactory}" 2>/dev/null)
  if [ -n "$VOLUME_IDS" ]; then
    podman volume rm -f $VOLUME_IDS
  else
    echo "ℹ️  No volumes found for project ${PODMAN_COMPOSE_PROJECT_NAME:-reactory}"
  fi
fi

# Validate the docker-compose file before running
COMPOSE_FILE="$(pwd)/config/${1:-reactory}/${DOCKER_COMPOSE_FILENAME:-docker-compose.yaml}"
echo "🔍 Validating compose file: $COMPOSE_FILE"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Error: Compose file not found: $COMPOSE_FILE"
  exit 1
fi

# Validate YAML syntax using Node.js
if ! node -e "const yaml = require('yaml'); const fs = require('fs'); try { yaml.parse(fs.readFileSync('$COMPOSE_FILE', 'utf8')); } catch(e) { console.error('YAML Error:', e.message); process.exit(1); }" 2>/dev/null; then
  echo "❌ Error: Invalid YAML syntax in compose file"
  echo "Please check the file for indentation issues"
  exit 1
fi

# ── Local image preflight ─────────────────────────────────────────────────────
# Verify that the reactory application images exist in the local podman store
# before launching. Without this check podman-compose would attempt an HTTPS
# pull from localhost (which is not a running registry) and produce a confusing
# "connection refused" error.
REQUIRED_IMAGES=(
  "localhost/${REACTORY_CONFIG_ID:-reactory}/reactory-express-server:${BUILD_VERSION}"
)
MISSING_IMAGES=()
for img in "${REQUIRED_IMAGES[@]}"; do
  if ! podman image exists "$img" 2>/dev/null; then
    MISSING_IMAGES+=("$img")
  fi
done

if [ ${#MISSING_IMAGES[@]} -gt 0 ]; then
  echo ""
  echo "❌ The following images are not present in the local podman store:"
  for img in "${MISSING_IMAGES[@]}"; do
    echo "   • $img"
  done
  echo ""
  echo "   Build them first with:"
  echo "   bin/build-image.sh ${REACTORY_CONFIG_ID:-reactory} ${REACTORY_ENV_ID:-local}"
  echo ""
  exit 1
fi
echo "✅ All required images found in local podman store"

echo "🚀 Launching podman for ${1:-reactory} ${2:-podman} configuration"
podman-compose -f "$COMPOSE_FILE" -p "${PODMAN_COMPOSE_PROJECT_NAME:-reactory-fullstack}" --env-file "./config/${1:-reactory}/.env.${2:-local}" ${3:-up} -d