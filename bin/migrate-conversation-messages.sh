#!/bin/bash
# Conversation message store migration helper.
#
# Wraps the Mongo -> Postgres message backfill so it is repeatable and safe to
# run at any point in the rollout. The backfill is idempotent: rows are keyed on
# the Mongo subdocument `_id`, so re-running skips what is already present and
# only fills gaps.
#
# Usage:
#   bin/migrate-conversation-messages.sh <command> [client_key] [target_env] [options]
#
# Commands:
#   status    - report drift between Mongo and Postgres (no writes). Default.
#   up        - run the backfill, writing any missing rows.
#   verify    - report drift after a write, for confirmation.
#
# Options:
#   --conversation=<id>   limit to a single conversation
#   --include-truncated   also migrate `truncatedHistory` as archived rows
#   --batch-size=<n>      progress report interval (default 25)
#   --bun                 run via bun instead of node
#
# Notes:
# - `status` and `verify` never write. `up` is the only writing command.
# - Prerequisite: the table must exist. Create it with
#     bin/migrate-typeorm.sh up --module=reactory-reactor
# - Safe to run while the server is live. With dual-write active the two stores
#   stay in step, so a reconcile run should report a small or zero delta.

source ./bin/shared/shell-utils.sh

show_usage() {
  echo "🗂️  Reactory Conversation Message Migration"
  echo ""
  echo "Usage: $0 <command> [client_key] [target_env] [options]"
  echo ""
  echo "Commands:"
  echo "  status    Report drift between Mongo and Postgres (no writes). Default."
  echo "  up        Run the backfill, writing any missing rows."
  echo "  verify    Report drift after a write, for confirmation."
  echo "  reconcile Repair content and seq numbering (writes)"
  echo "  gaps      Report Mongo/Postgres gaps (read-only)"
  echo ""
  echo "Options:"
  echo "  --conversation=<id>   Limit to a single conversation"
  echo "  --include-truncated   Also migrate truncatedHistory as archived rows"
  echo "  --prune-orphans       Delete rows whose message is no longer in Mongo (repair)"
  echo "  --include-active      Also repair conversations written to in the last 120s (races the writer)"
  echo "  --batch-size=<n>      Progress report interval (default 25)"
  echo ""
  echo "Examples:"
  echo "  $0 status"
  echo "  $0 up"
  echo "  $0 up reactory local --conversation=6aa292e4eb48abbe7e0a4bf4"
  echo "  $0 verify"
}

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  show_usage
  exit 0
fi

COMMAND="${1:-status}"
shift

CLIENT_KEY="reactory"
TARGET_ENV="local"
ONLY_CONVERSATION=""
INCLUDE_TRUNCATED=""
PRUNE_ORPHANS=""
INCLUDE_ACTIVE=""
BATCH_SIZE=""
USE_BUN=false
_CLIENT_SET=0
_ENV_SET=0

for arg in "$@"; do
  case "$arg" in
    --conversation=*)     ONLY_CONVERSATION="${arg#*=}" ;;
    --include-truncated)  INCLUDE_TRUNCATED="--include-truncated" ;;
    --prune-orphans)      PRUNE_ORPHANS="--prune-orphans" ;;
    --include-active)     INCLUDE_ACTIVE="--include-active" ;;
    --batch-size=*)       BATCH_SIZE="${arg#*=}" ;;
    --bun)                USE_BUN=true ;;
    --*)                  ;;
    *)
      if [[ $_CLIENT_SET -eq 0 ]]; then
        CLIENT_KEY="$arg"; _CLIENT_SET=1
      elif [[ $_ENV_SET -eq 0 ]]; then
        TARGET_ENV="$arg"; _ENV_SET=1
      fi
      ;;
  esac
done

case "$COMMAND" in
  status|up|verify|reconcile|gaps) ;;
  *)
    echo "Error: unsupported command '$COMMAND'."
    echo ""
    show_usage
    exit 1
    ;;
esac

# `status` and `verify` are read-only; only `up` writes.
SCRIPT_ARGS=()
# `up` fills gaps; `reconcile` additionally repairs orphans and re-derives seq.
case "$COMMAND" in
  up|reconcile)
    SCRIPT_ARGS+=("--apply")
    ;;
esac
if [[ -n "$ONLY_CONVERSATION" ]]; then
  SCRIPT_ARGS+=("--conversation=${ONLY_CONVERSATION}")
fi
if [[ -n "$INCLUDE_TRUNCATED" ]]; then
  SCRIPT_ARGS+=("${INCLUDE_TRUNCATED}")
fi
if [[ -n "$PRUNE_ORPHANS" ]]; then
  SCRIPT_ARGS+=("${PRUNE_ORPHANS}")
fi
if [[ -n "$INCLUDE_ACTIVE" ]]; then
  SCRIPT_ARGS+=("${INCLUDE_ACTIVE}")
fi

copy_env_file "$CLIENT_KEY" "$TARGET_ENV" || exit 1
ENV_FILE="./.env"

ENV_CMD="./node_modules/.bin/env-cmd"
if [[ ! -f "$ENV_CMD" ]]; then
  echo "Error: env-cmd not found. Run: yarn install"
  exit 1
fi

# Which script backs each command. `reconcile` repairs content and numbering;
# `gaps` is a read-only diagnostic; the rest are the incremental backfill.
SCRIPTS_DIR="src/modules/reactory-reactor/scripts"
case "$COMMAND" in
  reconcile) TARGET_SCRIPT="$SCRIPTS_DIR/reconcileConversationMessages.ts" ;;
  gaps)      TARGET_SCRIPT="$SCRIPTS_DIR/reportMessageGaps.ts" ;;
  *)         TARGET_SCRIPT="$SCRIPTS_DIR/backfillConversationMessages.ts" ;;
esac

if [[ ! -f "$TARGET_SCRIPT" ]]; then
  echo "Error: script not found at $TARGET_SCRIPT"
  exit 1
fi

export BATCH_SIZE="${BATCH_SIZE:-25}"

if [[ "$USE_BUN" == "true" ]]; then
  ensure_bun || exit 1
  echo "🗂️  conversation-migrate | command: ${COMMAND} | runtime: bun"
  BATCH_SIZE="$BATCH_SIZE" NODE_PATH=./ "$ENV_CMD" --no-override -f "$ENV_FILE" \
    bun "$TARGET_SCRIPT" "${SCRIPT_ARGS[@]}"
else
  echo "🗂️  conversation-migrate | command: ${COMMAND} | client: ${CLIENT_KEY} | env: ${TARGET_ENV}"
  if [[ "$COMMAND" == "status" || "$COMMAND" == "verify" ]]; then
    echo "   (read-only: no rows will be written)"
  fi
  echo ""

  # TS_NODE_TRANSPILE_ONLY: this script imports the conversation models, and a
  # full ts-node typecheck would fail on an unrelated pre-existing type error
  # elsewhere in the module.
  TS_NODE_TRANSPILE_ONLY=true NODE_PATH=./ "$ENV_CMD" --no-override -f "$ENV_FILE" \
    node -r ts-node/register -r tsconfig-paths/register "$TARGET_SCRIPT" "${SCRIPT_ARGS[@]}"
  EXIT_CODE=$?

  echo ""
  if [[ $EXIT_CODE -ne 0 ]]; then
    echo "❌ Migration command '${COMMAND}' finished with exit ${EXIT_CODE}."
    exit $EXIT_CODE
  fi

  if [[ "$COMMAND" == "status" ]]; then
    echo "ℹ️  Run '$0 up' to write the missing rows."
  fi
fi
