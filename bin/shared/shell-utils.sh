# Path: bin/shared/shell-utils.sh

# Checks the environment variables
check_env_vars(){
  echo "Checking environment variables"
  env_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER" "REACTORY_CLIENT" "REACTORY_PLUGINS")
  do_exit=0
  # Loop over each environment variable and check if it is set and points to a valid directory
  for var in ${env_vars[@]}; do
    if [[ -z "${!var}" ]]; then
      echo -e "$var is not set"
      do_exit=1
    elif [[ ! -d "${!var}" ]]; then
      echo -e "🟥 $var is not a valid directory"
      do_exit=1
    else
      echo -e "🟩 $var is valid"
    fi
  done
  
  if [[ $do_exit -eq 1 ]]; then
    echo -e "🟥 Please set the environment variables listed above"
    exit 1
  fi
}

# Checks if a command is available
has_command() {
  command -v "$1" >/dev/null 2>&1
}

# checks if a node package is installed
package_exists() {
  local package_name="$1"
  local installed_packages
  installed_packages=$(npm list --depth 1 -g "$package_name" 2>/dev/null | grep "$package_name")

  if [[ -n "$installed_packages" ]]; then
    echo "Package $package_name is installed"
  else
    echo "Package $package_name is not installed"
  fi
}

# Checks if MeiliSearch is running
check_meili_search(){
  if curl -f $MEILISEARCH_HOST; then
    echo "MeiliSearch is running."
  else
    echo "MeiliSearch is not running. Please check Docker or install MeiliSearch"
  fi
  echo "Checked MeiliSearch"
}

# function to copy the specified .env file to the root of the project
copy_env_file(){
  cp ./config/${1:-reactory}/.env.${2:-local} .env
  echo "Copied .env file"
}

package_version(){
  node -p "require('./package.json').version"
}

# function to check if node is installed
check_node(){
  # use the has_command function to check
  if has_command node; then
    echo "🟩 Node is installed"
  else
    echo "🟥 Node is not installed. Please install the node runtime using nvm."
    exit 1
  fi
}

check_podman_command(){
  if has_command podman; then
    echo "🟩 Podman is installed"
  else
    echo "🟥 Podman is not installed. Please install podman."
    exit 1
  fi
}

check_podman_compose_command(){
  if has_command podman-compose; then
    echo "🟩 Podman-Compose is installed"
  else
    echo "🟥 Podman-Compose is not installed. Please install podman-compose."
    exit 1
  fi
}

get_env_file_path(){
  echo "$REACTORY_SERVER/config/${REACTORY_CONFIG_ID:-reactory}/.env.${REACTORY_ENV_ID:-local}"
}