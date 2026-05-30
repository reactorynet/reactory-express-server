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

# Returns a newline-separated list of active module keys for a given client config.
# Uses node (always available in this project) to parse the JSON — avoids a jq dependency.
# Usage: get_active_module_keys <client_key> [modules_dir]
get_active_module_keys() {
  local client_key="${1:-reactory}"
  local modules_dir="${2:-./src/modules}"
  local enabled_file="${modules_dir}/enabled-${client_key}.json"

  if [[ ! -f "$enabled_file" ]]; then
    echo "Warning: enabled modules file not found: ${enabled_file}" >&2
    return 1
  fi

  node -e "require('${enabled_file}').forEach(function(m){ console.log(m.key); })"
}

# ── Tool installation helpers ──────────────────────────────────────────────────

# Detect the available system package manager.
# Prints one of: brew | apt | dnf | yum | unknown
detect_package_manager() {
  if has_command brew;    then echo "brew";    return; fi
  if has_command apt-get; then echo "apt";     return; fi
  if has_command dnf;     then echo "dnf";     return; fi
  if has_command yum;     then echo "yum";     return; fi
  echo "unknown"
}

# Install MongoDB Database Tools (mongodump, mongorestore, etc.)
install_mongo_tools() {
  local pkg_mgr
  pkg_mgr="$(detect_package_manager)"
  echo "Installing MongoDB database tools via: $pkg_mgr"
  case "$pkg_mgr" in
    brew)
      brew install mongodb/brew/mongodb-database-tools
      ;;
    apt)
      if apt-cache show mongodb-database-tools &>/dev/null 2>&1; then
        sudo apt-get install -y mongodb-database-tools
      else
        echo "Adding MongoDB apt repository (7.0)..."
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc \
          | sudo gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" \
          | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        sudo apt-get update -qq
        sudo apt-get install -y mongodb-database-tools
      fi
      ;;
    dnf|yum)
      sudo tee /etc/yum.repos.d/mongodb-org-7.0.repo > /dev/null <<'REPO'
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
REPO
      sudo "$pkg_mgr" install -y mongodb-database-tools
      ;;
    *)
      echo -e "${RED}Cannot auto-install MongoDB tools: no supported package manager found.${NC}"
      echo "Install manually: https://www.mongodb.com/docs/database-tools/installation/"
      return 1
      ;;
  esac
}

# Install PostgreSQL client tools (pg_dump, pg_restore, psql)
install_pg_client() {
  local pkg_mgr
  pkg_mgr="$(detect_package_manager)"
  echo "Installing PostgreSQL client tools via: $pkg_mgr"
  case "$pkg_mgr" in
    brew)
      brew install libpq
      brew link --force libpq
      ;;
    apt)
      sudo apt-get install -y postgresql-client
      ;;
    dnf)
      sudo dnf install -y postgresql
      ;;
    yum)
      sudo yum install -y postgresql
      ;;
    *)
      echo -e "${RED}Cannot auto-install PostgreSQL client: no supported package manager found.${NC}"
      echo "Install manually: https://www.postgresql.org/download/"
      return 1
      ;;
  esac
}

# Ensure MongoDB tools are present; install if missing.
# Returns 0 on success, 1 if tools could not be made available.
ensure_mongo_tools() {
  if has_command mongodump && has_command mongorestore; then
    return 0
  fi
  echo -e "${YELLOW}MongoDB database tools not found. Attempting installation...${NC}"
  if ! install_mongo_tools; then
    echo -e "${RED}MongoDB tools installation failed. Skipping MongoDB operation.${NC}"
    return 1
  fi
  if ! has_command mongodump; then
    echo -e "${RED}MongoDB tools still not available after installation attempt.${NC}"
    return 1
  fi
  echo -e "${GREEN}MongoDB tools ready.${NC}"
}

# Ensure PostgreSQL client tools are present; install if missing.
# Returns 0 on success, 1 if tools could not be made available.
ensure_pg_client() {
  if has_command pg_dump && has_command pg_restore; then
    return 0
  fi
  echo -e "${YELLOW}PostgreSQL client tools not found. Attempting installation...${NC}"
  if ! install_pg_client; then
    echo -e "${RED}PostgreSQL client tools installation failed. Skipping PostgreSQL operation.${NC}"
    return 1
  fi
  if ! has_command pg_dump; then
    echo -e "${RED}PostgreSQL client tools still not available after installation attempt.${NC}"
    return 1
  fi
  echo -e "${GREEN}PostgreSQL client tools ready.${NC}"
}
