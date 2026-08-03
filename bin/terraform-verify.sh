#!/bin/bash
#
# terraform-verify.sh — validate every deployment target without deploying.
#
# Covers every cloud in the tree: aws, digitalocean, linode and minikube.
#
# Runs:
#   1. terraform fmt                     canonical formatting (.tf only)
#   2. terraform init -backend=false
#      + terraform validate              syntax, provider schemas, module wiring,
#                                        output and variable references
#   3. helm lint + helm template         local charts actually render
#   4. check-secret-refs.py              every secret_key_ref resolves to a key
#                                        the secrets pipeline projects
#   5. layer contract check              cluster layers expose the outputs their
#                                        workload layer consumes, per cloud
#
# -backend=false means no S3 bucket, no state and no AWS credentials are touched,
# so this is safe on any checkout and in CI.
#
# Provider downloads go to a scratch TF_DATA_DIR rather than each target's
# .terraform, so verifying never leaves a backend-less working directory behind
# for bin/terraform.sh to trip over.
#
# What this does NOT cover: `terraform plan` needs real AWS credentials — the
# alb_ingress and opensearch modules call aws_caller_identity at plan time. Run a
# plan against a throwaway account before the first apply.
#
# Usage: bin/terraform-verify.sh [config-id] [--fix] [--keep-data-dir]

set -o pipefail

REACTORY_CONFIG_ID=reactory
FIX=0
KEEP_DATA_DIR=0

for arg in "$@"; do
  case $arg in
    --fix)            FIX=1 ;;
    --keep-data-dir)  KEEP_DATA_DIR=1 ;;
    -*)               echo "Unknown option: $arg" >&2; exit 1 ;;
    *)                REACTORY_CONFIG_ID="$arg" ;;
  esac
done

TF_ROOT="./config/${REACTORY_CONFIG_ID}/terraform"
FAILURES=0

# Per-target TF_DATA_DIR keeps each target's module cache isolated, but without a
# shared plugin cache every target re-downloads every provider — eight targets
# times five providers. The cache is persistent so repeat runs are near-instant.
export TF_PLUGIN_CACHE_DIR="${TF_PLUGIN_CACHE_DIR:-$HOME/.terraform.d/plugin-cache}"
mkdir -p "$TF_PLUGIN_CACHE_DIR"

VERIFY_DATA_DIR=$(mktemp -d "${TMPDIR:-/tmp}/reactory-tf-verify.XXXXXX") || exit 1
cleanup() {
  if [ "$KEEP_DATA_DIR" -eq 0 ]; then
    rm -rf "$VERIFY_DATA_DIR"
  else
    echo "   (provider cache kept at $VERIFY_DATA_DIR)"
  fi
}
trap cleanup EXIT

step() { echo; echo "── $1"; }
fail() { echo "   ❌ $1"; FAILURES=$((FAILURES + 1)); }
ok()   { echo "   ✅ $1"; }

command -v terraform >/dev/null 2>&1 || { echo "terraform not on PATH (brew install hashicorp/tap/terraform)" >&2; exit 1; }
[ -d "$TF_ROOT" ] || { echo "No terraform root at $TF_ROOT" >&2; exit 1; }

echo "🔍 Verifying deployment targets under $TF_ROOT"
terraform version | head -1
command -v helm >/dev/null 2>&1 && helm version --short

# ---------------------------------------------------------------------------
# 1. Formatting
#
# terraform fmt also rewrites .tfvars, but those are data files — often
# gitignored, and the minikube one still holds credentials pending untracking.
# Only .tf files are held to canonical formatting.
# ---------------------------------------------------------------------------
step "Formatting"
if [ "$FIX" -eq 1 ]; then
  while IFS= read -r tf; do
    terraform fmt "$tf" >/dev/null
  done < <(find "$TF_ROOT" -name "*.tf" -not -path "*/.terraform/*")
  ok "reformatted .tf files"
else
  UNFORMATTED=$(terraform fmt -check -recursive "$TF_ROOT" 2>/dev/null | grep -v '\.tfvars$')
  if [ -n "$UNFORMATTED" ]; then
    echo "$UNFORMATTED" | sed 's/^/      /'
    fail "files need terraform fmt (re-run with --fix)"
  else
    ok "all .tf files formatted"
  fi
