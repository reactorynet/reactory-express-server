#!/bin/bash
#
# bit.sh - Build, Image, Terraform.
#
# Builds the server and PWA client, pushes the images to the shared ECR registry,
# then applies the target environment's workload layer.
#
# Usage: bin/bit.sh [config-id] [env-id] [options]
#   config-id - Client configuration name (default: reactory)
#   env-id    - Environment file suffix    (default: local)
#
# Options:
#   --env=<name>        Deployment environment: dev | staging | production, or
#                       minikube for local (default: minikube)
#   --image-tag=<tag>   Override the tag; defaults to the server's package.json version
#   --skip-build        Reuse existing images and go straight to Terraform
#   --skip-push         Do not push to ECR (implies the images are already there)
#   --auto-approve      Pass -auto-approve to terraform apply
#   --cluster           Also apply the cluster layer first (infrastructure changes)
#
# This only ever applies the WORKLOAD layer by default. The cluster layer holds
# the VPC, EKS and the databases; it changes rarely and a routine deployment
# should not be able to touch it. Pass --cluster when you intend to.
#
# The registry lives in aws/bootstrap and is shared by every environment, so an
# image is built and pushed once, then promoted by moving --image-tag forward.
#
# Examples:
#   bin/bit.sh reactory local
#   bin/bit.sh reactory dev        --env=dev --auto-approve
#   bin/bit.sh reactory staging    --env=staging --image-tag=1.1.0
#   bin/bit.sh reactory production --env=production --image-tag=1.1.0 --skip-build

set -o pipefail

REACTORY_CONFIG_ID=reactory
REACTORY_ENV_ID=local
DEPLOY_ENV=minikube
IMAGE_TAG=""
SKIP_BUILD=0
SKIP_PUSH=0
AUTO_APPROVE=0
APPLY_CLUSTER=0

POSITIONAL=()
for arg in "$@"; do
  case $arg in
    --env=*)        DEPLOY_ENV="${arg#*=}" ;;
    --blueprint=*)  DEPLOY_ENV="${arg#*=}" ;;
    --image-tag=*)  IMAGE_TAG="${arg#*=}" ;;
    --skip-build)   SKIP_BUILD=1 ;;
    --skip-push)    SKIP_PUSH=1 ;;
    --auto-approve) AUTO_APPROVE=1 ;;
    --cluster)      APPLY_CLUSTER=1 ;;
    -*)             echo "Unknown option: $arg" >&2; exit 1 ;;
    *)              POSITIONAL+=("$arg") ;;
  esac
done

