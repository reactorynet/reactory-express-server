#!/bin/bash
#
# terraform.sh — run Terraform against a Reactory deployment target.
#
# Usage:
#   bin/terraform.sh <terraform args...> [options]
#
# Targets are addressed as <cloud>/<environment>/<layer>, or by a shorter form
# where it is unambiguous:
#
#   aws/bootstrap                 state backend + shared ECR (once per account)
#   aws/dev/cluster               AWS resources  (VPC, EKS, Valkey, secrets)
#   aws/dev/workload              Kubernetes objects + the application
#   aws/staging/... aws/production/...
#
#   digitalocean/bootstrap        Spaces bucket for state
#   digitalocean/small/cluster    DOKS + VPC (+ managed databases at medium/large)
#   digitalocean/small/workload   Kubernetes objects + the application
#   digitalocean/medium/... digitalocean/large/...
#
#   linode/bootstrap              Object Storage bucket for state
#   linode/small/cluster          LKE + VPC (+ managed PostgreSQL at medium/large)
#   linode/small/workload
#   linode/medium/... linode/large/...
#
#   minikube                      local development
#
# `dev/cluster` still resolves to aws/dev/cluster; the AWS environment names do
# not collide with the DigitalOcean and Linode tier names.
#
# Apply order is bootstrap -> <env>/cluster -> <env>/workload. The workload layer
# reads the cluster layer's state, so applying it first fails with a clear error.
#
# Options:
#   --reactory-config=<key>   Client config under config/ (default: reactory)
#   --reactory-env=<key>      Env file suffix, config/<cfg>/.env.<key> (default: local)
#   --target=<name>           Deployment target, as above (default: minikube)
#   --reactory-blueprint=<n>  Alias for --target
#   --reactory-k8-target=<n>  Deprecated alias for --target
#   --image-tag=<tag>         Sets TF_VAR_image_tag for the run
#   --var-file=<path>         Extra -var-file, repeatable
#   --backend-config=<k=v>    Extra -backend-config for init, repeatable
#   --log-level=<level>       TF_LOG value (default: INFO; empty disables)
#   --dry-run                 Resolve everything and print, run nothing
#   --skip-init               Do not auto-run terraform init
#   --skip-beforerun          Skip the target's beforerun.sh
#   --skip-afterrun           Skip the target's afterrun.sh
#   --list                    List available targets and exit
#
# Backend configuration is partial by design: each layer commits only its state
# key, and the bucket, region and lock table come from the environment file as
# TF_STATE_BUCKET, TF_STATE_REGION and TF_STATE_LOCK_TABLE. Those are read from
# aws/bootstrap's outputs after the first apply.
#
# Examples:
#   bin/terraform.sh apply --target=aws/bootstrap             --reactory-env=dev
#   bin/terraform.sh plan  --target=aws/dev/cluster           --reactory-env=dev
#   bin/terraform.sh apply --target=aws/dev/workload          --reactory-env=dev --image-tag=1.1.0
#   bin/terraform.sh apply --target=digitalocean/small/cluster  --reactory-env=dev
#   bin/terraform.sh apply --target=linode/medium/workload      --reactory-env=qa --image-tag=1.1.0
#
# Exits non-zero on any failure so callers (bin/bit.sh) can react.

REACTORY_CONFIG=reactory
REACTORY_ENV=local
TARGET=minikube
TF_LOG_LEVEL=INFO
IMAGE_TAG=""
DRY_RUN=0
SKIP_INIT=0
SKIP_beforerun=0
SKIP_afterrun=0
LIST_ONLY=0
VAR_FILES=()
BACKEND_CONFIGS=()
NEW_ARGS=()

die() {
  echo "❌ $1" >&2
  exit "${2:-1}"
}

extract_options() {
  for arg in "$@"; do
    case $arg in
      --reactory-config=*) REACTORY_CONFIG="${arg#*=}" ;;
      --reactory-env=*)    REACTORY_ENV="${arg#*=}" ;;
      --target=*)          TARGET="${arg#*=}" ;;
      --reactory-blueprint=*) TARGET="${arg#*=}" ;;
      # Retained for backwards compatibility with existing invocations.
      --reactory-k8-target=*) TARGET="${arg#*=}" ;;
      --image-tag=*)       IMAGE_TAG="${arg#*=}" ;;
      --var-file=*)        VAR_FILES+=("${arg#*=}") ;;
      --backend-config=*)  BACKEND_CONFIGS+=("${arg#*=}") ;;
      --log-level=*)       TF_LOG_LEVEL="${arg#*=}" ;;
      --dry-run)           DRY_RUN=1 ;;
      --skip-init)         SKIP_INIT=1 ;;
      --skip-beforerun)    SKIP_beforerun=1 ;;
      --skip-afterrun)     SKIP_afterrun=1 ;;
      --list)              LIST_ONLY=1 ;;
      *)                   NEW_ARGS+=("$arg") ;;
    esac
  done
}

extract_options "$@"

TF_ROOT="./config/${REACTORY_CONFIG}/terraform"

