#!/bin/bash
# compose.sh - Start Reactory services via docker-compose or podman-compose.
# Automatically uses podman-compose if available, falling back to docker-compose.
#
# Usage: bin/compose.sh [config-id] [env-id] [compose-variant] [compose-command]
#   config-id       - Client configuration name (default: reactory)
#   env-id          - Environment name           (default: local)
#   compose-variant - Selects the compose file:
#                       (empty)  -> docker-compose.yaml
#                       develop  -> docker-compose-develop.yaml
#                       <name>   -> docker-compose-<name>.yaml
#   compose-command - Command passed to compose   (default: up -d)

source ./bin/shared/shell-utils.sh
check_env_vars

# ── Container compose runtime detection ───────────────────────────────────────
if has_command podman-compose; then
  COMPOSE_CMD="podman-compose"
elif has_command docker; then
  # Prefer the docker compose v2 plugin over the legacy docker-compose binary
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif has_command docker-compose; then
    COMPOSE_CMD="docker-compose"
  else
    echo "❌ docker is available but neither 'docker compose' nor 'docker-compose' is installed."
    exit 1
  fi
else
  echo "❌ Neither podman-compose nor docker is available. Please install one to continue."
  exit 1
fi

echo "🐳 Using compose runtime: $COMPOSE_CMD"

# ── Arguments ─────────────────────────────────────────────────────────────────
REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}
COMPOSE_VARIANT=${3:-}         # empty = default file; any other value = -<variant> suffix
COMPOSE_COMMAND=${4:-up -d}

export REACTORY_CONFIG_ID
export REACTORY_ENV_ID
export BUILD_VERSION=$(node -p "require('./package.json').version")

# ── Resolve compose file ───────────────────────────────────────────────────────
CONFIG_DIR="$(pwd)/config/${REACTORY_CONFIG_ID}"
if [ -z "$COMPOSE_VARIANT" ]; then
  COMPOSE_FILE="${CONFIG_DIR}/docker-compose.yaml"
else
  COMPOSE_FILE="${CONFIG_DIR}/docker-compose-${COMPOSE_VARIANT}.yaml"
fi

echo "🛠️  Loading environment : config/${REACTORY_CONFIG_ID}/.env.${REACTORY_ENV_ID}"
echo "📄 Compose file         : $COMPOSE_FILE"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo ""
  echo "❌ Compose file not found: $COMPOSE_FILE"
  if [ -n "$COMPOSE_VARIANT" ]; then
    echo "   Available compose files in config/${REACTORY_CONFIG_ID}/:"
    ls "${CONFIG_DIR}"/docker-compose*.yaml 2>/dev/null | sed 's|.*/||'
  fi
  exit 1
fi

ENV_FILE="./config/${REACTORY_CONFIG_ID}/.env.${REACTORY_ENV_ID}"
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file not found: $ENV_FILE"
  exit 1
fi

# ── podman-compose specific: check required local images ─────────────────────
# podman-compose will attempt an HTTPS pull from localhost if an image is missing.
# Fail early with a helpful message instead.
if [ "$COMPOSE_CMD" = "podman-compose" ]; then
  REQUIRED_IMAGES=(
    "localhost/${REACTORY_CONFIG_ID}/reactory-express-server:${BUILD_VERSION}"
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
    echo "   bin/build-image.sh ${REACTORY_CONFIG_ID} ${REACTORY_ENV_ID}"
    echo ""
    exit 1
  fi
  echo "✅ All required images found in local podman store"

  # Export BUILD_VERSION so podman-compose can resolve it in the compose file
  set -a
  source "$ENV_FILE"
  set +a

  # podman-compose uses -p for the project name
  PODMAN_COMPOSE_PROJECT_NAME=${PODMAN_COMPOSE_PROJECT_NAME:-reactory-fullstack}
  echo "🚀 Launching: $COMPOSE_CMD"
  $COMPOSE_CMD \
    -f "$COMPOSE_FILE" \
    -p "$PODMAN_COMPOSE_PROJECT_NAME" \
    --env-file "$ENV_FILE" \
    $COMPOSE_COMMAND
else
  echo "🚀 Launching: $COMPOSE_CMD"
  $COMPOSE_CMD \
    -f "$COMPOSE_FILE" \
    --env-file "$ENV_FILE" \
    $COMPOSE_COMMAND
fi

if [ $? -ne 0 ]; then
  echo "❌ Compose failed"
  exit 1
fi

echo "✅ Compose completed successfully"
