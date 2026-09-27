#!/bin/bash
# Connect through every platform database consumer with the WP-B4 connection
# settings and report whether each one is encrypted. See
# scripts/ci/check-db-connections.ts. Reads settings from the environment only;
# it does not load .env.
#
#   bin/check-db-connections.sh [--postgres-only | --mongo-only] [--require-tls]
set -u
cd "$(dirname "$0")/.."
NODE_PATH="" TS_NODE_TRANSPILE_ONLY=true exec node -r ts-node/register scripts/ci/check-db-connections.ts "$@"
