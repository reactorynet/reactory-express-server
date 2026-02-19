#!/usr/bin/env bash
# ============================================================================
# Reactory Platform Installer
# Configures the express server, data/CDN, and PWA client.
# Designed to be curl-piped:
#   bash <(curl -fsSL https://raw.githubusercontent.com/reactorynet/reactory-express-server/master/bin/install.sh)
# Or run locally:
#   bash bin/install.sh
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Constants & Colors
# ---------------------------------------------------------------------------
readonly REACTORY_NODE_VERSION="20.19.4"
readonly REACTORY_NVM_VERSION="0.39.7"
readonly REACTORY_GITHUB_ORG="reactorynet"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m'

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
info()    { printf "${BLUE}[INFO]${NC}    %s\n" "$*"; }
success() { printf "${GREEN}[OK]${NC}      %s\n" "$*"; }
warn()    { printf "${YELLOW}[WARN]${NC}    %s\n" "$*"; }
error()   { printf "${RED}[ERROR]${NC}   %s\n" "$*"; }
banner()  { printf "\n${CYAN}${BOLD}── %s ──${NC}\n\n" "$*"; }

confirm() {
  local prompt="${1:-Continue?}"
  local default="${2:-y}"
  local yn
  if [[ "$default" == "y" ]]; then
    read -rp "$(printf "${BOLD}%s [Y/n]: ${NC}" "$prompt")" yn
    yn="${yn:-y}"
  else
    read -rp "$(printf "${BOLD}%s [y/N]: ${NC}" "$prompt")" yn
    yn="${yn:-n}"
  fi
  [[ "$yn" =~ ^[Yy] ]]
}

prompt_value() {
  local prompt="$1"
  local default="$2"
  local value
  read -rp "$(printf "${BOLD}%s${NC} [${default}]: " "$prompt")" value
  echo "${value:-$default}"
}

has_command() { command -v "$1" &>/dev/null; }

# Safe brew install: skips already-installed formulae and resolves symlink/link conflicts.
# When `brew install` fails only because of a `brew link` conflict (the bottle was poured
# successfully but symlinking failed), it retries with `brew link --overwrite` so the
# installer does not abort under `set -euo pipefail`.
brew_install() {
  local pkg="$1"
  if brew list --formula "$pkg" &>/dev/null; then
    success "$pkg is already installed"
    return 0
  fi
  if brew install "$pkg"; then
    return 0
  fi
  # The bottle may have been poured but the link step failed (e.g. conflicting symlinks
  # from a differently-named formula like wxwidgets vs wxwidgets@3.2).  If the formula
  # is now present in the cellar, attempt an overwrite link instead of aborting.
  if brew list --formula "$pkg" &>/dev/null; then
    warn "brew install $pkg encountered a link conflict — running: brew link --overwrite $pkg"
    brew link --overwrite "$pkg" \
      || warn "Could not link $pkg. You may need to run: brew link --overwrite $pkg"
  else
    error "Failed to install $pkg via Homebrew."
    return 1
  fi
}

require_command() {
  if ! has_command "$1"; then
    error "$1 is required but not found. $2"
    return 1
  fi
}

validate_directory() {
  local dir="$1"
  local parent_dir
  parent_dir="$(dirname "$dir")"
  
  if [[ ! -d "$parent_dir" ]]; then
    error "Parent directory does not exist: $parent_dir"
    error "Please create the parent directory first or choose a different location."
    return 1
  fi
  
  if [[ ! -w "$parent_dir" ]]; then
    error "Parent directory is not writable: $parent_dir"
    error "Please check permissions or choose a different location."
    return 1
  fi
  
  return 0
}

# ---------------------------------------------------------------------------
# OS Detection
# ---------------------------------------------------------------------------
detect_os() {
  local uname_s
  uname_s="$(uname -s)"
  case "$uname_s" in
    Linux*)  OS="linux"  ;;
    Darwin*) OS="darwin" ;;
    MINGW*|CYGWIN*|MSYS*) OS="windows" ;;
    *)       OS="unknown" ;;
  esac

  ARCH="$(uname -m)"
  if [[ "$OS" == "linux" ]]; then
    if has_command apt-get; then
      PKG_MANAGER="apt"
    elif has_command dnf; then
      PKG_MANAGER="dnf"
    elif has_command yum; then
      PKG_MANAGER="yum"
    elif has_command pacman; then
      PKG_MANAGER="pacman"
    else
      PKG_MANAGER="unknown"
    fi
  elif [[ "$OS" == "darwin" ]]; then
    PKG_MANAGER="brew"
  fi
}

