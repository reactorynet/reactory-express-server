#!/bin/bash

# Checks the environment variables
check_env_vars(){
  echo "Checking environment variables"
  dev_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER" "REACTORY_CLIENT" "REACTORY_PLUGINS")
  prd_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER")
  do_exit=0
  # Loop over each environment variable and check if it is set and points to a valid directory
  for var in ${env_vars[@]}; do
    name="${!var}"
    if [[ -z "${!var}" ]]; then
      echo -e "$var is not set"
      do_exit=1
    elif [[ ! -d "${!var}" ]]; then
      echo -e "🟥 $var=$name [not-found]"
      do_exit=1
    else
      echo -e "🟩 $var=$name"
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

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $@" >> "$log_file" 2>&1
}

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Animation characters for spinning indicator
SPIN_CHARS="/-\\|"

# Function to display a progress bar with animation
# Usage: progress_bar current total [width] [color] [animate]
# - current: Current progress value
# - total: Total value to reach
# - width: Optional width of progress bar (default: 50)
# - color: Optional color (red, green, blue, yellow, default: none)
# - animate: Optional animation flag (yes/no, default: no)
progress_bar() {
    local current=$1
    local total=$2
    local width=${3:-50}  # Default width is 50 if not specified
    local color=${4:-none} # Default to no color
    local animate=${5:-no}  # Default to no animation
    
    # Calculate percentage
    local percent=$((current * 100 / total))
    
    # Calculate number of filled bar segments
    local filled=$((width * current / total))
    local empty=$((width - filled))
    
    # Build the progress bar
    local bar=""
    for ((i = 0; i < filled; i++)); do
        bar="${bar}█"
    done
    for ((i = 0; i < empty; i++)); do
        bar="${bar} "
    done
    
    # Apply color based on parameter
    local color_start=""
    local color_end=""
    case "$color" in
        red)
            color_start=$RED
            color_end=$NC
            ;;
        green)
            color_start=$GREEN
            color_end=$NC
            ;;
        blue)
            color_start=$BLUE
            color_end=$NC
            ;;
        yellow)
            color_start=$YELLOW
            color_end=$NC
            ;;
        *)
            color_start=""
            color_end=""
            ;;
    esac
    
    # Handle animation
    local spinner=""
    if [ "$animate" = "yes" ]; then
        # Use process ID and current value to cycle through spin characters
        local spin_index=$(( ($$ + current) % 4 ))
        spinner="${SPIN_CHARS:spin_index:1} "
    fi
    
    # Print the progress bar with color and optional animation
    printf "\r${spinner}Progress: ${color_start}[%s] %d%%${color_end}" "$bar" "$percent"
    
    # Add newline when complete and clear animation
    if [ "$current" -eq "$total" ]; then
        printf "\rProgress: ${color_start}[%s] %d%%${color_end}\n" "$bar" "$percent"
    fi
}