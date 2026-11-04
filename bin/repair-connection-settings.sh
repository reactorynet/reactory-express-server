#!/bin/bash
# Repoint the stored reactory.mongodb.connection at the database the server uses.
#
# The code default (src/data/clientConfigs/reactory/settings/settings.ts) is only
# seeded into reactory_clients when the client document is first created, so an
# existing install keeps whatever it stored. This tool repairs the stored value
# from the deployment environment. See scripts/ops/repair-connection-settings.ts.
#
# Usage:
#   bin/repair-connection-settings.sh                       # dry run (default)
#   bin/repair-connection-settings.sh --apply               # repair the stale default
#   bin/repair-connection-settings.sh --apply --force       # overwrite a custom value
#   bin/repair-connection-settings.sh --json                # machine-readable
#
# Options:
#   --apply          Write. Without it nothing is written.
#   --force          Overwrite a value that is not the historical default.
#   --keep-variant   Leave the declared variant spelling untouched.
#   --client=<key>   Client key to repair (default: reactory).
#   --env-file=<f>   Environment file (default: ./.env when present).
#
# Safe to re-run: a setting that already matches the environment is a no-op.
# Secrets are redacted from all output.
set -u
cd "$(dirname "$0")/.."

ENV_FILE="./.env"
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --env-file=*) ENV_FILE="${arg#*=}" ;;
    *) ARGS+=("$arg") ;;
  esac
done

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

NODE_PATH="" TS_NODE_TRANSPILE_ONLY=true exec node -r ts-node/register \
  scripts/ops/repair-connection-settings.ts "${ARGS[@]+"${ARGS[@]}"}"
