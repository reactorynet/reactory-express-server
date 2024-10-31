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
      echo -e "🟩 $var is set and points to a valid directory"
    fi
  done
  
  if [[ $do_exit -eq 1 ]]; then
    echo -e "🟥 Please set the environment variables listed above"
    exit 1
  fi
  
  echo "Checked Environment Variables"
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
  if curl -f http://localhost:7700/health; then
    echo "MeiliSearch is running."
  else
    echo "MeiliSearch is not running."
    sh ./bin/meilisearch.sh
  fi
  echo "Checked MeiliSearch"
}

# function to copy the specified .env file to the root of the project
copy_env_file(){
  cp ./config/${1:-reactory}/.env.${2:-local} .env
  echo "Copied .env file"
}