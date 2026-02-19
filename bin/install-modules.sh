#!/usr/bin/env bash
# ============================================================================
# Reactory Module Installer
#
# Installs optional Reactory modules into src/modules/ by cloning them from
# their git repositories listed in src/modules/available.json.
#
# After installation an installed.json manifest is written to src/modules/ so
# that other scripts (e.g. start-otel.sh) can verify required modules are
# present without needing network access.
#
# Usage:
#   bin/install-modules.sh                   # interactive
#   bin/install-modules.sh --all             # install every available module
#   bin/install-modules.sh --module <key>    # install one specific module
#   bin/install-modules.sh --https           # force HTTPS clone URLs
#   bin/install-modules.sh --ssh             # force SSH clone URLs (default)
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
# Clone or update a single module directory
# ---------------------------------------------------------------------------
clone_or_update_module() {
  local key="$1"
  local url="$2"
  local target_dir="$3"

  if [[ -d "$target_dir/.git" ]]; then
    info "Module '$key' already present — pulling latest changes..."
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
# Write installed.json from all module subdirectories that have a .git folder
# or that match a key in available.json
# ---------------------------------------------------------------------------
write_installed_json() {
  local modules_dir="$1"
  local available_file="$2"
  local installed_file="$3"

  python3 - <<PYEOF
import json, os

with open('${available_file}') as f:
    available = json.load(f)

available_by_key = {m['key']: m for m in available}
installed = []

# A module is considered installed when its directory contains a .git folder
# (i.e. it was cloned) OR when its key is 'reactory-core' (shipped with server).
for key, module in available_by_key.items():
    module_dir = os.path.join('${modules_dir}', key)
    if os.path.isdir(os.path.join(module_dir, '.git')) or key == 'reactory-core':
        installed.append(module)

with open('${installed_file}', 'w') as f:
    json.dump(installed, f, indent=2)

print(f"Wrote {len(installed)} module(s) to installed.json")
PYEOF
}

# ---------------------------------------------------------------------------
# Install a specific module by key
# ---------------------------------------------------------------------------
install_module_by_key() {
  local key="$1"
  local modules_dir="$2"
  local available_file="$3"
  local use_ssh="$4"

  local result
  result=$(python3 -c "
import json, sys
with open('${available_file}') as f:
    modules = json.load(f)
match = next((m for m in modules if m['key'] == '${key}'), None)
if match:
    print(match.get('git',''))
else:
    sys.exit(1)
" 2>/dev/null) || {
    error "Module '${key}' not found in available.json"
    return 1
  }

  local git_url="$result"
  if [[ -z "$git_url" ]]; then
    error "No git URL defined for module '${key}' in available.json"
    return 1
  fi

  # Convert SSH <-> HTTPS if needed
  local clone_url="$git_url"
  if [[ "$use_ssh" == "n" && "$git_url" == git@* ]]; then
    clone_url="${git_url/git@github.com:/https:\/\/github.com\/}"
  elif [[ "$use_ssh" == "y" && "$git_url" == https://* ]]; then
    clone_url="${git_url/https:\/\/github.com\//git@github.com:}"
  fi

  local target_dir="$modules_dir/$key"
  clone_or_update_module "$key" "$clone_url" "$target_dir"
}

# ---------------------------------------------------------------------------
# Interactive module selection and installation
# ---------------------------------------------------------------------------
interactive_install() {
  local modules_dir="$1"
  local available_file="$2"
  local installed_file="$3"
  local use_ssh="$4"

  info "Available modules:"
  printf "\n"

  python3 -c "
import json, os
with open('${available_file}') as f:
    modules = json.load(f)
for i, m in enumerate(modules):
    key = m['key']
    installed_marker = ''
    module_dir = os.path.join('${modules_dir}', key)
    if os.path.isdir(os.path.join(module_dir, '.git')) or key == 'reactory-core':
        installed_marker = ' [installed]'
    print(f\"  {i+1:2d}. {m['name']:35s} ({key}) [{m.get('license','unknown')}]{installed_marker}\")
" 2>/dev/null || {
    warn "python3 could not list modules"
    return 1
  }

  printf "\n"
  info "The reactory-core module ships with the server and is always available."
  local selections
  read -rp "$(printf "${BOLD}Enter module numbers to install (comma-separated, or 'all', or 'q' to quit): ${NC}")" selections

  if [[ "$selections" == "q" || -z "$selections" ]]; then
    info "No modules selected — exiting"
    return 0
  fi

  local keys_to_install=()
  if [[ "$selections" == "all" ]]; then
    while IFS= read -r line; do
      keys_to_install+=("$line")
    done < <(python3 -c "
import json
with open('${available_file}') as f:
    modules = json.load(f)
for m in modules:
    if m['key'] != 'reactory-core':
        print(m['key'])
")
  else
    while IFS= read -r line; do
      keys_to_install+=("$line")
    done < <(python3 -c "
import json
with open('${available_file}') as f:
    modules = json.load(f)
selected = []
for s in '${selections}'.split(','):
    s = s.strip()
    if s.isdigit():
        idx = int(s) - 1
        if 0 <= idx < len(modules) and modules[idx]['key'] != 'reactory-core':
            selected.append(modules[idx]['key'])
for k in selected:
    print(k)
")
  fi

  if [[ ${#keys_to_install[@]} -eq 0 ]]; then
    info "No installable modules selected"
    return 0
  fi

  for key in "${keys_to_install[@]}"; do
    install_module_by_key "$key" "$modules_dir" "$available_file" "$use_ssh"
  done
}

# ---------------------------------------------------------------------------
# Install all modules
# ---------------------------------------------------------------------------
install_all_modules() {
  local modules_dir="$1"
  local available_file="$2"
  local use_ssh="$3"

  banner "Installing all available modules"

  local all_keys=()
  while IFS= read -r line; do
    all_keys+=("$line")
  done < <(python3 -c "
import json
with open('${available_file}') as f:
    modules = json.load(f)
for m in modules:
    if m['key'] != 'reactory-core':
        print(m['key'])
")

  for key in "${all_keys[@]}"; do
    install_module_by_key "$key" "$modules_dir" "$available_file" "$use_ssh"
  done
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  local server_root
  server_root=$(find_server_root)

  if [[ -z "$server_root" ]]; then
    error "Cannot locate the Reactory server root."
    error "Set the REACTORY_SERVER environment variable or run this script from the server directory."
    exit 1
  fi

  local modules_dir="$server_root/src/modules"
  local available_file="$modules_dir/available.json"
  local installed_file="$modules_dir/installed.json"

  if [[ ! -f "$available_file" ]]; then
    error "Module catalogue not found: $available_file"
    exit 1
  fi

  if ! has_command python3; then
    error "python3 is required to parse available.json. Please install Python 3."
    exit 1
  fi

  if ! has_command git; then
    error "git is required to clone module repositories. Please install git."
    exit 1
  fi

  # Parse arguments
  local install_all=false
  local specific_module=""
  local use_ssh="y"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --all)            install_all=true ;;
      --module)         specific_module="${2:-}"; shift ;;
      --https)          use_ssh="n" ;;
      --ssh)            use_ssh="y" ;;
      -h|--help)
        printf "Usage: %s [--all] [--module <key>] [--ssh|--https]\n" "$(basename "$0")"
        exit 0
        ;;
      *)
        warn "Unknown option: $1"
        ;;
    esac
    shift
  done

  banner "Reactory Module Installer"
  info "Server root : $server_root"
  info "Modules dir : $modules_dir"
  printf "\n"

  if [[ "$install_all" == true ]]; then
    install_all_modules "$modules_dir" "$available_file" "$use_ssh"
  elif [[ -n "$specific_module" ]]; then
    install_module_by_key "$specific_module" "$modules_dir" "$available_file" "$use_ssh"
  else
    interactive_install "$modules_dir" "$available_file" "$installed_file" "$use_ssh"
  fi

  # Always refresh installed.json after any installation activity
  write_installed_json "$modules_dir" "$available_file" "$installed_file"
  success "installed.json updated: $installed_file"

  printf "\n"
  success "Module installation complete."
  printf "\n"
  info "To enable a module for a configuration, edit:"
  info "  $modules_dir/enabled-<config>.json"
  info "or re-run the main installer: bin/install.sh"
  printf "\n"
}

main "$@"
