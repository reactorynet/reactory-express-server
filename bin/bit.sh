#!/bin/bash
#
# bit.sh - Build, Image, Terraform.
#
# Builds the server and PWA client, gets the images to wherever the target
# cluster pulls from, then applies that environment's workload layer.
#
# Usage: bin/bit.sh [config-id] [env-id] [options]
#   config-id - Client configuration name (default: reactory)
#   env-id    - Environment file suffix, config/<cfg>/.env.<id> (default: local)
#
# Options:
#   --cloud=<name>      minikube | aws | digitalocean | linode (default: minikube)
#   --env=<name>        Environment within that cloud:
#                         aws            dev | staging | production
#                         digitalocean   small | medium | large
#                         linode         small | medium | large
#                         minikube       (not applicable)
#   --image-tag=<tag>   Override the tag; defaults to the server's package.json version
#   --registry=<host>   Override the registry host (default: per cloud, see below)
#   --skip-build        Reuse existing images and go straight to Terraform
#   --skip-push         Do not push images
#   --auto-approve      Pass -auto-approve to terraform apply
#   --cluster           Apply the cluster layer first (infrastructure changes)
#   --plan              Plan instead of apply — no changes made
#
# Only the WORKLOAD layer is applied by default. The cluster layer holds the
# network, the Kubernetes cluster and the databases; it changes rarely and a
# routine deployment should not be able to touch it. Pass --cluster when you
# mean to.
#
# WHERE IMAGES GO
#
#   minikube       loaded straight into the cluster's container runtime — no
#                  registry, no push
#   aws            ECR, created by aws/bootstrap and shared by every AWS
#                  environment
#   digitalocean   GHCR
#   linode         GHCR (Linode has no container registry)
#
# The registry is shared across environments in every case, so an image is built
# and pushed once and then promoted by moving --image-tag forward.
#
# Examples:
#   bin/bit.sh reactory local                                        # minikube
#   bin/bit.sh reactory dev  --cloud=aws          --env=dev --auto-approve
#   bin/bit.sh reactory prod --cloud=aws          --env=production --image-tag=1.1.0 --skip-build
#   bin/bit.sh reactory qa   --cloud=digitalocean --env=medium --image-tag=1.1.0
#   bin/bit.sh reactory dev  --cloud=linode       --env=small --plan

set -o pipefail

REACTORY_CONFIG_ID=reactory
REACTORY_ENV_ID=local
CLOUD=minikube
DEPLOY_ENV=""
IMAGE_TAG=""
REGISTRY_OVERRIDE=""
SKIP_BUILD=0
SKIP_PUSH=0
AUTO_APPROVE=0
APPLY_CLUSTER=0
PLAN_ONLY=0

POSITIONAL=()
for arg in "$@"; do
  case $arg in
    --cloud=*)      CLOUD="${arg#*=}" ;;
    --env=*)        DEPLOY_ENV="${arg#*=}" ;;
    --blueprint=*)  DEPLOY_ENV="${arg#*=}" ;;
    --image-tag=*)  IMAGE_TAG="${arg#*=}" ;;
    --registry=*)   REGISTRY_OVERRIDE="${arg#*=}" ;;
    --skip-build)   SKIP_BUILD=1 ;;
    --skip-push)    SKIP_PUSH=1 ;;
    --auto-approve) AUTO_APPROVE=1 ;;
    --cluster)      APPLY_CLUSTER=1 ;;
    --plan)         PLAN_ONLY=1 ;;
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

[ -f "./package.json" ] || die "Run bit.sh from the reactory-express-server root."

SERVER_VERSION=$(node -p "require('./package.json').version") || die "Could not read version from package.json"
[ -z "$IMAGE_TAG" ] && IMAGE_TAG="$SERVER_VERSION"

# ---------------------------------------------------------------------------
# Resolve cloud, environment and registry
# ---------------------------------------------------------------------------
case "$CLOUD" in
  minikube)
    [ -n "$DEPLOY_ENV" ] && die "--env does not apply to minikube."
    TARGET_WORKLOAD="minikube"
    TARGET_CLUSTER=""
    DEFAULT_REGISTRY=""    # images are loaded locally
    ;;
  aws)
    case "$DEPLOY_ENV" in
      dev|staging|production) ;;
      "") die "--cloud=aws needs --env=dev|staging|production" ;;
      *)  die "Unknown aws environment '$DEPLOY_ENV'. Expected dev, staging or production." ;;
    esac
    TARGET_WORKLOAD="aws/${DEPLOY_ENV}/workload"
    TARGET_CLUSTER="aws/${DEPLOY_ENV}/cluster"
    DEFAULT_REGISTRY="ecr"  # resolved from the bootstrap layer's outputs
    ;;
  digitalocean|linode)
    case "$DEPLOY_ENV" in
      small|medium|large) ;;
      "") die "--cloud=$CLOUD needs --env=small|medium|large" ;;
      *)  die "Unknown $CLOUD tier '$DEPLOY_ENV'. Expected small, medium or large." ;;
    esac
    TARGET_WORKLOAD="${CLOUD}/${DEPLOY_ENV}/workload"
    TARGET_CLUSTER="${CLOUD}/${DEPLOY_ENV}/cluster"
    DEFAULT_REGISTRY="ghcr.io"
    ;;
  *)
    die "Unknown --cloud='$CLOUD'. Expected minikube, aws, digitalocean or linode."
    ;;
