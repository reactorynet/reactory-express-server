#!/bin/bash

# Checks the environment variables
# Usage: check_env_vars [dev|prd]  (default: dev)
check_env_vars(){
  echo "Checking environment variables"
  dev_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER" "REACTORY_CLIENT" "REACTORY_PLUGINS")
  prd_vars=("REACTORY_HOME" "REACTORY_DATA" "REACTORY_SERVER")
  local mode="${1:-dev}"
  local vars_to_check=("${dev_vars[@]}")
  if [ "$mode" = "prd" ]; then
    vars_to_check=("${prd_vars[@]}")
  fi
  do_exit=0
  # Loop over each environment variable and check if it is set and points to a valid directory
  for var in "${vars_to_check[@]}"; do
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

# ── Environment Resolution and Setup ──────────────────────────────────────────
# Merges base_file and override_file into output_file using awk so that
# override keys replace base keys in-place and brand new keys are appended.
# Each variable key appears exactly once.
merge_dotenv_files() {
  local base_file="$1"
  local override_file="$2"
  local output_file="$3"

  awk -F '=' '
    NR==FNR {
      line=$0
      sub(/^[ \t]+/, "", line)
      if (line !~ /^#/ && line ~ /=/) {
        split(line, parts, "=")
        key=parts[1]
        sub(/[ \t]+$/, "", key)
        override[key]=substr(line, length(key)+2)
        override_seen[key]=0
      }
      next
    }
    {
      line=$0
      trimmed=line
      sub(/^[ \t]+/, "", trimmed)
      if (trimmed !~ /^#/ && trimmed ~ /=/) {
        split(trimmed, parts, "=")
        key=parts[1]
        sub(/[ \t]+$/, "", key)
        if (key in override) {
          print key "=" override[key]
          override_seen[key]=1
          next
        }
      }
      print $0
    }
    END {
      has_new=0
      for (k in override) {
        if (override_seen[k] == 0) {
          if (has_new == 0) {
            print "\n# ── Additional Environment Overrides ──"
            has_new=1
          }
          print k "=" override[k]
        }
      }
    }
  ' "$override_file" "$base_file" > "$output_file"
}

# Resolves base .env (without environment) and optional override .env.<target_env>.
# In production, when .env.<target_env> does not exist, the base .env is used cleanly.
# If both exist in config/, they are merged into .env with override values taking precedence.
resolve_env_files() {
  local client_key="${1:-reactory}"
  local target_env="${2:-local}"
  local server_root="${REACTORY_SERVER:-$(pwd)}"

  CONFIG_BASE_ENV=""
  CONFIG_OVERRIDE_ENV=""
  ROOT_ENV=""

  # 1. Check for configuration files inside config/<client_key>
  if [[ -f "${server_root}/config/${client_key}/.env" ]]; then
    CONFIG_BASE_ENV="${server_root}/config/${client_key}/.env"
  elif [[ -f "./config/${client_key}/.env" ]]; then
    CONFIG_BASE_ENV="./config/${client_key}/.env"
  fi

  if [[ -n "$target_env" ]]; then
    if [[ -f "${server_root}/config/${client_key}/.env.${target_env}" ]]; then
      CONFIG_OVERRIDE_ENV="${server_root}/config/${client_key}/.env.${target_env}"
    elif [[ -f "./config/${client_key}/.env.${target_env}" ]]; then
      CONFIG_OVERRIDE_ENV="./config/${client_key}/.env.${target_env}"
    fi
  fi

  # 2. Check for root .env (used in deployed production or standalone runs)
  if [[ -f "${server_root}/.env" ]]; then
    ROOT_ENV="${server_root}/.env"
  elif [[ -f "./.env" ]]; then
    ROOT_ENV="./.env"
  fi

  if [[ -z "$CONFIG_BASE_ENV" && -z "$CONFIG_OVERRIDE_ENV" && -z "$ROOT_ENV" ]]; then
    echo -e "${RED}Error: No environment configuration file found.${NC}" >&2
    echo "  Checked: ./config/${client_key}/.env, ./config/${client_key}/.env.${target_env}, ./.env" >&2
    return 1
  fi

  return 0
}

# Copies / merges the resolved environment files to the project root .env
copy_env_file(){
  local client_key="${1:-reactory}"
  local target_env="${2:-local}"
  local server_root="${REACTORY_SERVER:-$(pwd)}"
  local target_file="${server_root}/.env"

  resolve_env_files "$client_key" "$target_env" || return 1

  # Case 1: Both config base and override exist in config/ -> Clean merge without duplicate keys
  if [[ -n "$CONFIG_BASE_ENV" && -n "$CONFIG_OVERRIDE_ENV" ]]; then
    echo "📄 Merging base environment ($CONFIG_BASE_ENV) and override ($CONFIG_OVERRIDE_ENV) into .env"
    merge_dotenv_files "$CONFIG_BASE_ENV" "$CONFIG_OVERRIDE_ENV" "${target_file}.tmp"
    mv "${target_file}.tmp" "$target_file"
    echo "🟩 Clean merged environment written to $target_file"

  # Case 2: Only config override exists (e.g. config/reactory/.env.local in dev) -> Copy directly
  elif [[ -n "$CONFIG_OVERRIDE_ENV" ]]; then
    local override_real=""
    local target_real=""
    override_real="$(cd "$(dirname "$CONFIG_OVERRIDE_ENV")" 2>/dev/null && pwd)/$(basename "$CONFIG_OVERRIDE_ENV")"
    [[ -f "$target_file" ]] && target_real="$(cd "$(dirname "$target_file")" 2>/dev/null && pwd)/$(basename "$target_file")"

    if [[ "$override_real" != "$target_real" ]]; then
      echo "📄 Copying environment ($CONFIG_OVERRIDE_ENV) to $target_file"
      cp "$CONFIG_OVERRIDE_ENV" "$target_file"
    fi
    echo "🟩 Using environment: $CONFIG_OVERRIDE_ENV"

  # Case 3: Only config base exists (e.g. config/reactory/.env in prod) -> Copy directly
  elif [[ -n "$CONFIG_BASE_ENV" ]]; then
    local base_real=""
    local target_real=""
    base_real="$(cd "$(dirname "$CONFIG_BASE_ENV")" 2>/dev/null && pwd)/$(basename "$CONFIG_BASE_ENV")"
    [[ -f "$target_file" ]] && target_real="$(cd "$(dirname "$target_file")" 2>/dev/null && pwd)/$(basename "$target_file")"

    if [[ "$base_real" != "$target_real" ]]; then
      echo "📄 Copying base environment ($CONFIG_BASE_ENV) to $target_file"
      cp "$CONFIG_BASE_ENV" "$target_file"
    fi
    echo "🟩 Using base environment: $CONFIG_BASE_ENV"

  # Case 4: No config/ files exist, but root ./.env exists (deployed production container/VM)
  elif [[ -n "$ROOT_ENV" ]]; then
    echo "🟩 Using existing production environment: $ROOT_ENV"
  fi

  return 0
}

# Sources environment variables into the calling shell (exporting them).
# Safely parses dotenv lines without triggering shell metacharacter expansion (like &, <, >).
source_env_file(){
  local client_key="${1:-reactory}"
  local target_env="${2:-local}"

  resolve_env_files "$client_key" "$target_env" || return 1

  _load_dotenv_file() {
    local f="$1"
    [[ ! -f "$f" ]] && return 0
    while IFS= read -r line || [[ -n "$line" ]]; do
      local trimmed="${line#"${line%%[![:space:]]*}"}"
      [[ -z "$trimmed" || "$trimmed" == \#* ]] && continue
      [[ "$trimmed" != *"="* ]] && continue
      local key="${trimmed%%=*}"
      key="${key%"${key##*[![:space:]]}"}"
      key="${key#export }"
      local val="${trimmed#*=}"
      val="${val#\"}"
      val="${val%\"}"
      val="${val#\'}"
      val="${val%\'}"
      export "$key=$val" 2>/dev/null || true
    done < "$f"
  }

  if [[ -n "$CONFIG_BASE_ENV" ]]; then
    _load_dotenv_file "$CONFIG_BASE_ENV"
  fi
  if [[ -n "$CONFIG_OVERRIDE_ENV" ]]; then
    _load_dotenv_file "$CONFIG_OVERRIDE_ENV"
  elif [[ -z "$CONFIG_BASE_ENV" && -n "$ROOT_ENV" ]]; then
    _load_dotenv_file "$ROOT_ENV"
  fi

  return 0
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

check_bun_command(){
  if [[ -d "$HOME/.bun/bin" && ":$PATH:" != *":$HOME/.bun/bin:"* ]]; then
    export PATH="$HOME/.bun/bin:$PATH"
  fi
  if has_command bun; then
    echo "🟩 Bun is installed ($(bun --version 2>/dev/null || echo 'unknown'))"
    return 0
  else
    echo "🟥 Bun is not installed."
    return 1
  fi
}

ensure_bun(){
  local target_version="${1:-}"

  if [[ -d "$HOME/.bun/bin" && ":$PATH:" != *":$HOME/.bun/bin:"* ]]; then
    export PATH="$HOME/.bun/bin:$PATH"
  fi

  if has_command bun; then
    local current_version
    current_version="$(bun --version 2>/dev/null || echo "")"
    if [[ -n "$target_version" && "$current_version" != "$target_version"* ]]; then
      echo "ℹ️  Bun is installed (${current_version}), but version ${target_version} was requested."
      if has_command npm; then
        echo "🔄 Installing bun@${target_version} via npm..."
        npm install -g "bun@${target_version}" 2>/dev/null || true
      fi
    fi
    echo "🟩 Bun is ready ($(bun --version 2>/dev/null || echo 'unknown'))"
    return 0
  fi

  echo "⚠️  Bun not found in PATH. Checking alternative installation methods..."
  if has_command npm; then
    echo "📦 Attempting to install bun via npm..."
    npm install -g "bun${target_version:+@$target_version}" 2>/dev/null || true
    if has_command bun; then
      echo "🟩 Bun installed successfully ($(bun --version 2>/dev/null))"
      return 0
    fi
  fi

  if has_command curl; then
    echo "📦 Attempting to install bun via official script..."
    if [[ -n "$target_version" ]]; then
      curl -fsSL https://bun.sh/install | bash -s "bun-v${target_version}" 2>/dev/null || true
    else
      curl -fsSL https://bun.sh/install | bash 2>/dev/null || true
    fi
    if [[ -d "$HOME/.bun/bin" && ":$PATH:" != *":$HOME/.bun/bin:"* ]]; then
      export PATH="$HOME/.bun/bin:$PATH"
    fi
    if has_command bun; then
      echo "🟩 Bun installed successfully ($(bun --version 2>/dev/null))"
      return 0
    fi
  fi

  echo -e "${RED}Error: Bun is not installed and could not be auto-installed.${NC}" >&2
  echo "Please install bun manually: curl -fsSL https://bun.sh/install | bash" >&2
  return 1
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
  local client_key="${1:-${REACTORY_CONFIG_ID:-reactory}}"
  local target_env="${2:-${REACTORY_ENV_ID:-local}}"
  local server_root="${REACTORY_SERVER:-$(pwd)}"

  if [[ -n "$target_env" && -f "${server_root}/config/${client_key}/.env.${target_env}" ]]; then
    echo "${server_root}/config/${client_key}/.env.${target_env}"
  elif [[ -f "${server_root}/config/${client_key}/.env" ]]; then
    echo "${server_root}/config/${client_key}/.env"
  elif [[ -f "${server_root}/.env" ]]; then
    echo "${server_root}/.env"
  else
    echo "${server_root}/config/${client_key}/.env.${target_env}"
  fi
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