fi

# ---------------------------------------------------------------------------
# 2. init + validate, per target
# ---------------------------------------------------------------------------
step "Validating targets"
while IFS= read -r main_tf; do
  T_DIR=$(dirname "$main_tf")
  T_NAME=${T_DIR#"$TF_ROOT"/}

  # A per-target data dir: shared provider plugins would be fine, but the
  # module cache is target-specific.
  export TF_DATA_DIR="$VERIFY_DATA_DIR/$(echo "$T_NAME" | tr '/' '_')"

  # -upgrade so a bumped version constraint does not fail against a lock file
  # written under the old one. Verification is not authoritative for locks —
  # see the readme on generating multi-platform locks deliberately.
  if ! OUTPUT=$(terraform -chdir="$T_DIR" init -backend=false -input=false -upgrade 2>&1); then
    fail "$T_NAME — init failed"
    echo "$OUTPUT" | tail -15 | sed 's/^/      /'
    continue
  fi

  if OUTPUT=$(terraform -chdir="$T_DIR" validate -no-color 2>&1); then
    ok "$T_NAME"
  else
    fail "$T_NAME"
    echo "$OUTPUT" | sed 's/^/      /'
  fi
done < <(find "$TF_ROOT" -name main.tf -not -path "*/.terraform/*" -not -path "*/modules/*" | sort)
unset TF_DATA_DIR

# ---------------------------------------------------------------------------
# 3. Local Helm charts
# ---------------------------------------------------------------------------
step "Local Helm charts"
if command -v helm >/dev/null 2>&1; then
  CHART_COUNT=0
  while IFS= read -r chart_yaml; do
    CHART_DIR=$(dirname "$chart_yaml")
    CHART_NAME=${CHART_DIR#"$TF_ROOT"/}
    CHART_COUNT=$((CHART_COUNT + 1))

    if OUTPUT=$(helm lint "$CHART_DIR" 2>&1); then
      ok "lint $CHART_NAME"
    else
      fail "lint $CHART_NAME"
      echo "$OUTPUT" | sed 's/^/      /'
    fi

    if OUTPUT=$(helm template verify "$CHART_DIR" 2>&1); then
      ok "template $CHART_NAME"
    else
      fail "template $CHART_NAME"
      echo "$OUTPUT" | sed 's/^/      /'
    fi
  done < <(find "$TF_ROOT" -name Chart.yaml -not -path "*/.terraform/*" -not -path "*/charts/*" | sort)
  [ "$CHART_COUNT" -eq 0 ] && echo "   (no local charts found)"
else
  echo "   ⚠️  helm not on PATH — skipping chart checks (brew install helm)"
fi

# ---------------------------------------------------------------------------
# 4. Secret reference cross-check
# ---------------------------------------------------------------------------
step "Secret references"
if [ -f bin/utils/check-secret-refs.py ]; then
  if OUTPUT=$(python3 bin/utils/check-secret-refs.py "$TF_ROOT" 2>&1); then
    ok "all secret_key_ref entries resolve"
    echo "$OUTPUT" | grep -E "^\s+note:" | sed 's/^/   /'
  else
    fail "unresolved secret references"
    echo "$OUTPUT" | sed 's/^/      /'
  fi
else
  echo "   (skipped — checker missing)"
fi

# ---------------------------------------------------------------------------
# 5. Layer contract
# ---------------------------------------------------------------------------
step "Layer contract"
if [ -f bin/utils/check-layer-contract.py ]; then
  if OUTPUT=$(python3 bin/utils/check-layer-contract.py "$TF_ROOT" 2>&1); then
    ok "every workload layer's cluster references are satisfied"
    echo "$OUTPUT" | grep -E "^\s+note:" | sed 's/^/   /'
  else
    fail "layer contract mismatch"
    echo "$OUTPUT" | sed 's/^/      /'
  fi
else
  echo "   (skipped — checker missing)"
fi

# ---------------------------------------------------------------------------
echo
if [ "$FAILURES" -eq 0 ]; then
  echo "✅ All checks passed."
  echo "   Note: terraform plan still requires AWS credentials — this run never contacted AWS."
  exit 0
fi
echo "❌ $FAILURES check(s) failed."
exit 1
