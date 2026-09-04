#!/bin/bash
# ============================================================================
# Reactory Server Podman Deployment Automation
#
# Builds the server from source, constructs the Podman container image,
# and deploys/restarts the container on the target environment.
#
# Usage:
#   bin/deploy-podman.sh [config-id] [env-id] [options]
#
# Examples:
#   bin/deploy-podman.sh reactory podman
#   bin/deploy-podman.sh reactory podman --no-pull
# ============================================================================
set -e

source ./bin/shared/shell-utils.sh

CONFIG_ID=${1:-reactory}
ENV_ID=${2:-podman}
DO_PULL=true

# Parse flags
for arg in "$@"; do
  case $arg in
    --no-pull)
      DO_PULL=false
      ;;
    --help|-h)
      echo "Usage: bin/deploy-podman.sh [config-id] [env-id] [--no-pull]"
      exit 0
      ;;
  esac
done

START_TIME=$(date +%s)
echo "🚀 Starting Reactory Server Podman Deployment"
echo "📦 Config: ${CONFIG_ID} | Env: ${ENV_ID}"

# 1. Check environment variables
check_env_vars

# 2. Git pull latest if requested
if [ "$DO_PULL" = true ]; then
  echo "📥 Pulling latest changes from git..."
  git pull origin master || echo "⚠️  Git pull had warnings/skipped"
fi

# 3. Build server from source
echo "🔨 Compiling server from source..."
sh bin/build.sh "${CONFIG_ID}" "${ENV_ID}"

# 4. Synchronize compiled runtime plugins & data build outputs to host data directory
BUILD_DATA_DIR="./build/server/${CONFIG_ID}/${ENV_ID}/data"
if [ -d "${BUILD_DATA_DIR}" ]; then
  echo "🔁 Synchronizing build data outputs to ${REACTORY_DATA}..."
  mkdir -p "${REACTORY_DATA}"
  rsync -av "${BUILD_DATA_DIR}/" "${REACTORY_DATA}/"
fi

# 5. Build container image in Podman
echo "🐳 Building Podman container image..."
sh bin/build-image.sh "${CONFIG_ID}" "${ENV_ID}"

BUILD_VERSION=$(node -p "require('./package.json').version")

# 6. Ensure tags exist
podman tag "localhost/reactory/${CONFIG_ID}-express-server:${BUILD_VERSION}" "localhost/reactory/${CONFIG_ID}-express-server:latest" 2>/dev/null || true

# 7. Ensure infra network exists
NETWORK_NAME="reactory-develop_reactory-network"
if ! podman network exists "${NETWORK_NAME}" 2>/dev/null; then
  echo "🌐 Creating podman network: ${NETWORK_NAME}"
  podman network create "${NETWORK_NAME}"
fi

# 8. Ensure host logging directory permissions
if [ -d "${REACTORY_DATA}/logging" ]; then
  chmod -R 777 "${REACTORY_DATA}/logging" 2>/dev/null || true
fi

# 9. Remove old container
CONTAINER_NAME="${CONFIG_ID}-express-server"
echo "♻️  Restarting container: ${CONTAINER_NAME}"
podman rm -f "${CONTAINER_NAME}" 2>/dev/null || true

# 10. Run new container
podman run -d \
  --name "${CONTAINER_NAME}" \
  --network "${NETWORK_NAME}" \
  --restart unless-stopped \
  -p 4000:4000 \
  -p 9464:9464 \
  -v "${REACTORY_DATA}":/reactory/reactory-data:z \
  -v "${REACTORY_CLIENT}":/reactory/reactory-client:z \
  -v "${REACTORY_SERVER}/config/${CONFIG_ID}/.env.${ENV_ID}":/reactory/reactory-express-server/.env:z \
  -v "${REACTORY_SERVER}/certificates":/etc/ssl/certs:z \
  -e REACTORY_HOME=/reactory \
  -e REACTORY_DATA=/reactory/reactory-data \
  -e REACTORY_SERVER=/reactory/reactory-express-server \
  -e REACTORY_CLIENT=/reactory/reactory-client \
  -e REACTORY_PLUGINS=/reactory/reactory-data/plugins \
  -e HOME=/root \
  -w /reactory/reactory-express-server \
  "localhost/reactory/${CONFIG_ID}-express-server:${BUILD_VERSION}" \
  bin/run-otel.sh

# 11. Health check verification
echo "⏳ Waiting for server to initialize..."
HEALTHY=false
for i in $(seq 1 12); do
  sleep 5
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/ || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    HEALTHY=true
    break
  fi
  echo "   [attempt $i/12] HTTP code: $HTTP_CODE (waiting...)"
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ "$HEALTHY" = true ]; then
  echo "✅ Reactory Server successfully deployed in ${DURATION}s!"
  echo "🌐 Server URL: http://localhost:4000"
  echo "📊 Telemetry:  http://localhost:9464/metrics"
else
  echo "⚠️  Server deployed but health check returned code: ${HTTP_CODE}"
  echo "📋 Container logs:"
  podman logs "${CONTAINER_NAME}" 2>&1 | tail -20
  exit 1
fi