# ---------------------------------------------------------------------------
# Welcome
# ---------------------------------------------------------------------------
print_welcome() {
  printf "\n"
  printf "${CYAN}${BOLD}"
  printf "  ██████╗ ███████╗ █████╗  ██████╗████████╗ ██████╗ ██████╗ ██╗   ██╗\n"
  printf "  ██╔══██╗██╔════╝██╔══██╗██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗╚██╗ ██╔╝\n"
  printf "  ██████╔╝█████╗  ███████║██║        ██║   ██║   ██║██████╔╝ ╚████╔╝\n"
  printf "  ██╔══██╗██╔══╝  ██╔══██║██║        ██║   ██║   ██║██╔══██╗  ╚██╔╝\n"
  printf "  ██║  ██║███████╗██║  ██║╚██████╗   ██║   ╚██████╔╝██║  ██║   ██║\n"
  printf "  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝\n"
  printf "${NC}\n"
  printf "  ${CYAN}Build Anything Fast${NC} — ${BOLD}Platform Installer v1.0${NC}\n"
  printf "\n"
  info "Detected OS: ${BOLD}${OS}${NC} (${ARCH})"
  info "Package manager: ${BOLD}${PKG_MANAGER:-none}${NC}"
  printf "\n"
  info "This installer will guide you through setting up:"
  info "  1. System dependencies (git, build tools, libraries)"
  info "  2. Node.js via nvm (v${REACTORY_NODE_VERSION})"
  info "  3. Git repositories (server, client, core, data)"
  info "  4. Environment configuration"
  info "  5. Module and client configuration"
  info "  6. Reactory Core library build"
  info "  7. Dependency installation (yarn)"
  printf "\n"
}

# ---------------------------------------------------------------------------
# Step 1: System Dependencies
# ---------------------------------------------------------------------------
install_system_deps() {
  banner "Step 1/7: System Dependencies"

  # --- git ---
  if has_command git; then
    success "git is installed ($(git --version))"
  else
    info "Installing git..."
    case "$PKG_MANAGER" in
      apt)    sudo apt-get update && sudo apt-get install -y git ;;
      dnf)    sudo dnf install -y git ;;
      yum)    sudo yum install -y git ;;
      pacman) sudo pacman -S --noconfirm git ;;
      brew)   brew_install git ;;
      *)      error "Cannot auto-install git. Please install it manually." ; exit 1 ;;
    esac
  fi

  # --- curl ---
  if has_command curl; then
    success "curl is installed"
  else
    info "Installing curl..."
    case "$PKG_MANAGER" in
      apt)    sudo apt-get install -y curl ;;
      dnf)    sudo dnf install -y curl ;;
      brew)   : ;; # macOS always has curl
      *)      error "Please install curl manually." ; exit 1 ;;
    esac
  fi

  # --- build tools & canvas dependencies ---
  if confirm "Install build tools and native library dependencies (required for PDF/canvas rendering)?"; then
    case "$PKG_MANAGER" in
      apt)
        info "Installing build-essential and canvas dependencies..."
        sudo apt-get update
        sudo apt-get install -y build-essential libcairo2-dev libpango1.0-dev \
          libjpeg-dev libgif-dev librsvg2-dev
        ;;
      dnf|yum)
        info "Installing development tools and canvas dependencies..."
        sudo "$PKG_MANAGER" groupinstall -y "Development Tools"
        sudo "$PKG_MANAGER" install -y cairo-devel pango-devel libjpeg-turbo-devel \
          giflib-devel librsvg2-devel
        ;;
      brew)
        info "Installing canvas dependencies via Homebrew..."
        if ! has_command brew; then
          error "Homebrew not found. Install from https://brew.sh"
          exit 1
        fi
        for pkg in pkg-config cairo pango libpng jpeg giflib librsvg; do
          brew_install "$pkg"
        done
        ;;
      *)
        warn "Automatic dependency install not supported for your package manager."
        warn "Please install canvas dependencies manually:"
        warn "  https://github.com/Automattic/node-canvas#installation"
        ;;
    esac
    success "System dependencies installed"
  else
    warn "Skipping system dependencies — canvas/PDF features may not work"
  fi
}