[ ${#POSITIONAL[@]} -ge 1 ] && REACTORY_CONFIG_ID="${POSITIONAL[0]}"
[ ${#POSITIONAL[@]} -ge 2 ] && REACTORY_ENV_ID="${POSITIONAL[1]}"

die() {
  echo "❌ $1" >&2
  exit 1
}

SERVER_DIR="$(pwd)"
[ -f "$SERVER_DIR/package.json" ] || die "Run bit.sh from the reactory-express-server root."

SERVER_VERSION=$(node -p "require('./package.json').version") || die "Could not read version from package.json"
[ -z "$IMAGE_TAG" ] && IMAGE_TAG="$SERVER_VERSION"

# minikube loads images from the local container store; every AWS environment
# pulls from the shared registry and therefore needs a push.
IS_AWS=1
[ "$DEPLOY_ENV" = "minikube" ] && IS_AWS=0
[ "$IS_AWS" -eq 0 ] && SKIP_PUSH=1

if [ "$IS_AWS" -eq 1 ]; then
  case "$DEPLOY_ENV" in
    dev|staging|production) ;;
    *) die "Unknown --env='$DEPLOY_ENV'. Expected dev, staging, production or minikube." ;;
  esac
fi

echo "🎯 Config: $REACTORY_CONFIG_ID | Env file: $REACTORY_ENV_ID | Deploy: $DEPLOY_ENV | Tag: $IMAGE_TAG"

terraform_run() {
  local target="$1"; shift
  ./bin/terraform.sh "$@" \
    --reactory-config="$REACTORY_CONFIG_ID" \
    --reactory-env="$REACTORY_ENV_ID" \
    --target="$target" \
    --image-tag="$IMAGE_TAG"
}

# terraform.sh prints progress to stdout, so read outputs with logging off and
# take only the final line.
terraform_output() {
  local target="$1" name="$2"
  ./bin/terraform.sh output -raw "$name" \
    --reactory-config="$REACTORY_CONFIG_ID" \
    --reactory-env="$REACTORY_ENV_ID" \
    --target="$target" \
    --log-level= 2>/dev/null | tail -1
}

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "▸ Build server application"
  ./bin/build.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || die "Server build failed"

  echo "▸ Build server container image"
  ./bin/build-image.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || die "Server image build failed"

  echo "▸ Build PWA client"
  [ -n "$REACTORY_CLIENT" ] || die "REACTORY_CLIENT is not set — cannot locate the PWA client."
  [ -d "$REACTORY_CLIENT" ] || die "REACTORY_CLIENT=$REACTORY_CLIENT is not a directory."

  # The client repo has no build-image.sh; it ships podman-build.sh, which takes
  # the config id as its first positional argument.
  if [ -x "$REACTORY_CLIENT/bin/build-image.sh" ]; then
    CLIENT_IMAGE_SCRIPT=(./bin/build-image.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID")
  elif [ -x "$REACTORY_CLIENT/bin/podman-build.sh" ]; then
    CLIENT_IMAGE_SCRIPT=(./bin/podman-build.sh "$REACTORY_CONFIG_ID")
  else
    die "No image build script in $REACTORY_CLIENT/bin (expected build-image.sh or podman-build.sh)."
  fi

  (
    cd "$REACTORY_CLIENT" || exit 1
    ./bin/build.sh "$REACTORY_CONFIG_ID" "$REACTORY_ENV_ID" || exit 1
    "${CLIENT_IMAGE_SCRIPT[@]}" || exit 1
  ) || die "PWA client build failed"
else
  echo "▸ Build skipped (--skip-build)"
fi

# ---------------------------------------------------------------------------
# Push to the shared registry
#
# The repositories live in aws/bootstrap, which is applied once per account, so
# they already exist by the time any environment is deployed. No targeted apply
# and no two-stage dance.
# ---------------------------------------------------------------------------
if [ "$SKIP_PUSH" -eq 0 ]; then
  echo "▸ Push images to the shared ECR registry"

  command -v aws >/dev/null 2>&1 || die "aws CLI is required to push to ECR."
  CONTAINER_CMD=$(command -v docker || command -v podman) || die "Need docker or podman to push images."

  SERVER_REPO=$(terraform_output bootstrap ecr_express_server_url)
  CLIENT_REPO=$(terraform_output bootstrap ecr_pwa_client_url)

  [ -n "$SERVER_REPO" ] || die "Could not read ecr_express_server_url from aws/bootstrap. Has it been applied?"
  [ -n "$CLIENT_REPO" ] || die "Could not read ecr_pwa_client_url from aws/bootstrap. Has it been applied?"

  REGISTRY="${SERVER_REPO%%/*}"
  AWS_REGION=$(echo "$REGISTRY" | cut -d. -f4)

  echo "  → Logging in to $REGISTRY"
  aws ecr get-login-password --region "$AWS_REGION" \
    | $CONTAINER_CMD login --username AWS --password-stdin "$REGISTRY" \
    || die "ECR login failed"

  # Local tags carry each repo's own package.json version — the two repos are
  # versioned independently. Both are pushed under the single deployment tag.
  CLIENT_VERSION=$(node -p "require('$REACTORY_CLIENT/package.json').version" 2>/dev/null) \
    || die "Could not read version from $REACTORY_CLIENT/package.json"

  LOCAL_SERVER_IMAGE="reactory/${REACTORY_CONFIG_ID}-express-server:${SERVER_VERSION}"
  LOCAL_CLIENT_IMAGE="reactory/${REACTORY_CONFIG_ID}-pwa-client:${CLIENT_VERSION}"

  for pair in "$LOCAL_SERVER_IMAGE|$SERVER_REPO" "$LOCAL_CLIENT_IMAGE|$CLIENT_REPO"; do
    LOCAL="${pair%%|*}"
    REMOTE="${pair##*|}"
    echo "  → $LOCAL → $REMOTE:$IMAGE_TAG"
    $CONTAINER_CMD tag "$LOCAL" "$REMOTE:$IMAGE_TAG" || die "Could not tag $LOCAL (was it built?)"
    $CONTAINER_CMD push "$REMOTE:$IMAGE_TAG" || die "Could not push $REMOTE:$IMAGE_TAG"
  done
else
  echo "▸ Push skipped"
fi

# ---------------------------------------------------------------------------
# Apply
# ---------------------------------------------------------------------------
APPLY_ARGS=(apply)
[ "$AUTO_APPROVE" -eq 1 ] && APPLY_ARGS+=(-auto-approve)

if [ "$IS_AWS" -eq 0 ]; then
  echo "▸ Terraform apply (minikube)"
  terraform_run minikube "${APPLY_ARGS[@]}" || die "Terraform apply failed"
else
  if [ "$APPLY_CLUSTER" -eq 1 ]; then
    echo "▸ Terraform apply — $DEPLOY_ENV/cluster"
    terraform_run "$DEPLOY_ENV/cluster" "${APPLY_ARGS[@]}" || die "Cluster layer apply failed"
  fi

  echo "▸ Terraform apply — $DEPLOY_ENV/workload"
  terraform_run "$DEPLOY_ENV/workload" "${APPLY_ARGS[@]}" || die "Workload layer apply failed"
fi

echo "✅ BIT complete — $DEPLOY_ENV @ $IMAGE_TAG"
