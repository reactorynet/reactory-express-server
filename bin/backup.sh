#!/bin/bash
# Reactory Platform — Comprehensive Backup
#
# Usage: bin/backup.sh [client_key] [environment] [options]
#   client_key   Config directory under config/  (default: reactory)
#   environment  Env file suffix                 (default: local)
#
# Options:
#   --mongo-only      Back up MongoDB only
#   --postgres-only   Back up PostgreSQL only
#   --output-dir DIR  Write backup archive to DIR (default: $REACTORY_DATA/database/backup/<env>)
#   --no-bundle       Leave backup files in a directory instead of creating a .tar.gz
#   --dry-run         Print what would be done without executing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
source "$SCRIPT_DIR/shared/shell-utils.sh"

# ── Defaults ──────────────────────────────────────────────────────────────────
CLIENT_KEY="reactory"
TARGET_ENV="local"
BACKUP_MONGO=true
BACKUP_POSTGRES=true
OUTPUT_DIR=""
BUNDLE=true
DRY_RUN=false

# ── Argument parsing ───────────────────────────────────────────────────────────
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mongo-only)     BACKUP_POSTGRES=false; shift ;;
    --postgres-only)  BACKUP_MONGO=false;    shift ;;
    --no-bundle)      BUNDLE=false;          shift ;;
    --dry-run)        DRY_RUN=true;          shift ;;
    --output-dir)     OUTPUT_DIR="$2";       shift 2 ;;
    --*)              echo "Unknown option: $1"; exit 1 ;;
    *)                POSITIONAL+=("$1");    shift ;;
  esac