# ---------------------------------------------------------------------------
# Step 2: nvm & Node.js
# ---------------------------------------------------------------------------
install_node() {
  banner "Step 2/7: Node.js (via nvm)"

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    success "nvm is already installed at $NVM_DIR"
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
  else
    if confirm "Install nvm (Node Version Manager)?"; then
      info "Installing nvm v${REACTORY_NVM_VERSION}..."
      curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/v${REACTORY_NVM_VERSION}/install.sh" | bash
      export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
      # shellcheck source=/dev/null
      source "$NVM_DIR/nvm.sh"
      success "nvm installed"
    else
      warn "Skipping nvm install. Ensure Node ${REACTORY_NODE_VERSION} is available."
    fi
  fi

  if has_command nvm 2>/dev/null || type nvm &>/dev/null; then
    local current_node
    current_node="$(nvm current 2>/dev/null || echo "none")"
    if [[ "$current_node" == "v${REACTORY_NODE_VERSION}" ]]; then
      success "Node ${REACTORY_NODE_VERSION} is already active"
    else
      info "Installing and activating Node ${REACTORY_NODE_VERSION}..."
      nvm install "${REACTORY_NODE_VERSION}"
      nvm use "${REACTORY_NODE_VERSION}"
      success "Node $(node --version) active"
    fi
  else
    if has_command node; then
      warn "nvm not available, using system node: $(node --version)"
    else
      error "Node.js is not installed and nvm could not be loaded."
      error "Please install Node ${REACTORY_NODE_VERSION} manually."
      exit 1
    fi
  fi

  # --- yarn ---
  if has_command yarn; then
    success "yarn is installed ($(yarn --version))"
  else
    info "Installing yarn..."
    if has_command corepack; then
      corepack enable
      corepack prepare yarn@stable --activate 2>/dev/null || npm install -g yarn
    else
      npm install -g yarn
    fi
    success "yarn installed"
  fi

  # --- env-cmd ---
  if has_command env-cmd; then
    success "env-cmd is installed"
  else
    info "Installing env-cmd globally..."
    npm install -g env-cmd
    success "env-cmd installed"
  fi
}

