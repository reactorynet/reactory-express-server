#!/bin/bash
# bit.sh - Build, Image, Terraform.
# Builds the server and PWA client, produces container images, then applies
# Terraform infrastructure.
#
# Usage: bin/bit.sh [config-id] [env-id]
#   config-id - Client configuration name (default: reactory)
#   env-id    - Environment name           (default: local)

REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}

# Step 1: Build server application
echo "Step 1/4 - Build server application"
./bin/build.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || { echo "Server build failed"; exit 1; }

# Step 2: Build server container image
echo "Step 2/4 - Build server container image"
./bin/build-image.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || { echo "Server image build failed"; exit 1; }

# Step 3: Build and image the PWA client
echo "Step 3/4 - Build PWA client"
cd "$REACTORY_CLIENT"
./bin/build.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || { echo "PWA client build failed"; exit 1; }
./bin/build-image.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || { echo "PWA client image build failed"; exit 1; }

# Step 4: Terraform apply
echo "Step 4/4 - Terraform apply"
cd "$REACTORY_SERVER"
./bin/terraform.sh apply -auto-approve --reactory-config="$REACTORY_CONFIG_ID" --reactory-env="$REACTORY_ENV_ID" || { echo "Terraform apply failed"; exit 1; }

echo "BIT complete"
