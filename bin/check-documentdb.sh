#!/bin/bash
# DocumentDB compatibility check (WP-B4): runs every MongoDB feature the server
# uses against the configured target in a scratch database, and lists the
# files behind any feature the target rejects. See scripts/ci/documentdb-probe.ts.
#
#   MONGOOSE='mongodb://host:27017/?tls=true&replicaSet=rs0&retryWrites=false' \
#   MONGO_USER=... MONGO_PASSWORD=... REACTORY_MONGO_CA_FILE=global-bundle.pem \
#     bin/check-documentdb.sh [--db <scratch db>] [--keep]
#
# Reads settings from the environment only; it does not load .env. The user
# needs rights to create and drop the scratch database.
set -u
cd "$(dirname "$0")/.."
NODE_PATH="" TS_NODE_TRANSPILE_ONLY=true exec node -r ts-node/register scripts/ci/documentdb-probe.ts "$@"
