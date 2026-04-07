#!/bin/bash
# bic.sh - Build, Image, Compose.
# Runs the full local deployment pipeline:
#   1. bin/build.sh        - Compile server and produce the deployment tar
#   2. bin/build-image.sh  - Build the container image from the tar
#   3. bin/compose.sh      - Start all services via docker-compose / podman-compose
#
# Usage: bin/bic.sh [config-id] [env-id] [compose-variant]
#   config-id       - Client configuration name (default: reactory)
#   env-id          - Environment name           (default: local)
#   compose-variant - Selects the compose file variant (default: empty = docker-compose.yaml)
#                     Example: 'develop' -> docker-compose-develop.yaml

REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}
COMPOSE_VARIANT=${3:-}

echo "═══════════════════════════════════════════════════════════"
echo "  Reactory BIC  |  config: ${REACTORY_CONFIG_ID}  |  env: ${REACTORY_ENV_ID}"
if [ -n "$COMPOSE_VARIANT" ]; then
  echo "  Compose variant: ${COMPOSE_VARIANT}"
fi
echo "═══════════════════════════════════════════════════════════"

# ── Step 1: Build server application ──────────────────────────────────────────
echo ""
echo "▶ Step 1/3 — Build server application"
./bin/build.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID"
if [ $? -ne 0 ]; then
  echo "❌ Server build failed — aborting"
  exit 1
fi
echo "✅ Server build complete"

# ── Step 2: Build container image ─────────────────────────────────────────────
echo ""
echo "▶ Step 2/3 — Build container image"
./bin/build-image.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID"
if [ $? -ne 0 ]; then
  echo "❌ Image build failed — aborting"
  exit 1
fi
echo "✅ Image build complete"

# ── Step 3: Run compose ────────────────────────────────────────────────────────
echo ""
echo "▶ Step 3/3 — Start services"
./bin/compose.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" "$COMPOSE_VARIANT"
if [ $? -ne 0 ]; then
  echo "❌ Compose failed — aborting"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ BIC complete — services are up"
echo "═══════════════════════════════════════════════════════════"
