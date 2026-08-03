#!/bin/bash
#
# minikube-up.sh — create a local Kubernetes cluster for the local/minikube
# Terraform target.
#
# Creates the cluster only. Deploy onto it with:
#
#   bin/terraform.sh apply --target=local/minikube --reactory-env=local
#
# or build, load images and deploy in one go:
#
#   bin/bit.sh reactory local
#
# Usage: bin/minikube-up.sh [options]
#   --profile=<name>   minikube profile and kube context (default: reactory)
#   --driver=<name>    vfkit | docker | podman | qemu (default: vfkit)
#   --cpus=<n>         (default: 4)
#   --memory=<mb>      (default: 8192)
#   --disk=<size>      (default: 40g)
#   --recreate         Delete an existing profile first
#   --no-ingress       Skip the ingress addon
#
# WHY vfkit
#
# vfkit uses Apple's Virtualization framework and is the reliable macOS driver.
# The podman driver is marked experimental and times out creating the host on
# Apple silicon; the docker driver needs Docker Desktop running.
#
# CORPORATE TLS INTERCEPTION
#
# On a machine behind a TLS-inspecting proxy — Cato Networks, Zscaler,
# Netskope and similar — image pulls inside the VM fail with:
#
#   x509: certificate signed by unknown authority
#
# even though curl works from the host, because the VM does not trust the
# proxy's root CA. This script copies any intercepting CA it finds in the macOS
# System keychain into ~/.minikube/certs and starts with --embed-certs, which
# installs them into the VM's trust store.

set -o pipefail

PROFILE=reactory
DRIVER=vfkit
CPUS=4
MEMORY=8192
DISK=40g
RECREATE=0
WITH_INGRESS=1

for arg in "$@"; do
  case $arg in
    --profile=*)  PROFILE="${arg#*=}" ;;
    --driver=*)   DRIVER="${arg#*=}" ;;
    --cpus=*)     CPUS="${arg#*=}" ;;
    --memory=*)   MEMORY="${arg#*=}" ;;
    --disk=*)     DISK="${arg#*=}" ;;
    --recreate)   RECREATE=1 ;;
    --no-ingress) WITH_INGRESS=0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

die() { echo "❌ $1" >&2; exit 1; }

command -v minikube >/dev/null 2>&1 || die "minikube is not installed (brew install minikube)"
command -v kubectl  >/dev/null 2>&1 || die "kubectl is not installed"

if [ "$DRIVER" = "vfkit" ] && ! command -v vfkit >/dev/null 2>&1; then
  die "vfkit is not installed (brew install vfkit), or pass --driver=docker"
fi

# ---------------------------------------------------------------------------
# Stage any TLS-intercepting root CA into ~/.minikube/certs
#
# minikube installs everything here into the VM's trust store when started with
# --embed-certs. Without it, every image pull fails behind a corporate proxy.
# ---------------------------------------------------------------------------
stage_corporate_cas() {
  [ "$(uname)" = "Darwin" ] || return 0

  local certs_dir="$HOME/.minikube/certs"
  mkdir -p "$certs_dir"

  # Which CN is intercepting? Ask a host that image pulls actually redirect to.
  local issuer
  issuer=$(echo | openssl s_client -connect europe-southwest1-docker.pkg.dev:443 \
             -servername europe-southwest1-docker.pkg.dev 2>/dev/null \
           | openssl x509 -noout -issuer 2>/dev/null)

  case "$issuer" in
    *Google*|*GTS*|*"DigiCert"*|"")
      echo "🔓 No TLS interception detected"
      return 0
      ;;
  esac

  # Take the organisation name out of the issuer and pull matching roots from
  # the System keychain, so this is not hardcoded to one vendor.
  local vendor
  vendor=$(echo "$issuer" | sed -n 's/.*CN=\([A-Za-z]*\).*/\1/p')
  [ -n "$vendor" ] || vendor="Cato"

  echo "🔐 TLS interception detected: ${issuer#issuer=}"
  echo "   Staging '$vendor' root CAs for the VM trust store"

  security find-certificate -a -c "$vendor" -p /Library/Keychains/System.keychain \
    > /tmp/minikube-corp-ca.pem 2>/dev/null

  if [ ! -s /tmp/minikube-corp-ca.pem ]; then
    echo "   ⚠️  No '$vendor' certificate found in the System keychain." >&2
    echo "      Image pulls inside the VM will fail with x509 errors." >&2
    echo "      Export the root CA manually into $certs_dir and re-run." >&2
    return 0
  fi

  python3 - "$certs_dir" <<'PY'
