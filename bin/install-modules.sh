#!/usr/bin/env bash
# ============================================================================
# Reactory Module, Plugin & Client Config Installer
#
# Installs optional Reactory server modules into src/modules/, client
# plugins into $REACTORY_DATA/plugins/, and client configurations into
# src/data/clientConfigs/ by cloning them from their git repositories.
#
# Module catalogue:        src/modules/available.json
# Plugin catalogue:        $REACTORY_DATA/plugins/available.json
# Client config catalogue: src/data/clientConfigs/available.json
#
# Private catalogues (optional, git-ignored):
#   src/modules/available-private.json
#   $REACTORY_DATA/plugins/available-private.json
#   src/data/clientConfigs/available-private.json
#
# When a private catalogue exists alongside the public one it is merged in
# automatically.  Private entries take precedence over public entries that
# share the same key, letting engineers add or override entries without
# modifying the platform-shipped catalogues.
#
# After installation an installed.json manifest is written to each target
# directory so that other scripts can verify which components are present
# without needing network access.
#
# Usage:
#   bin/install-modules.sh                          # interactive (modules + plugins + clients)
#   bin/install-modules.sh --all                    # install everything
#   bin/install-modules.sh --module <key>           # install one server module
#   bin/install-modules.sh --plugin <key>           # install one plugin
#   bin/install-modules.sh --client <key>           # install one client config
#   bin/install-modules.sh --modules-only           # only install server modules
#   bin/install-modules.sh --plugins-only           # only install plugins
#   bin/install-modules.sh --clients-only           # only install client configs
#   bin/install-modules.sh --https                  # force HTTPS clone URLs
#   bin/install-modules.sh --ssh                    # force SSH clone URLs (default)
#   bin/install-modules.sh --reset-runtime          # clear plugins/__runtime__ compiled bundles
# ============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Colors & helpers  (mirrors install.sh style)
# ---------------------------------------------------------------------------
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
CYAN=$'\033[0;36m'
BOLD=$'\033[1m'
NC=$'\033[0m'

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

has_command() { command -v "$1" &>/dev/null; }