list_targets() {
  find "$TF_ROOT" -name main.tf \
    -not -path "*/.terraform/*" -not -path "*/modules/*" 2>/dev/null \
    | sed -e "s|$TF_ROOT/||" -e 's|/main.tf$||' -e 's|/environments/|/|' \
    | sort
}

if [ "$LIST_ONLY" -eq 1 ]; then
  [ -d "$TF_ROOT" ] || die "Terraform root $TF_ROOT not found"
  echo "Available targets under $TF_ROOT:"
  list_targets | sed 's/^/  - /'
  exit 0
fi

command -v terraform >/dev/null 2>&1 || die "terraform is not on PATH. Install it (brew install hashicorp/tap/terraform) and retry."

[ ${#NEW_ARGS[@]} -gt 0 ] || die "No terraform command given. Try: bin/terraform.sh plan --target=dev/cluster"

TF_COMMAND="${NEW_ARGS[0]}"

[ -d "$TF_ROOT" ] || die "Terraform root $TF_ROOT not found — is --reactory-config=$REACTORY_CONFIG correct?"

# ---------------------------------------------------------------------------
# Resolve the target directory.
#
# Candidates are tried in order so that both the short form (dev/cluster) and an
# explicit path (aws/environments/dev/cluster) work.
# ---------------------------------------------------------------------------
TARGET_DIR=""
for candidate in \
  "$TF_ROOT/$TARGET" \
  "$TF_ROOT/aws/environments/$TARGET" \
  "$TF_ROOT/aws/$TARGET" \
  "$TF_ROOT/digitalocean/environments/${TARGET#digitalocean/}" \
  "$TF_ROOT/linode/environments/${TARGET#linode/}"; do
  if [ -f "$candidate/main.tf" ]; then
    TARGET_DIR="$candidate"
    break
  fi
done

if [ -z "$TARGET_DIR" ]; then
  echo "❌ No target with a main.tf matched '$TARGET'." >&2
  echo "   Available targets:" >&2
  list_targets | sed 's/^/     - /' >&2
  exit 1
fi

# Absolute paths: TF_LOG_PATH and -var-file resolve relative to the -chdir
# directory, not the invocation directory.
TARGET_DIR_ABS="$(cd "$TARGET_DIR" && pwd)" || die "Could not resolve $TARGET_DIR"
REPO_ROOT="$(pwd)"

ENV_FILE="./config/${REACTORY_CONFIG}/.env.${REACTORY_ENV}"
LOG_FILE_NAME="terraform-$(date +%Y%m%d%H%M%S).log"

mkdir -p "$TARGET_DIR_ABS/.logs" || die "Could not create $TARGET_DIR_ABS/.logs"

if [ -n "$TF_LOG_LEVEL" ]; then
  export TF_LOG="$TF_LOG_LEVEL"
  export TF_LOG_PATH="$TARGET_DIR_ABS/.logs/$LOG_FILE_NAME"
else
  unset TF_LOG
  unset TF_LOG_PATH
fi

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE" || die "Failed to source $ENV_FILE"
  set +a
  echo "🛠️  Loaded environment $ENV_FILE"
else
  die "Environment file $ENV_FILE not found. Create it or pass --reactory-env=<key>."
fi

if [ -f "$TARGET_DIR/tfvars.sh" ]; then
  # shellcheck disable=SC1090
  source "$TARGET_DIR/tfvars.sh" || die "Failed to source $TARGET_DIR/tfvars.sh"
fi

if [ -n "$IMAGE_TAG" ]; then
  export TF_VAR_image_tag="$IMAGE_TAG"
fi

# The workload layers read the cluster layer's state, so they need to know where
# it lives. Derive their variables from the same values the backend uses.
if [ -n "${TF_STATE_BUCKET:-}" ]; then
  export TF_VAR_state_bucket="${TF_VAR_state_bucket:-$TF_STATE_BUCKET}"
fi
if [ -n "${TF_STATE_REGION:-}" ]; then
  export TF_VAR_state_bucket_region="${TF_VAR_state_bucket_region:-$TF_STATE_REGION}"
fi
if [ -n "${TF_STATE_ENDPOINT:-}" ]; then
  export TF_VAR_state_endpoint="${TF_VAR_state_endpoint:-$TF_STATE_ENDPOINT}"
fi

TF_EXTRA_ARGS=()
for vf in "${VAR_FILES[@]}"; do
  if [ -f "$vf" ]; then
    TF_EXTRA_ARGS+=("-var-file=$(cd "$(dirname "$vf")" && pwd)/$(basename "$vf")")
  elif [ -f "$TARGET_DIR/$vf" ]; then
    TF_EXTRA_ARGS+=("-var-file=$TARGET_DIR_ABS/$vf")
  else
    die "var-file '$vf' not found (looked in $REPO_ROOT and $TARGET_DIR)"
  fi
done

echo "📦 Target:     ${TARGET_DIR#./}"
echo "🌍 Env:        $REACTORY_ENV"
echo "🏷️  Image tag:  ${TF_VAR_image_tag:-<unset>}"

# ---------------------------------------------------------------------------
# beforerun hook
# ---------------------------------------------------------------------------
if [ -f "$TARGET_DIR/beforerun.sh" ] && [ "$SKIP_beforerun" -eq 0 ]; then
  echo "🔧 Running pre-requisites script"
  # shellcheck disable=SC1090
  source "$TARGET_DIR/beforerun.sh" || die "beforerun.sh failed"
fi

# ---------------------------------------------------------------------------
# init
#
# Layers under aws/ use a partial S3 backend: the state key is committed, the
# account-specific parts are supplied here. bootstrap and minikube keep local
# state and need none of it.
# ---------------------------------------------------------------------------
uses_s3_backend() {
  grep -qs 'backend "s3"' "$TARGET_DIR"/*.tf
}

build_backend_args() {
  BACKEND_ARGS=()
  uses_s3_backend || return 0

  if [ -z "${TF_STATE_BUCKET:-}" ] && [ ${#BACKEND_CONFIGS[@]} -eq 0 ]; then
    die "$(printf '%s\n' \
      "${TARGET_DIR#./} uses a partial S3 backend but TF_STATE_BUCKET is not set." \
      "   Add these to $ENV_FILE, from the matching bootstrap layer's output:" \
      "     TF_STATE_BUCKET=<state_bucket_name>" \
      "     TF_STATE_REGION=<state_bucket_region>      # AWS only" \
      "     TF_STATE_LOCK_TABLE=<lock_table_name>      # AWS only" \
      "     TF_STATE_ENDPOINT=<s3 endpoint>            # DigitalOcean / Linode" \
      "   Or pass --backend-config=bucket=... explicitly.")"
  fi

  [ -n "${TF_STATE_BUCKET:-}" ] && BACKEND_ARGS+=("-backend-config=bucket=$TF_STATE_BUCKET")
  [ -n "${TF_STATE_REGION:-}" ] && BACKEND_ARGS+=("-backend-config=region=$TF_STATE_REGION")
  [ -n "${TF_STATE_LOCK_TABLE:-}" ] && BACKEND_ARGS+=("-backend-config=dynamodb_table=$TF_STATE_LOCK_TABLE")

  # Spaces and Linode Object Storage are S3-compatible but not S3, so they need
  # an explicit endpoint. Only AWS omits this.
  if [ -n "${TF_STATE_ENDPOINT:-}" ]; then
    BACKEND_ARGS+=("-backend-config=endpoints={s3=\"$TF_STATE_ENDPOINT\"}")
  fi

  for bc in "${BACKEND_CONFIGS[@]}"; do
    BACKEND_ARGS+=("-backend-config=$bc")
  done
}

needs_init() {
  case "$TF_COMMAND" in
    init|fmt|version|-version|--version|help|-help|--help) return 1 ;;
  esac

  [ -d "$TARGET_DIR/.terraform" ] || return 0

  # A directory initialised with `-backend=false` — which is what
  # bin/terraform-verify.sh does — has providers but no recorded backend, and
  # every plan against it fails with "Backend initialization required". Treat
  # that as needing init rather than surfacing Terraform's error.
  if uses_s3_backend && [ ! -f "$TARGET_DIR/.terraform/terraform.tfstate" ]; then
    echo "ℹ️  .terraform exists but no backend is recorded (validate-only init) — reinitialising"
    return 0
  fi

  return 1
}

if [ "$DRY_RUN" -eq 0 ] && [ "$SKIP_INIT" -eq 0 ] && needs_init; then
  echo "⚙️  Running terraform init"
  build_backend_args
  terraform -chdir="$TARGET_DIR" init "${BACKEND_ARGS[@]}" || die "terraform init failed"
elif [ "$TF_COMMAND" = "init" ]; then
  # An explicit `init` still gets the backend arguments.
  build_backend_args
  TF_EXTRA_ARGS+=("${BACKEND_ARGS[@]}")
fi

# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if [ "$DRY_RUN" -eq 1 ]; then
  echo "🚀 Dry run — would execute:"
  echo "   terraform -chdir=$TARGET_DIR ${NEW_ARGS[*]} ${TF_EXTRA_ARGS[*]}"
  TF_EXIT=0
else
  terraform -chdir="$TARGET_DIR" "${NEW_ARGS[@]}" "${TF_EXTRA_ARGS[@]}"
  TF_EXIT=$?
fi

# ---------------------------------------------------------------------------
# afterrun hook — runs on success and failure so cleanup always happens, but
# never masks a Terraform failure.
# ---------------------------------------------------------------------------
if [ -f "$TARGET_DIR/afterrun.sh" ] && [ "$SKIP_afterrun" -eq 0 ]; then
  echo "🧹 Running cleanup script"
  # shellcheck disable=SC1090
  source "$TARGET_DIR/afterrun.sh" || echo "⚠️  afterrun.sh failed" >&2
fi

if [ "$TF_EXIT" -ne 0 ]; then
  echo "❌ terraform ${NEW_ARGS[0]} failed (exit $TF_EXIT)" >&2
  [ -n "${TF_LOG_PATH:-}" ] && echo "   Log: $TF_LOG_PATH" >&2
fi

exit "$TF_EXIT"