import pathlib, subprocess, sys
out = pathlib.Path(sys.argv[1])
raw = pathlib.Path("/tmp/minikube-corp-ca.pem").read_text()
blocks = ["-----BEGIN CERTIFICATE-----" + b
          for b in raw.split("-----BEGIN CERTIFICATE-----")[1:]]
n = 0
for b in blocks:
    subj = subprocess.run(["openssl", "x509", "-noout", "-subject"],
                          input=b, capture_output=True, text=True).stdout.strip()
    if not subj:
        continue
    n += 1
    name = "corp-root-ca.pem" if "ROOT" in subj.upper() else f"corp-ca-{n}.pem"
    (out / name).write_text(b)
    print(f"   → {name}")
print(f"   {n} certificate(s) staged")
PY
  rm -f /tmp/minikube-corp-ca.pem
}

# ---------------------------------------------------------------------------
if [ "$RECREATE" -eq 1 ]; then
  echo "🗑️  Deleting profile $PROFILE"
  minikube delete --profile "$PROFILE" >/dev/null 2>&1
fi

if minikube status --profile "$PROFILE" >/dev/null 2>&1; then
  echo "✅ Profile '$PROFILE' is already running (pass --recreate to rebuild)"
else
  stage_corporate_cas

  echo "🚀 Starting minikube profile '$PROFILE' (${DRIVER}, ${CPUS} cpu, ${MEMORY}MB, ${DISK})"
  minikube start \
    --profile "$PROFILE" \
    --driver="$DRIVER" \
    --cpus="$CPUS" \
    --memory="$MEMORY" \
    --disk-size="$DISK" \
    --embed-certs \
    || die "minikube start failed — see the output above"
fi

if [ "$WITH_INGRESS" -eq 1 ]; then
  echo "🌐 Enabling the ingress addon"
  minikube addons enable ingress --profile "$PROFILE" \
    || die "Could not enable the ingress addon. If pods fail with x509 errors, the VM is missing your proxy's root CA — see the notes at the top of this script."
fi

MK_IP=$(minikube ip --profile "$PROFILE") || die "Could not read the minikube IP"
INGRESS_HOST="reactory.${MK_IP}.nip.io"

# ---------------------------------------------------------------------------
# Write the ingress host into a tfvars file, so the Terraform target does not
# have to guess an IP that changes with every recreate.
# ---------------------------------------------------------------------------
TFVARS="./config/reactory/terraform/local/minikube/generated.auto.tfvars"
if [ -d "$(dirname "$TFVARS")" ]; then
  cat > "$TFVARS" <<EOF
# Generated by bin/minikube-up.sh — do not edit.
# The minikube IP changes whenever the profile is recreated.
kube_context = "${PROFILE}"
ingress_host = "${INGRESS_HOST}"
EOF
  echo "📝 Wrote ${TFVARS#./}"
fi

cat <<EOF

✅ Cluster '$PROFILE' ready
   node IP      ${MK_IP}
   ingress host ${INGRESS_HOST}
   context      kubectl --context ${PROFILE} get pods -A

Next:
   bin/bit.sh reactory local                     # build, load images, deploy
   bin/terraform.sh apply --target=local/minikube --reactory-env=local

Then:
   open http://${INGRESS_HOST}
EOF
