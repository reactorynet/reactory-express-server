#!/bin/bash
# Migration drift check (WP-B3).
#
# For every module with src/modules/<key>/migrations/typeorm/data-source.ts:
#   1. run its migrations against the configured Postgres database
#   2. `migration:generate --check`: fails when the entities describe a schema
#      the migrations do not produce (an entity changed without a migration)
#
# Point it at an EMPTY database. Connection settings come from the environment
# (REACTORY_POSTGRES_* / POSTGRES_*); CLASSROOM_POSTGRES_* follow them unless set.
set -u
cd "$(dirname "$0")/../.."

export TS_NODE_TRANSPILE_ONLY=true
export CLASSROOM_POSTGRES_HOST="${CLASSROOM_POSTGRES_HOST:-${REACTORY_POSTGRES_HOST:-}}"
export CLASSROOM_POSTGRES_DB="${CLASSROOM_POSTGRES_DB:-${REACTORY_POSTGRES_DB:-}}"
CLI=(node -r ts-node/register ./node_modules/typeorm/cli.js)
FAILED=0

for ds in src/modules/*/migrations/typeorm/data-source.ts; do
  module=$(echo "$ds" | cut -d/ -f3)
  echo "── ${module}"
  if ! NODE_PATH="" "${CLI[@]}" migration:run -d "$ds" > "/tmp/migrate-${module}.log" 2>&1; then
    echo "   migration:run FAILED"; tail -20 "/tmp/migrate-${module}.log"; FAILED=1; continue
  fi
  echo "   migrations applied"
  if ! NODE_PATH="" "${CLI[@]}" migration:generate "src/modules/${module}/migrations/typeorm/Drift" -d "$ds" --check > "/tmp/drift-${module}.log" 2>&1; then
    echo "   DRIFT: entities differ from the migrated schema. Generate a migration:"
    echo "     bin/migrate-typeorm.sh create --module=${module} --name=<Name>  (or migration:generate)"
    grep -E "queryRunner.query|Unexpected" "/tmp/drift-${module}.log" | head -20
    FAILED=1
  else
    echo "   no drift"
  fi
done

exit $FAILED