esac

REGISTRY="${REGISTRY_OVERRIDE:-$DEFAULT_REGISTRY}"
[ "$CLOUD" = "minikube" ] && SKIP_PUSH=1

echo "🎯 config=$REACTORY_CONFIG_ID env-file=$REACTORY_ENV_ID cloud=$CLOUD${DEPLOY_ENV:+ env=$DEPLOY_ENV} tag=$IMAGE_TAG"

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

CONTAINER_CMD=$(command -v docker || command -v podman) || die "Need docker or podman."

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
LOCAL_SERVER_IMAGE="reactory/${REACTORY_CONFIG_ID}-express-server:${SERVER_VERSION}"

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

# The two repositories version independently, so each local tag carries its own
# package.json version. Both are pushed under one deployment tag.
if [ -n "$REACTORY_CLIENT" ] && [ -d "$REACTORY_CLIENT" ]; then
  CLIENT_VERSION=$(node -p "require('$REACTORY_CLIENT/package.json').version" 2>/dev/null)
fi
LOCAL_CLIENT_IMAGE="reactory/${REACTORY_CONFIG_ID}-pwa-client:${CLIENT_VERSION:-$SERVER_VERSION}"

# ---------------------------------------------------------------------------
# Get images to the cluster
# ---------------------------------------------------------------------------
if [ "$CLOUD" = "minikube" ]; then
  echo "▸ Load images into minikube"
  command -v minikube >/dev/null 2>&1 || die "minikube is not on PATH."

  for img in "$LOCAL_SERVER_IMAGE" "$LOCAL_CLIENT_IMAGE"; do
    if ! $CONTAINER_CMD image inspect "$img" >/dev/null 2>&1; then
      echo "  ⚠️  $img not found locally — skipping load (was it built?)" >&2
      continue
    fi
    echo "  → $img"
    # `minikube image load` handles both docker and podman sources.
    minikube image load "$img" || die "Could not load $img into minikube"
  done

elif [ "$SKIP_PUSH" -eq 0 ]; then
  echo "▸ Push images to $REGISTRY"

  if [ "$REGISTRY" = "ecr" ]; then
    command -v aws >/dev/null 2>&1 || die "aws CLI is required to push to ECR."

    SERVER_REPO=$(terraform_output aws/bootstrap ecr_express_server_url)
    CLIENT_REPO=$(terraform_output aws/bootstrap ecr_pwa_client_url)
    [ -n "$SERVER_REPO" ] || die "Could not read ecr_express_server_url from aws/bootstrap. Has it been applied?"
    [ -n "$CLIENT_REPO" ] || die "Could not read ecr_pwa_client_url from aws/bootstrap. Has it been applied?"

    ECR_REGISTRY="${SERVER_REPO%%/*}"
    AWS_REGION=$(echo "$ECR_REGISTRY" | cut -d. -f4)

    echo "  → Logging in to $ECR_REGISTRY"
    aws ecr get-login-password --region "$AWS_REGION" \
      | $CONTAINER_CMD login --username AWS --password-stdin "$ECR_REGISTRY" \
      || die "ECR login failed"
  else
    # GHCR. GHCR_TOKEN or GITHUB_TOKEN needs write:packages.
    GHCR_USER="${GHCR_USERNAME:-${GITHUB_ACTOR:-}}"
    GHCR_PASS="${GHCR_TOKEN:-${GITHUB_TOKEN:-}}"
    GHCR_ORG="${GHCR_NAMESPACE:-reactorynet}"

    [ -n "$GHCR_USER" ] || die "Set GHCR_USERNAME (or GITHUB_ACTOR) to push to $REGISTRY."
    [ -n "$GHCR_PASS" ] || die "Set GHCR_TOKEN (or GITHUB_TOKEN) with write:packages to push to $REGISTRY."

    SERVER_REPO="${REGISTRY}/${GHCR_ORG}/reactory-express-server"
    CLIENT_REPO="${REGISTRY}/${GHCR_ORG}/reactory-pwa-client"

    echo "  → Logging in to $REGISTRY as $GHCR_USER"
    printf '%s' "$GHCR_PASS" \
      | $CONTAINER_CMD login "$REGISTRY" --username "$GHCR_USER" --password-stdin \
      || die "$REGISTRY login failed"
  fi

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
if [ "$PLAN_ONLY" -eq 1 ]; then
  TF_ARGS=(plan)
  VERB="plan"
else
  TF_ARGS=(apply)
  [ "$AUTO_APPROVE" -eq 1 ] && TF_ARGS+=(-auto-approve)
  VERB="apply"
fi

if [ -n "$TARGET_CLUSTER" ] && [ "$APPLY_CLUSTER" -eq 1 ]; then
  echo "▸ Terraform $VERB — $TARGET_CLUSTER"
  terraform_run "$TARGET_CLUSTER" "${TF_ARGS[@]}" || die "Cluster layer $VERB failed"
fi

echo "▸ Terraform $VERB — $TARGET_WORKLOAD"
terraform_run "$TARGET_WORKLOAD" "${TF_ARGS[@]}" || die "Workload layer $VERB failed"

echo "✅ BIT complete — ${CLOUD}${DEPLOY_ENV:+/$DEPLOY_ENV} @ $IMAGE_TAG"