done
[[ ${#POSITIONAL[@]} -gt 0 ]] && CLIENT_KEY="${POSITIONAL[0]}"
[[ ${#POSITIONAL[@]} -gt 1 ]] && TARGET_ENV="${POSITIONAL[1]}"

# ── Load env file ──────────────────────────────────────────────────────────────
ENV_FILE="$REACTORY_SERVER/config/${CLIENT_KEY}/.env.${TARGET_ENV}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Env file not found: $ENV_FILE${NC}"
  exit 1
fi

echo "Loading environment from: $ENV_FILE"
set -a
# shellcheck disable=SC1090
source <(grep -v '^[[:space:]]*#\|^[[:space:]]*$' "$ENV_FILE")
set +a

# ── Validate required shell env vars ──────────────────────────────────────────
for var in REACTORY_DATA REACTORY_SERVER; do
  if [[ -z "${!var:-}" ]]; then
    echo -e "${RED}$var is not set in environment or env file${NC}"
    exit 1
  fi
done

# ── Resolve output directory ───────────────────────────────────────────────────
[[ -z "$OUTPUT_DIR" ]] && OUTPUT_DIR="$REACTORY_DATA/database/backup/$TARGET_ENV"
mkdir -p "$OUTPUT_DIR"

TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_NAME="reactory-backup-${CLIENT_KEY}-${TARGET_ENV}-${TIMESTAMP}"
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

mkdir -p "$WORK_DIR/$BACKUP_NAME/mongodb"
mkdir -p "$WORK_DIR/$BACKUP_NAME/postgres"

echo "================================================="
echo "  Reactory Platform Backup"
echo "  Client : $CLIENT_KEY"
echo "  Env    : $TARGET_ENV"
echo "  Output : $OUTPUT_DIR"
echo "  Bundle : $BUNDLE"
echo "  DryRun : $DRY_RUN"
echo "================================================="

# ── MongoDB backup ─────────────────────────────────────────────────────────────
MONGO_BACKUP_FILE=""
if [[ "$BACKUP_MONGO" == "true" ]]; then
  MONGO_HOST="${MONGO_HOST:-localhost}"
  MONGO_PORT="${MONGO_PORT:-27017}"
  MONGO_DB="${MONGO_DB:-reactory}"
  MONGO_USER="${MONGO_USER:-}"
  MONGO_PASSWORD="${MONGO_PASSWORD:-}"

  if ! ensure_mongo_tools; then
    echo -e "${RED}MongoDB backup skipped — tools unavailable${NC}"
  else
    MONGO_BACKUP_FILE="$WORK_DIR/$BACKUP_NAME/mongodb/${MONGO_DB}.agz"
    MONGO_ARGS=(
      --host "$MONGO_HOST"
      --port "$MONGO_PORT"
      --db   "$MONGO_DB"
      --gzip
      --archive="$MONGO_BACKUP_FILE"
    )
    [[ -n "$MONGO_USER"     ]] && MONGO_ARGS+=(--username "$MONGO_USER" --authenticationDatabase admin)
    [[ -n "$MONGO_PASSWORD" ]] && MONGO_ARGS+=(--password "$MONGO_PASSWORD")

    echo -e "${GREEN}Backing up MongoDB: ${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}${NC}"
    if [[ "$DRY_RUN" == "false" ]]; then
      mongodump "${MONGO_ARGS[@]}"
      echo -e "${GREEN}MongoDB backup complete: $MONGO_BACKUP_FILE${NC}"
    else
      echo "  [dry-run] mongodump ${MONGO_ARGS[*]}"
    fi
  fi
fi

# ── PostgreSQL backup ──────────────────────────────────────────────────────────
PG_BACKUP_FILE=""
if [[ "$BACKUP_POSTGRES" == "true" ]]; then
  PG_HOST="${POSTGRES_DB_HOST:-localhost}"
  PG_PORT="${POSTGRES_DB_PORT:-5432}"
  PG_DB="${POSTGRES_DB:-reactory}"
  PG_USER="${POSTGRES_USER:-reactory}"
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"

  if ! ensure_pg_client; then
    echo -e "${RED}PostgreSQL backup skipped — tools unavailable${NC}"
  else
    PG_BACKUP_FILE="$WORK_DIR/$BACKUP_NAME/postgres/${PG_DB}.pgdump"

    echo -e "${GREEN}Backing up PostgreSQL: ${PG_HOST}:${PG_PORT}/${PG_DB}${NC}"
    if [[ "$DRY_RUN" == "false" ]]; then
      pg_dump \
        --host="$PG_HOST" \
        --port="$PG_PORT" \
        --username="$PG_USER" \
        --format=custom \
        --file="$PG_BACKUP_FILE" \
        "$PG_DB"
      echo -e "${GREEN}PostgreSQL backup complete: $PG_BACKUP_FILE${NC}"
    else
      echo "  [dry-run] pg_dump --host=$PG_HOST --port=$PG_PORT --username=$PG_USER --format=custom $PG_DB"
    fi
    unset PGPASSWORD
  fi
fi

# ── Write manifest ─────────────────────────────────────────────────────────────
MANIFEST="$WORK_DIR/$BACKUP_NAME/manifest.json"
ISO_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$MANIFEST" <<EOF
{
  "version": "1.0",
  "timestamp": "$ISO_TIMESTAMP",
  "client_key": "$CLIENT_KEY",
  "environment": "$TARGET_ENV",
  "databases": {
    "mongodb": {
      "enabled": $BACKUP_MONGO,
      "host": "${MONGO_HOST:-}",
      "port": ${MONGO_PORT:-27017},
      "database": "${MONGO_DB:-}",
      "file": "mongodb/${MONGO_DB:-}.agz"
    },
    "postgres": {
      "enabled": $BACKUP_POSTGRES,
      "host": "${PG_HOST:-}",
      "port": ${PG_PORT:-5432},
      "database": "${PG_DB:-}",
      "file": "postgres/${PG_DB:-}.pgdump"
    }
  }
}
EOF

echo "Manifest written: $MANIFEST"

# ── Bundle or copy ─────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == "false" ]]; then
  if [[ "$BUNDLE" == "true" ]]; then
    ARCHIVE="$OUTPUT_DIR/${BACKUP_NAME}.tar.gz"
    tar -czf "$ARCHIVE" -C "$WORK_DIR" "$BACKUP_NAME"
    echo -e "${GREEN}Backup archive: $ARCHIVE${NC}"
  else
    cp -r "$WORK_DIR/$BACKUP_NAME" "$OUTPUT_DIR/"
    echo -e "${GREEN}Backup directory: $OUTPUT_DIR/$BACKUP_NAME${NC}"
  fi
else
  echo "[dry-run] Would write backup to: $OUTPUT_DIR/${BACKUP_NAME}.tar.gz"
fi
