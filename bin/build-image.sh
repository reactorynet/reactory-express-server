#!/bin/bash
# build-image.sh - Build a Reactory Express Server container image.
# Automatically uses podman if available, falling back to docker.
# Reads the Node.js version from .nvmrc and passes it to the Dockerfile as NODE_VERSION.
#
# Usage: bin/build-image.sh [config-id] [env-id] [Dockerfile]
#   config-id  - Client configuration name (default: reactory)
#   env-id     - Environment name           (default: local)
#   Dockerfile - Dockerfile filename        (default: Dockerfile)

source ./bin/shared/shell-utils.sh
check_env_vars

# ── Container runtime detection ───────────────────────────────────────────────
if has_command podman; then
  CONTAINER_CMD=podman
elif has_command docker; then
  CONTAINER_CMD=docker
else
  echo "❌ Neither podman nor docker is available. Please install one to continue."
  exit 1
fi

echo "🐳 Using container runtime: $CONTAINER_CMD"

# ── Arguments ─────────────────────────────────────────────────────────────────
REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}
DOCKERFILE=${3:-Dockerfile}

export REACTORY_CONFIG_ID
export REACTORY_ENV_ID

# ── Node version from .nvmrc ───────────────────────────────────────────────────
NODE_VERSION=$(cat .nvmrc 2>/dev/null | tr -d '[:space:]')
if [ -z "$NODE_VERSION" ]; then
  echo "⚠️  .nvmrc not found or empty — falling back to default node version 20.19.4"
  NODE_VERSION="20.19.4"
fi

# ── Certificate preflight check ───────────────────────────────────────────────
# Ensure the certificates/ directory exists so the Dockerfile COPY never fails.
# Detect .crt files and tell the Dockerfile whether to run cert verification.
CERTS_DIR="./certificates"
HAS_CUSTOM_CERTS=false
NODE_EXTRA_CA_CERTS_VALUE=""

if [ ! -d "$CERTS_DIR" ]; then
  echo "⚠️  certificates/ directory not found — creating empty placeholder (no custom certs will be installed)"
  mkdir -p "$CERTS_DIR"
fi

if ls "${CERTS_DIR}"/*.crt >/dev/null 2>&1; then
  HAS_CUSTOM_CERTS=true
  NODE_EXTRA_CA_CERTS_VALUE="/usr/local/share/ca-certificates/ca-certificates.crt"
  echo "🔐 Custom certificates found in ${CERTS_DIR} — cert verification enabled"
else
  echo "ℹ️  No .crt files in ${CERTS_DIR} — custom cert steps will be skipped inside the image"
fi

# ── Derived values ─────────────────────────────────────────────────────────────
echo "📓 Loading environment: config/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}"
BUILD_VERSION=$(node -p "require('./package.json').version")
IMAGE_ORG=reactory
IMAGE_TAG="${IMAGE_ORG}/${REACTORY_CONFIG_ID}-express-server:${BUILD_VERSION}"
BUILD_OPTIONS="${REACTORY_SERVER}/config/${REACTORY_CONFIG_ID}/.env.build.${REACTORY_ENV_ID}"
TARFILE="./build/server/${REACTORY_CONFIG_ID}/${REACTORY_ENV_ID}/express-server-image.tar"

echo "🔢 Node version : $NODE_VERSION"
echo "🏷️  Image tag    : $IMAGE_TAG"
echo "📄 Dockerfile   : config/${REACTORY_CONFIG_ID}/${DOCKERFILE}"

# ── Build artifact preflight ──────────────────────────────────────────────────
# The Dockerfile COPYs the server tar produced by bin/build.sh.
# Fail early with a clear message rather than deep inside the image build.
BUILD_TAR="./build/server/${REACTORY_CONFIG_ID}/${REACTORY_CONFIG_ID}-server-${REACTORY_ENV_ID}-${BUILD_VERSION}.tar.gz"
if [ ! -f "$BUILD_TAR" ]; then
  echo ""
  echo "❌ Build artifact not found: $BUILD_TAR"
  echo "   Run the server build first:"
  echo "   bin/build.sh ${REACTORY_CONFIG_ID} ${REACTORY_ENV_ID}"
  echo ""
  exit 1
fi
echo "✅ Build artifact found: $BUILD_TAR"

# Source environment-specific build options if present
if [ -f "$BUILD_OPTIONS" ]; then
  echo "⚙️  Sourcing build options: $BUILD_OPTIONS"
  source "$BUILD_OPTIONS"
fi

# ── Remove existing image ──────────────────────────────────────────────────────
if $CONTAINER_CMD images | grep -q "$IMAGE_TAG"; then
  echo "🗑️  Removing existing image $IMAGE_TAG"
  $CONTAINER_CMD rmi "$IMAGE_TAG"
fi

# ── Build ──────────────────────────────────────────────────────────────────────
# Pass --progress=plain to show full untruncated output for every layer.
# Remove that flag (or set VERBOSE_BUILD=false) to use the default condensed output.
PROGRESS_FLAG="--progress=plain"
[[ "${VERBOSE_BUILD}" == "false" ]] && PROGRESS_FLAG=""

echo "💿 Building image $IMAGE_TAG"
$CONTAINER_CMD build \
  $PROGRESS_FLAG \
  --build-arg REACTORY_CONFIG_ID="${REACTORY_CONFIG_ID}" \
  --build-arg REACTORY_ENV_ID="${REACTORY_ENV_ID}" \
  --build-arg BUILD_VERSION="${BUILD_VERSION}" \
  --build-arg NODE_VERSION="${NODE_VERSION}" \
  --build-arg HAS_CUSTOM_CERTS="${HAS_CUSTOM_CERTS}" \
  --build-arg NODE_EXTRA_CA_CERTS_VALUE="${NODE_EXTRA_CA_CERTS_VALUE}" \
  -t "$IMAGE_TAG" \
  -f "./config/${REACTORY_CONFIG_ID}/${DOCKERFILE}" .

if [ $? -ne 0 ]; then
  echo "❌ Build failed for image $IMAGE_TAG"
  exit 1
fi

# ── Export to tar ──────────────────────────────────────────────────────────────
echo "📦 Exporting image $IMAGE_TAG to $TARFILE"
mkdir -p "$(dirname "$TARFILE")"

if [ -f "$TARFILE" ]; then
  rm "$TARFILE"
fi

$CONTAINER_CMD save -o "$TARFILE" "$IMAGE_TAG"

if [ $? -ne 0 ]; then
  echo "❌ Error exporting image $IMAGE_TAG to $TARFILE"
  exit 1
fi

echo "✅ Image $IMAGE_TAG exported to $TARFILE"
exit 0