# ---------------------------------------------------------------------------
# Locate the server root
# ---------------------------------------------------------------------------
find_server_root() {
  if [[ -n "${REACTORY_SERVER:-}" && -d "$REACTORY_SERVER" ]]; then
    echo "$REACTORY_SERVER"
    return
  fi
  # Running from inside the server directory
  if [[ -f "./src/modules/available.json" ]]; then
    echo "$(pwd)"
    return
  fi
  # Running from bin/
  if [[ -f "../src/modules/available.json" ]]; then
    echo "$(cd .. && pwd)"
    return
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Locate the REACTORY_DATA directory
# ---------------------------------------------------------------------------
find_data_root() {
  # Explicit environment variable
  if [[ -n "${REACTORY_DATA:-}" && -d "$REACTORY_DATA" ]]; then
    echo "$REACTORY_DATA"
    return
  fi
  # Convention: sibling of the server directory
  local server_root="$1"
  local parent
  parent="$(dirname "$server_root")"
  if [[ -d "$parent/reactory-data" ]]; then
    echo "$parent/reactory-data"
    return
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Clear compiled bundles in plugins/__runtime__/
# The server will automatically recompile missing widgets from source on
# next startup, so this is safe to do at any time.
# ---------------------------------------------------------------------------
clear_runtime_dir() {
  local runtime_dir="$1"

  if [[ ! -d "$runtime_dir" ]]; then
    warn "Runtime directory not found: $runtime_dir — nothing to clear."
    return 0
  fi

  local file_count
  file_count=$(find "$runtime_dir" -maxdepth 1 -type f \( -name '*.js' -o -name '*.js.map' \) | wc -l | tr -d ' ')

  if [[ "$file_count" -eq 0 ]]; then
    info "No compiled bundles found in __runtime__/ — nothing to clear."
    return 0
  fi

  info "Found $file_count compiled bundle(s) in __runtime__/"
  find "$runtime_dir" -maxdepth 1 -type f \( -name '*.js' -o -name '*.js.map' \) -delete
  success "Cleared $file_count compiled bundle(s) from __runtime__/"
  info "The server will recompile missing widgets from source on next startup."
}

# ---------------------------------------------------------------------------
# Prompt the user to clear the __runtime__ directory
# ---------------------------------------------------------------------------
prompt_clear_runtime() {
  local plugins_dir="$1"
  local runtime_dir="$plugins_dir/__runtime__"

  if [[ ! -d "$runtime_dir" ]]; then
    return 0
  fi

  local file_count
  file_count=$(find "$runtime_dir" -maxdepth 1 -type f \( -name '*.js' -o -name '*.js.map' \) | wc -l | tr -d ' ')

  if [[ "$file_count" -eq 0 ]]; then
    return 0
  fi

  printf "\n"
  info "The plugins/__runtime__/ directory contains $file_count compiled widget bundle(s)."
  info "Clearing these forces the server to recompile from source on next startup."
  if confirm "Reset __runtime__/ compiled bundles?" "n"; then
    clear_runtime_dir "$runtime_dir"
  else
    info "Keeping existing __runtime__/ bundles."
  fi
}

# ---------------------------------------------------------------------------
# Clone or update a single repository
# ---------------------------------------------------------------------------
clone_or_update() {
  local key="$1"
  local url="$2"
  local target_dir="$3"

  if [[ -d "$target_dir/.git" ]]; then
    info "'$key' already present — pulling latest changes..."
    pushd "$target_dir" > /dev/null
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
      warn "Stashing uncommitted changes in $key"
      git stash push -m "Auto-stash by install-modules.sh at $(date +%Y-%m-%d\ %H:%M:%S)"
    fi
    if git pull origin "$(git branch --show-current)" 2>/dev/null; then
      success "Updated $key"
    else
      warn "Could not pull $key — it may need manual attention"
    fi
    popd > /dev/null
  else
    info "Cloning $key from $url..."
    git clone "$url" "$target_dir"
    success "Cloned $key"
  fi
}

# ---------------------------------------------------------------------------
# Run yarn install inside a directory (if it has a package.json)
# ---------------------------------------------------------------------------
run_yarn_install() {
  local target_dir="$1"
  local key="$2"

  if [[ ! -f "$target_dir/package.json" ]]; then
    warn "$key has no package.json — skipping yarn install"
    return 0
  fi

  if ! has_command yarn; then
    warn "yarn is not installed — falling back to npm install for $key"
    pushd "$target_dir" > /dev/null
    npm install 2>&1 | tail -3
    popd > /dev/null
    return
  fi

  info "Running yarn install for $key..."
  pushd "$target_dir" > /dev/null
  if yarn install 2>&1 | tail -5; then
    success "Dependencies installed for $key"
  else
    warn "yarn install had issues for $key — check manually"
  fi
  popd > /dev/null
}

# ---------------------------------------------------------------------------
# Write installed.json from directories that have a .git folder
# ---------------------------------------------------------------------------
write_installed_json() {
  local target_dir="$1"
  local available_file="$2"
  local installed_file="$3"
  local always_installed_key="${4:-}"

  python3 - <<PYEOF
import json, os

with open('${available_file}') as f:
    available = json.load(f)

available_by_key = {m['key']: m for m in available}
installed = []

for key, module in available_by_key.items():
    module_dir = os.path.join('${target_dir}', key)
    always_key = '${always_installed_key}'
    if os.path.isdir(os.path.join(module_dir, '.git')) or (always_key and key == always_key):
        installed.append(module)

with open('${installed_file}', 'w') as f:
    json.dump(installed, f, indent=2)

print(f"Wrote {len(installed)} entry/entries to {os.path.basename('${installed_file}')}")
PYEOF
}

# ---------------------------------------------------------------------------
# Build a merged catalogue from available.json + available-private.json.
#
# If available-private.json exists in the same directory as the public
# catalogue it is merged in: private entries override public entries that
# share the same key, and any additional private entries are appended.
# The merged result is written to a temp file whose path is printed to
# stdout.  If no private catalogue is found the original path is echoed
# unchanged so callers can always use the return value as the catalogue.
# ---------------------------------------------------------------------------
build_merged_catalogue() {
  local available_file="$1"
  local private_file
  private_file="$(dirname "$available_file")/available-private.json"

  if [[ ! -f "$private_file" ]]; then
    echo "$available_file"
    return 0
  fi

  local tmp
  tmp=$(mktemp /tmp/reactory-catalogue-XXXXXX.json)

  python3 - <<PYEOF
import json

with open('${available_file}') as f:
    public = json.load(f)

with open('${private_file}') as f:
    private = json.load(f)

# Public entries first; private entries override by key and append new ones
merged = {m['key']: m for m in public}
for m in private:
    merged[m['key']] = m

with open('${tmp}', 'w') as f:
    json.dump(list(merged.values()), f, indent=2)

pub_count  = len(public)
priv_count = len(private)
total      = len(merged)
print(f"Merged catalogue: {pub_count} public + {priv_count} private = {total} entries")
PYEOF

  echo "$tmp"
}

# ---------------------------------------------------------------------------
# Resolve a git URL from an available.json file by key
# ---------------------------------------------------------------------------
resolve_git_url() {
  local key="$1"
  local available_file="$2"
  local use_ssh="$3"

  local git_url
  git_url=$(python3 -c "
import json, sys
with open('${available_file}') as f:
    modules = json.load(f)
match = next((m for m in modules if m['key'] == '${key}'), None)
if match:
    print(match.get('git',''))
else:
    sys.exit(1)
" 2>/dev/null) || {
    error "'${key}' not found in $(basename "$available_file")"
    return 1
  }

  if [[ -z "$git_url" ]]; then
    error "No git URL defined for '${key}' in $(basename "$available_file")"
    return 1
  fi

  # Convert SSH <-> HTTPS if requested
  if [[ "$use_ssh" == "n" && "$git_url" == git@* ]]; then
    git_url="${git_url/git@github.com:/https:\/\/github.com\/}"
  elif [[ "$use_ssh" == "y" && "$git_url" == https://* ]]; then
    git_url="${git_url/https:\/\/github.com\//git@github.com:}"
  fi

  echo "$git_url"
}

# ---------------------------------------------------------------------------
# Install a single entry (module or plugin) by key
# ---------------------------------------------------------------------------
install_entry_by_key() {
  local key="$1"
  local target_dir="$2"
  local available_file="$3"
  local use_ssh="$4"
  local run_install="${5:-y}"

  local clone_url
  clone_url=$(resolve_git_url "$key" "$available_file" "$use_ssh") || return 1

  local dest="$target_dir/$key"
  clone_or_update "$key" "$clone_url" "$dest"

  if [[ "$run_install" == "y" ]]; then
    run_yarn_install "$dest" "$key"
  fi
}

# ---------------------------------------------------------------------------
# Generic interactive selection from an available.json
# ---------------------------------------------------------------------------
interactive_select() {
  local label="$1"           # "module" or "plugin"
  local target_dir="$2"
  local available_file="$3"
  local use_ssh="$4"
  local always_key="${5:-}"  # key that is always present (e.g. reactory-core)
  local run_install="${6:-y}"

  banner "Available ${label}s"

  python3 -c "
import json, os
with open('${available_file}') as f:
    items = json.load(f)
for i, m in enumerate(items):
    key = m['key']
    marker = ''
    item_dir = os.path.join('${target_dir}', key)
    always_key = '${always_key}'
    if os.path.isdir(os.path.join(item_dir, '.git')) or (always_key and key == always_key):
        marker = ' ${GREEN}[installed]${NC}'
    print(f'  {i+1:2d}. {m[\"name\"]:35s} ({key}) [{m.get(\"license\",\"unknown\")}]{marker}')
" 2>/dev/null || {
    warn "python3 could not list ${label}s"
    return 1
  }

  printf "\n"
  if [[ -n "$always_key" ]]; then
    info "The $always_key ${label} ships with the server and is always available."
  fi

  local selections
  read -rp "$(printf "${BOLD}Enter ${label} numbers to install (comma-separated, 'all', or 'q' to skip): ${NC}")" selections

  if [[ "$selections" == "q" || -z "$selections" ]]; then
    info "No ${label}s selected — skipping"
    return 0
  fi

  local keys_to_install=()
  if [[ "$selections" == "all" ]]; then
    while IFS= read -r line; do
      keys_to_install+=("$line")
    done < <(python3 -c "
import json
with open('${available_file}') as f:
    items = json.load(f)
for m in items:
    always_key = '${always_key}'
    if not always_key or m['key'] != always_key:
        print(m['key'])
")
  else
    while IFS= read -r line; do
      keys_to_install+=("$line")
    done < <(python3 -c "
import json
with open('${available_file}') as f:
    items = json.load(f)
selected = []
for s in '${selections}'.split(','):
    s = s.strip()
    if s.isdigit():
        idx = int(s) - 1
        always_key = '${always_key}'
        if 0 <= idx < len(items):
            key = items[idx]['key']
            if not always_key or key != always_key:
                selected.append(key)
for k in selected:
    print(k)
")
  fi

  if [[ ${#keys_to_install[@]} -eq 0 ]]; then
    info "No installable ${label}s selected"
    return 0
  fi

  for key in "${keys_to_install[@]}"; do
    install_entry_by_key "$key" "$target_dir" "$available_file" "$use_ssh" "$run_install"
  done
}

# ---------------------------------------------------------------------------
# Install all entries from an available.json
# ---------------------------------------------------------------------------
install_all_entries() {
  local label="$1"
  local target_dir="$2"
  local available_file="$3"
  local use_ssh="$4"
  local always_key="${5:-}"
  local run_install="${6:-y}"

  banner "Installing all available ${label}s"

  local all_keys=()
  while IFS= read -r line; do
    all_keys+=("$line")
  done < <(python3 -c "
import json
with open('${available_file}') as f:
    items = json.load(f)
for m in items:
    always_key = '${always_key}'
    if not always_key or m['key'] != always_key:
        print(m['key'])
")

  for key in "${all_keys[@]}"; do
    install_entry_by_key "$key" "$target_dir" "$available_file" "$use_ssh" "$run_install"
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  local server_root
  server_root=$(find_server_root)

  # Run nvm use if .nvmrc is present, to ensure correct Node version for yarn/npm
  if [[ -f "$server_root/.nvmrc" && -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "$NVM_DIR/nvm.sh"
    nvm use --silent
  fi

  if [[ -z "$server_root" ]]; then
    error "Cannot locate the Reactory server root."
    error "Set the REACTORY_SERVER environment variable or run this script from the server directory."
    exit 1
  fi

  local data_root
  data_root=$(find_data_root "$server_root")

  # --- Directories & catalogues ---
  local modules_dir="$server_root/src/modules"
  local modules_available="$modules_dir/available.json"
  local modules_installed="$modules_dir/installed.json"

  local plugins_dir=""
  local plugins_available=""
  local plugins_installed=""
  local has_plugins=false

  if [[ -n "$data_root" ]]; then
    plugins_dir="${REACTORY_PLUGINS:-$data_root/plugins}"
    plugins_available="$plugins_dir/available.json"
    plugins_installed="$plugins_dir/installed.json"
    if [[ -f "$plugins_available" ]]; then
      has_plugins=true
    fi
  fi

  local clients_dir="$server_root/src/data/clientConfigs"
  local clients_available="$clients_dir/available.json"
  local clients_installed="$clients_dir/installed.json"
  local has_clients=false

  if [[ -f "$clients_available" ]]; then
    has_clients=true
  fi

  # --- Pre-flight checks ---
  if [[ ! -f "$modules_available" ]]; then
    error "Module catalogue not found: $modules_available"
    exit 1
  fi

  if ! has_command python3; then
    error "python3 is required to parse available.json. Please install Python 3."
    exit 1
  fi

  if ! has_command git; then
    error "git is required to clone repositories. Please install git."
    exit 1
  fi

  # --- Parse arguments ---
  local install_all=false
  local specific_module=""
  local specific_plugin=""
  local specific_client=""
  local use_ssh="y"
  local modules_only=false
  local plugins_only=false
  local clients_only=false
  local reset_runtime=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all)            install_all=true ;;
      --module)         specific_module="${2:-}"; shift ;;
      --plugin)         specific_plugin="${2:-}"; shift ;;
      --client)         specific_client="${2:-}"; shift ;;
      --modules-only)   modules_only=true ;;
      --plugins-only)   plugins_only=true ;;
      --clients-only)   clients_only=true ;;
      --https)          use_ssh="n" ;;
      --ssh)            use_ssh="y" ;;
      --reset-runtime)  reset_runtime=true ;;
      -h|--help)
        cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Options:
  --all                Install all available modules, plugins, and client configs
  --module <key>       Install a specific server module by key
  --plugin <key>       Install a specific plugin by key
  --client <key>       Install a specific client config by key
  --modules-only       Only install server modules (skip plugins and client configs)
  --plugins-only       Only install plugins (skip modules and client configs)
  --clients-only       Only install client configs (skip modules and plugins)
  --ssh                Force SSH clone URLs (default)
  --https              Force HTTPS clone URLs
  --reset-runtime      Clear compiled bundles in plugins/__runtime__/
  -h, --help           Show this help message

Environment:
  REACTORY_SERVER      Path to the express server root
  REACTORY_DATA        Path to the reactory-data directory
  REACTORY_PLUGINS     Path to the plugins directory (default: \$REACTORY_DATA/plugins)
EOF
        exit 0
        ;;
      *)
        warn "Unknown option: $1"
        ;;
    esac
    shift
  done

  # --- Banner ---
  banner "Reactory Module, Plugin & Client Config Installer"
  info "Server root  : $server_root"
  info "Modules dir  : $modules_dir"
  [[ -f "$modules_dir/available-private.json" ]] && info "              + available-private.json detected"
  if [[ "$has_plugins" == true ]]; then
    info "Plugins dir  : $plugins_dir"
    info "Data root    : $data_root"
    [[ -f "$plugins_dir/available-private.json" ]] && info "              + available-private.json detected"
  else
    warn "Plugin catalogue not found — plugin installation will be skipped."
    if [[ -z "$data_root" ]]; then
      warn "Set REACTORY_DATA or ensure reactory-data is a sibling of the server directory."
    fi
  fi
  if [[ "$has_clients" == true ]]; then
    info "Clients dir  : $clients_dir"
    [[ -f "$clients_dir/available-private.json" ]] && info "              + available-private.json detected"
  else
    warn "Client config catalogue not found — client config installation will be skipped."
  fi
  printf "\n"

  # --- Build merged catalogues (public + private) ---
  local modules_catalogue
  modules_catalogue=$(build_merged_catalogue "$modules_available")

  local plugins_catalogue=""
  if [[ "$has_plugins" == true ]]; then
    plugins_catalogue=$(build_merged_catalogue "$plugins_available")
  fi

  local clients_catalogue=""
  if [[ "$has_clients" == true ]]; then
    clients_catalogue=$(build_merged_catalogue "$clients_available")
  fi

  # Clean up any temp files created by build_merged_catalogue on exit
  cleanup_tmp_catalogues() {
    [[ "$modules_catalogue" != "$modules_available" && -f "$modules_catalogue" ]] \
      && rm -f "$modules_catalogue"
    [[ -n "$plugins_catalogue" && "$plugins_catalogue" != "$plugins_available" && -f "$plugins_catalogue" ]] \
      && rm -f "$plugins_catalogue"
    [[ -n "$clients_catalogue" && "$clients_catalogue" != "$clients_available" && -f "$clients_catalogue" ]] \
      && rm -f "$clients_catalogue"
  }
  trap cleanup_tmp_catalogues EXIT

  # ------------------------------------------------------------------
  # Install a specific module
  # ------------------------------------------------------------------
  if [[ -n "$specific_module" ]]; then
    install_entry_by_key "$specific_module" "$modules_dir" "$modules_catalogue" "$use_ssh" "y"
    write_installed_json "$modules_dir" "$modules_catalogue" "$modules_installed" "reactory-core"
    success "installed.json updated: $modules_installed"
    exit 0
  fi

  # ------------------------------------------------------------------
  # Install a specific plugin
  # ------------------------------------------------------------------
  if [[ -n "$specific_plugin" ]]; then
    if [[ "$has_plugins" != true ]]; then
      error "Plugin catalogue not available — cannot install plugin."
      exit 1
    fi
    install_entry_by_key "$specific_plugin" "$plugins_dir" "$plugins_catalogue" "$use_ssh" "y"
    write_installed_json "$plugins_dir" "$plugins_catalogue" "$plugins_installed"
    success "installed.json updated: $plugins_installed"
    if [[ "$reset_runtime" == true ]]; then
      clear_runtime_dir "$plugins_dir/__runtime__"
    else
      prompt_clear_runtime "$plugins_dir"
    fi
    exit 0
  fi

  # ------------------------------------------------------------------
  # Install a specific client config
  # ------------------------------------------------------------------
  if [[ -n "$specific_client" ]]; then
    if [[ "$has_clients" != true ]]; then
      error "Client config catalogue not available — cannot install client config."
      exit 1
    fi
    install_entry_by_key "$specific_client" "$clients_dir" "$clients_catalogue" "$use_ssh" "n"
    write_installed_json "$clients_dir" "$clients_catalogue" "$clients_installed" "reactory"
    success "installed.json updated: $clients_installed"
    exit 0
  fi

  # ------------------------------------------------------------------
  # Explicit --reset-runtime without other install operations
  # ------------------------------------------------------------------
  if [[ "$reset_runtime" == true && "$install_all" != true \
        && "$modules_only" != true && "$plugins_only" != true ]]; then
    if [[ "$has_plugins" == true ]]; then
      clear_runtime_dir "$plugins_dir/__runtime__"
    else
      error "Plugin directory not available — cannot reset __runtime__/."
      exit 1
    fi
    exit 0
  fi

  # ------------------------------------------------------------------
  # Install everything (--all)
  # ------------------------------------------------------------------
  if [[ "$install_all" == true ]]; then
    if [[ "$plugins_only" != true && "$clients_only" != true ]]; then
      install_all_entries "module" "$modules_dir" "$modules_catalogue" "$use_ssh" "reactory-core" "y"
    fi
    if [[ "$modules_only" != true && "$clients_only" != true && "$has_plugins" == true ]]; then
      install_all_entries "plugin" "$plugins_dir" "$plugins_catalogue" "$use_ssh" "" "y"
      if [[ "$reset_runtime" == true ]]; then
        clear_runtime_dir "$plugins_dir/__runtime__"
      else
        prompt_clear_runtime "$plugins_dir"
      fi
    fi
    if [[ "$modules_only" != true && "$plugins_only" != true && "$has_clients" == true ]]; then
      install_all_entries "client config" "$clients_dir" "$clients_catalogue" "$use_ssh" "reactory" "n"
    fi
  else
    # ----------------------------------------------------------------
    # Interactive flow
    # ----------------------------------------------------------------
    if [[ "$plugins_only" != true && "$clients_only" != true ]]; then
      interactive_select "module" "$modules_dir" "$modules_catalogue" "$use_ssh" "reactory-core" "y"
    fi
    if [[ "$modules_only" != true && "$clients_only" != true && "$has_plugins" == true ]]; then
      printf "\n"
      interactive_select "plugin" "$plugins_dir" "$plugins_catalogue" "$use_ssh" "" "y"
      if [[ "$reset_runtime" == true ]]; then
        clear_runtime_dir "$plugins_dir/__runtime__"
      else
        prompt_clear_runtime "$plugins_dir"
      fi
    fi
    if [[ "$modules_only" != true && "$plugins_only" != true && "$has_clients" == true ]]; then
      printf "\n"
      interactive_select "client config" "$clients_dir" "$clients_catalogue" "$use_ssh" "reactory" "n"
    fi
  fi

  # ------------------------------------------------------------------
  # Refresh installed manifests
  # ------------------------------------------------------------------
  if [[ "$plugins_only" != true && "$clients_only" != true ]]; then
    write_installed_json "$modules_dir" "$modules_catalogue" "$modules_installed" "reactory-core"
    success "installed.json updated: $modules_installed"
  fi

  if [[ "$modules_only" != true && "$clients_only" != true && "$has_plugins" == true ]]; then
    write_installed_json "$plugins_dir" "$plugins_catalogue" "$plugins_installed"
    success "installed.json updated: $plugins_installed"
  fi

  if [[ "$modules_only" != true && "$plugins_only" != true && "$has_clients" == true ]]; then
    write_installed_json "$clients_dir" "$clients_catalogue" "$clients_installed" "reactory"
    success "installed.json updated: $clients_installed"
  fi

  printf "\n"
  success "Installation complete."
  printf "\n"
  info "To enable a module for a configuration, edit:"
  info "  $modules_dir/enabled-<config>.json"
  if [[ "$has_plugins" == true ]]; then
    info "Plugins are available in:"
    info "  $plugins_dir/"
  fi
  if [[ "$has_clients" == true ]]; then
    info "Client configs are available in:"
    info "  $clients_dir/"
  fi
  info "Or re-run the main installer: bin/install.sh"
  printf "\n"
}

main "$@"