# ---------------------------------------------------------------------------
# Step 3: Directory Layout & Git Clones
# ---------------------------------------------------------------------------
setup_repos() {
  banner "Step 3/7: Repositories"

  local default_home="${REACTORY_HOME:-$HOME/reactory}"
  local validated=false
  
  while [[ "$validated" == false ]]; do
    REACTORY_HOME=$(prompt_value "Reactory root directory" "$default_home")
    REACTORY_HOME="${REACTORY_HOME/#\~/$HOME}"
    
    if validate_directory "$REACTORY_HOME"; then
      validated=true
    else
      warn "Please enter a valid directory path."
      if ! confirm "Try again?"; then
        error "Installation cancelled by user."
        exit 1
      fi
    fi
  done

  info "Using root: ${BOLD}${REACTORY_HOME}${NC}"
  mkdir -p "$REACTORY_HOME"

  REACTORY_SERVER="$REACTORY_HOME/reactory-express-server"
  REACTORY_CLIENT="$REACTORY_HOME/reactory-pwa-client"
  REACTORY_CORE="$REACTORY_HOME/reactory-core"
  REACTORY_DATA="$REACTORY_HOME/reactory-data"
  REACTORY_NATIVE="$REACTORY_HOME/reactory-native"
  REACTORY_PLUGINS="$REACTORY_DATA/plugins"

  printf "\n"
  info "Repository layout:"
  info "  Server  -> ${REACTORY_SERVER}"
  info "  Client  -> ${REACTORY_CLIENT}"
  info "  Core    -> ${REACTORY_CORE}"
  info "  Data    -> ${REACTORY_DATA}"
  printf "\n"

  local use_ssh="y"
  if confirm "Use SSH for git clone? (No = HTTPS)"; then
    use_ssh="y"
  else
    use_ssh="n"
  fi

  clone_repo() {
    local name="$1" dir="$2" ssh_url="$3" https_url="$4"
    if [[ -d "$dir/.git" ]]; then
      success "$name already cloned at $dir"
      return
    fi
    local url
    [[ "$use_ssh" == "y" ]] && url="$ssh_url" || url="$https_url"
    info "Cloning $name..."
    git clone "$url" "$dir"
    success "$name cloned"
  }

  clone_repo "reactory-express-server" "$REACTORY_SERVER" \
    "git@github.com:${REACTORY_GITHUB_ORG}/reactory-express-server.git" \
    "https://github.com/${REACTORY_GITHUB_ORG}/reactory-express-server.git"

  clone_repo "reactory-pwa-client" "$REACTORY_CLIENT" \
    "git@github.com:${REACTORY_GITHUB_ORG}/reactory-pwa-client.git" \
    "https://github.com/${REACTORY_GITHUB_ORG}/reactory-pwa-client.git"

  clone_repo "reactory-core" "$REACTORY_CORE" \
    "git@github.com:${REACTORY_GITHUB_ORG}/reactory-core.git" \
    "https://github.com/${REACTORY_GITHUB_ORG}/reactory-core.git"

  clone_repo "reactory-data" "$REACTORY_DATA" \
    "git@github.com:${REACTORY_GITHUB_ORG}/reactory-data.git" \
    "https://github.com/${REACTORY_GITHUB_ORG}/reactory-data.git"

  if confirm "Clone reactory-native (mobile app)?"; then
    clone_repo "reactory-native" "$REACTORY_NATIVE" \
      "git@github.com:${REACTORY_GITHUB_ORG}/reactory-native.git" \
      "https://github.com/${REACTORY_GITHUB_ORG}/reactory-native.git"
  fi

  # Clone the reactory-azure module (currently a hard dependency)
  local modules_dir="$REACTORY_SERVER/src/modules"
  if [[ -d "$modules_dir" ]]; then
    if [[ ! -d "$modules_dir/reactory-azure/.git" ]]; then
      info "Cloning reactory-azure module (required)..."
      local azure_url
      [[ "$use_ssh" == "y" ]] && azure_url="git@github.com:${REACTORY_GITHUB_ORG}/reactory-azure.git" \
        || azure_url="https://github.com/${REACTORY_GITHUB_ORG}/reactory-azure.git"
      git clone "$azure_url" "$modules_dir/reactory-azure"
      success "reactory-azure module cloned"
    else
      success "reactory-azure module already present"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Step 4: Shell Environment Variables
# ---------------------------------------------------------------------------
setup_shell_env() {
  banner "Step 4/7: Shell Environment"

  local shell_rc=""
  if [[ -n "${ZSH_VERSION:-}" ]] || [[ "$SHELL" == *"zsh"* ]]; then
    shell_rc="$HOME/.zshrc"
  elif [[ -n "${BASH_VERSION:-}" ]] || [[ "$SHELL" == *"bash"* ]]; then
    if [[ "$OS" == "darwin" ]]; then
      shell_rc="$HOME/.zprofile"
    else
      shell_rc="$HOME/.bashrc"
    fi
  fi

  if [[ -z "$shell_rc" ]]; then
    shell_rc=$(prompt_value "Shell profile file" "$HOME/.bashrc")
  fi

  info "Target shell profile: ${BOLD}${shell_rc}${NC}"
  printf "\n"
  info "The following exports will be added (if not already present):"
  printf "\n"
  printf "  ${BOLD}export REACTORY_HOME=\"%s\"${NC}\n" "$REACTORY_HOME"
  printf "  ${BOLD}export REACTORY_DATA=\"%s\"${NC}\n" "$REACTORY_DATA"
  printf "  ${BOLD}export REACTORY_SERVER=\"%s\"${NC}\n" "$REACTORY_SERVER"
  printf "  ${BOLD}export REACTORY_CLIENT=\"%s\"${NC}\n" "$REACTORY_CLIENT"
  printf "  ${BOLD}export REACTORY_NATIVE=\"%s\"${NC}\n" "${REACTORY_NATIVE}"
  printf "  ${BOLD}export REACTORY_PLUGINS=\"%s\"${NC}\n" "$REACTORY_PLUGINS"
  printf "\n"

  if confirm "Add these exports to ${shell_rc}?"; then
    local marker="# --- Reactory Environment ---"
    if grep -qF "$marker" "$shell_rc" 2>/dev/null; then
      warn "Reactory exports already present in ${shell_rc} — skipping"
    else
      {
        echo ""
        echo "$marker"
        echo "export REACTORY_HOME=\"${REACTORY_HOME}\""
        echo "export REACTORY_DATA=\"${REACTORY_DATA}\""
        echo "export REACTORY_SERVER=\"${REACTORY_SERVER}\""
        echo "export REACTORY_CLIENT=\"${REACTORY_CLIENT}\""
        echo "export REACTORY_NATIVE=\"${REACTORY_NATIVE}\""
        echo "export REACTORY_PLUGINS=\"${REACTORY_PLUGINS}\""
        echo "# --- End Reactory Environment ---"
      } >> "$shell_rc"
      success "Exports added to ${shell_rc}"
    fi
    # Source them for the rest of this script
    export REACTORY_HOME REACTORY_DATA REACTORY_SERVER REACTORY_CLIENT REACTORY_NATIVE REACTORY_PLUGINS
  else
    warn "Skipping shell exports — you will need to set them manually"
    export REACTORY_HOME REACTORY_DATA REACTORY_SERVER REACTORY_CLIENT REACTORY_NATIVE REACTORY_PLUGINS
  fi
}

# ---------------------------------------------------------------------------
# Step 5: Server Environment Configuration (.env)
# ---------------------------------------------------------------------------
setup_env_config() {
  banner "Step 5/7: Server Configuration"

  local config_name
  config_name=$(prompt_value "Configuration name" "reactory")
  local config_env
  config_env=$(prompt_value "Environment name" "local")

  local config_dir="$REACTORY_SERVER/config/${config_name}"
  local env_file="$config_dir/.env.${config_env}"

  mkdir -p "$config_dir"

  if [[ -f "$env_file" ]]; then
    success "Configuration file already exists: ${env_file}"
    if ! confirm "Overwrite existing configuration?"; then
      info "Keeping existing configuration"
      CONFIG_NAME="$config_name"
      CONFIG_ENV="$config_env"
      return
    fi
  fi

  info "Let's configure your environment. Press Enter to accept defaults."
  printf "\n"

  local api_port mongo_host mongo_port mongo_user mongo_password mongo_db
  local api_uri_root cdn_root secret_sauce sendgrid_key mode
  local app_email app_username app_password

  api_port=$(prompt_value "API port" "4000")
  mode=$(prompt_value "Mode (development/production)" "development")

  banner "MongoDB Configuration"
  info "You need a MongoDB instance. You can use Docker, local install, or a hosted service."
  printf "\n"
  mongo_host=$(prompt_value "MongoDB host" "localhost")
  mongo_port=$(prompt_value "MongoDB port" "27017")
  mongo_user=$(prompt_value "MongoDB username" "reactory")
  mongo_password=$(prompt_value "MongoDB password" "reactorycore")
  mongo_db=$(prompt_value "MongoDB database name" "reactory-${config_name}")

  local mongoose_uri="mongodb://${mongo_user}:${mongo_password}@${mongo_host}:${mongo_port}/${mongo_db}?socketTimeoutMS=360000&connectTimeoutMS=360000&authSource=admin"

  banner "Server URLs"
  api_uri_root=$(prompt_value "API root URL" "http://localhost:${api_port}/")
  cdn_root=$(prompt_value "CDN root URL" "http://localhost:${api_port}/cdn/")

  banner "Application Defaults"
  app_email=$(prompt_value "Admin email" "reactory@reactory.net")
  app_username=$(prompt_value "Admin username" "reactory")
  app_password=$(prompt_value "Admin password (base64-encoded)" "$(openssl rand -base64 32 2>/dev/null || echo 'ChangeMe123!')")

  secret_sauce=$(openssl rand -base64 32 2>/dev/null || echo "please-change-this-secret")
  sendgrid_key=$(prompt_value "SendGrid API key (SG.disabled to skip)" "SG.disabled")

  local client_url
  client_url=$(prompt_value "PWA Client URL" "http://localhost:3000")

  cat > "$env_file" << ENVEOF
APPLICATION_ROOT=src
REACTORY_APPLICATION_EMAIL=${app_email}
SYSTEM_USER_ID=${app_email}
REACTORY_APPLICATION_USERNAME=${app_username}
REACTORY_APPLICATION_PASSWORD=${app_password}
SERVER_ID=${config_name}-${config_env}
APP_DATA_ROOT=${REACTORY_DATA}
APP_SYSTEM_FONTS=/usr/share/fonts
MONGOOSE=${mongoose_uri}
MODULES_ENABLED=enabled-${config_name}
CLIENTS_ENABLED=enabled-clients.${config_name}
API_PORT=${api_port}
SENDGRID_API_KEY=${sendgrid_key}
API_URI_ROOT=${api_uri_root}
CDN_ROOT=${cdn_root}
SECRET_SAUCE=${secret_sauce}
MODE=${mode}
SYSADMIN_EMAIL=${app_email}
MONGO_DB=${mongo_db}
MONGO_USER=${mongo_user}
MONGO_PASSWORD=${mongo_password}
MONGO_PORT=${mongo_port}
MONGO_HOST=${mongo_host}
NODE_ENV=${mode}
REACTORY_APP_WHITELIST=${client_url},${api_uri_root},https://studio.apollographql.com
REACTORY_CLIENT_KEY=${config_name}
REACTORY_CLIENT_PWD=${app_password}
REACTORY_CLIENT_URL=${client_url}
MAIL_REDIRECT_ENABLED=${mode}
MAIL_REDIRECT_ADDRESS=${app_email}
MICROSOFT_OAUTH_APP_ID=00000000-0000-0000-0000-000000000000
MICROSOFT_OAUTH_APP_PASSWORD=00000000-0000-0000-0000-000000000000
MICROSOFT_OAUTH_REDIRECT_URI=${api_uri_root}auth/microsoft/openid/complete
MICROSOFT_OAUTH_SCOPES="profile offline_access user.read calendars.read mail.read email"
MICROSOFT_OAUTH_AUTHORITY=https://login.microsoftonline.com/common
MICROSOFT_OAUTH_ID_METADATA=/v2.0/.well-known/openid-configuration
MICROSOFT_OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
MICROSOFT_OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token
ENVEOF

  success "Environment file created: ${env_file}"
  CONFIG_NAME="$config_name"
  CONFIG_ENV="$config_env"
}

# ---------------------------------------------------------------------------
# Step 6: Modules & Client Configuration
# ---------------------------------------------------------------------------
setup_modules_and_clients() {
  banner "Step 6/7: Modules & Client Configuration"

  local modules_dir="$REACTORY_SERVER/src/modules"
  local enabled_file="$modules_dir/enabled-${CONFIG_NAME}.json"

  # --- Modules ---
  if [[ -f "$enabled_file" ]]; then
    success "Modules file already exists: ${enabled_file}"
    if ! confirm "Regenerate modules file?" "n"; then
      info "Keeping existing modules file"
    else
      create_modules_file "$enabled_file" "$modules_dir"
    fi
  else
    create_modules_file "$enabled_file" "$modules_dir"
  fi

  # --- Client configs ---
  local clients_dir="$REACTORY_SERVER/src/data/clientConfigs"
  local clients_file="$clients_dir/enabled-clients.${CONFIG_NAME}.json"

  if [[ -f "$clients_file" ]]; then
    success "Clients file already exists: ${clients_file}"
  else
    info "Creating client configuration file..."
    local client_name
    client_name=$(prompt_value "Primary client/tenant name" "reactory")
    echo "[\"${client_name}\"]" > "$clients_file"
    success "Clients file created: ${clients_file}"
  fi
}

create_modules_file() {
  local enabled_file="$1"
  local modules_dir="$2"
  local available_file="$modules_dir/available.json"

  if [[ ! -f "$available_file" ]]; then
    warn "available.json not found — creating minimal module set"
    cat > "$enabled_file" << 'MODEOF'
[
  {
    "id": "reactory-core",
    "name": "ReactoryServer",
    "key": "reactory-core",
    "fqn": "core.ReactoryServer@1.0.0",
    "moduleEntry": "reactory-core/index.ts",
    "license": "Apache-2.0"
  },
  {
    "id": "reactory-azure",
    "name": "Reactory Azure",
    "key": "reactory-azure",
    "fqn": "core.ReactoryAzure@1.0.0",
    "moduleEntry": "reactory-azure/index.ts",
    "license": "commercial"
  }
]
MODEOF
    success "Created minimal modules file: ${enabled_file}"
    return
  fi

  info "Available modules:"
  printf "\n"

  # Parse available.json to present choices
  local module_count
  module_count=$(python3 -c "import json; print(len(json.load(open('${available_file}'))))" 2>/dev/null || echo "0")

  if [[ "$module_count" == "0" ]]; then
    warn "Could not parse available.json — copying it as the enabled file"
    cp "$available_file" "$enabled_file"
    return
  fi

  # Display modules
  python3 -c "
import json
with open('${available_file}') as f:
    modules = json.load(f)
for i, m in enumerate(modules):
    print(f\"  {i+1}. {m['name']:30s} ({m['key']}) [{m.get('license','unknown')}]\")
" 2>/dev/null || {
    warn "python3 not available for module selection — using all modules"
    cp "$available_file" "$enabled_file"
    success "All modules enabled: ${enabled_file}"
    return
  }

  printf "\n"
  info "The reactory-core and reactory-azure modules are required."
  local selections
  read -rp "$(printf "${BOLD}Enter module numbers to enable (comma-separated, or 'all'): ${NC}")" selections

  if [[ "$selections" == "all" || -z "$selections" ]]; then
    cp "$available_file" "$enabled_file"
    success "All modules enabled"
  else
    python3 -c "
import json, sys
with open('${available_file}') as f:
    modules = json.load(f)
selected = set()
for s in '${selections}'.split(','):
    s = s.strip()
    if s.isdigit():
        idx = int(s) - 1
        if 0 <= idx < len(modules):
            selected.add(idx)

# Always include reactory-core (index 0) and reactory-azure (index 2)
for i, m in enumerate(modules):
    if m['key'] in ('reactory-core', 'reactory-azure'):
        selected.add(i)

result = [modules[i] for i in sorted(selected)]
with open('${enabled_file}', 'w') as f:
    json.dump(result, f, indent=2)
print(f'Enabled {len(result)} module(s)')
"
    success "Modules file created: ${enabled_file}"
  fi
}

# ---------------------------------------------------------------------------
# Step 7: Build & Install Dependencies
# ---------------------------------------------------------------------------
build_and_install() {
  banner "Step 7/7: Build & Install"

  # --- Reactory Core ---
  if [[ -d "$REACTORY_CORE" ]]; then
    info "Building reactory-core library..."
    pushd "$REACTORY_CORE" > /dev/null

    if [[ -f "package.json" ]]; then
      yarn install
      if grep -q '"build:install"' package.json 2>/dev/null; then
        yarn build:install
        success "reactory-core built and installed"
      else
        warn "build:install script not found in reactory-core — skipping build"
      fi
    else
      warn "No package.json in reactory-core — skipping"
    fi

    popd > /dev/null
  else
    warn "reactory-core not found at ${REACTORY_CORE} — skipping core build"
  fi

  # --- Server ---
  if [[ -d "$REACTORY_SERVER" ]]; then
    info "Installing server dependencies..."
    pushd "$REACTORY_SERVER" > /dev/null
    yarn install
    success "Server dependencies installed"
    popd > /dev/null
  fi

  # --- Client ---
  if [[ -d "$REACTORY_CLIENT" ]]; then
    if confirm "Install PWA client dependencies?"; then
      info "Installing client dependencies..."
      pushd "$REACTORY_CLIENT" > /dev/null
      yarn install
      success "Client dependencies installed"
      popd > /dev/null
    fi
  fi

  # --- Data / CDN ---
  if [[ -d "$REACTORY_DATA" ]]; then
    success "Data/CDN directory is present: ${REACTORY_DATA}"
    mkdir -p "$REACTORY_DATA/plugins/artifacts"
    success "Ensured plugins/artifacts directory exists"
  fi
}

# ---------------------------------------------------------------------------
# MongoDB Helper
# ---------------------------------------------------------------------------
offer_mongodb_setup() {
  banner "Optional: MongoDB Setup"

  if has_command mongod || has_command mongosh; then
    success "MongoDB tools detected on system"
    return
  fi

  info "MongoDB was not detected. You have several options:"
  printf "\n"
  printf "  ${BOLD}1${NC}  Install via Docker/Podman (recommended for development)\n"
  printf "  ${BOLD}2${NC}  Install via package manager\n"
  printf "  ${BOLD}3${NC}  Skip (I'll set up MongoDB myself)\n"
  printf "\n"

  local choice
  read -rp "$(printf "${BOLD}Choose [1/2/3]: ${NC}")" choice

  case "$choice" in
    1)
      if has_command docker; then
        info "Starting MongoDB via Docker..."
        docker run -d --name reactory-mongo \
          -p 27017:27017 \
          -e MONGO_INITDB_ROOT_USERNAME=reactory \
          -e MONGO_INITDB_ROOT_PASSWORD=reactorycore \
          -v reactory-mongo-data:/data/db \
          mongo:7
        success "MongoDB container started (reactory-mongo)"
      elif has_command podman; then
        info "Starting MongoDB via Podman..."
        podman run -d --name reactory-mongo \
          -p 27017:27017 \
          -e MONGO_INITDB_ROOT_USERNAME=reactory \
          -e MONGO_INITDB_ROOT_PASSWORD=reactorycore \
          -v reactory-mongo-data:/data/db \
          docker.io/library/mongo:7
        success "MongoDB container started (reactory-mongo)"
      else
        warn "Neither Docker nor Podman found."
        info "Install Docker: https://docs.docker.com/get-docker/"
        info "Install Podman: https://podman.io/getting-started/installation"
      fi
      ;;
    2)
      case "$PKG_MANAGER" in
        apt)
          info "Installing MongoDB..."
          sudo apt-get install -y mongodb
          ;;
        brew)
          info "Installing MongoDB via Homebrew..."
          brew tap mongodb/brew 2>/dev/null || true
          brew_install mongodb-community
          ;;
        *)
          warn "Auto-install not supported. See: https://docs.mongodb.com/manual/installation/"
          ;;
      esac
      ;;
    3)
      info "Skipping MongoDB setup"
      ;;
  esac
}

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print_summary() {
  printf "\n"
  printf "${GREEN}${BOLD}"
  printf "  ╔══════════════════════════════════════════════════════════════╗\n"
  printf "  ║               Installation Complete!                         ║\n"
  printf "  ╚══════════════════════════════════════════════════════════════╝\n"
  printf "${NC}\n"

  info "Project layout:"
  printf "  ${BOLD}REACTORY_HOME${NC}    = %s\n" "$REACTORY_HOME"
  printf "  ${BOLD}REACTORY_SERVER${NC}  = %s\n" "$REACTORY_SERVER"
  printf "  ${BOLD}REACTORY_CLIENT${NC}  = %s\n" "$REACTORY_CLIENT"
  printf "  ${BOLD}REACTORY_CORE${NC}    = %s\n" "$REACTORY_CORE"
  printf "  ${BOLD}REACTORY_DATA${NC}    = %s\n" "$REACTORY_DATA"
  printf "\n"
  info "Configuration: ${BOLD}${CONFIG_NAME}${NC} / ${BOLD}${CONFIG_ENV}${NC}"
  info "Env file: ${BOLD}${REACTORY_SERVER}/config/${CONFIG_NAME}/.env.${CONFIG_ENV}${NC}"
  printf "\n"

  printf "${CYAN}${BOLD}Next steps:${NC}\n"
  printf "\n"
  printf "  1. Open a new terminal (or run: source ~/.zshrc)\n"
  printf "\n"
  printf "  2. Ensure MongoDB is running\n"
  printf "\n"
  printf "  3. Start the server:\n"
  printf "     ${BOLD}cd %s${NC}\n" "$REACTORY_SERVER"
  printf "     ${BOLD}bin/start.sh %s %s${NC}\n" "$CONFIG_NAME" "$CONFIG_ENV"
  printf "\n"
  printf "  4. Start the client (in another terminal):\n"
  printf "     ${BOLD}cd %s${NC}\n" "$REACTORY_CLIENT"
  printf "     ${BOLD}yarn start${NC}\n"
  printf "\n"
  printf "  For more information, see the docs:\n"
  printf "     ${BOLD}%s/docs/readme.md${NC}\n" "$REACTORY_SERVER"
  printf "\n"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  detect_os

  if [[ "$OS" == "unknown" ]]; then
    error "Unsupported operating system: $(uname -s)"
    exit 1
  fi

  print_welcome

  if ! confirm "Ready to begin installation?"; then
    info "Installation cancelled."
    exit 0
  fi

  install_system_deps
  install_node
  setup_repos
  setup_shell_env
  setup_env_config
  setup_modules_and_clients
  offer_mongodb_setup
  build_and_install
  print_summary
}

main "$@"
