#!/bin/bash
# Reactory Platform — Comprehensive Restore
#
# Usage: bin/restore.sh <archive> [client_key] [environment] [options]
#   archive      Path to a .tar.gz archive or an extracted backup directory
#   client_key   Config directory under config/  (default: reactory)
#   environment  Env file suffix                 (default: local)
#
# Options:
#   --mongo-only              Restore MongoDB only
#   --postgres-only           Restore PostgreSQL only
#   --mongo-ns-from PREFIX    Remap MongoDB namespace from PREFIX (default: value in manifest)
#   --mongo-ns-to   PREFIX    Remap MongoDB namespace to PREFIX
#   --pg-target-db  DBNAME    Restore PostgreSQL into DBNAME instead of the original
#   --drop                    Drop existing data before restoring (mongorestore --drop / pg DROP+CREATE)
#   --dry-run                 Print what would be done without executing

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
source "$SCRIPT_DIR/shared/shell-utils.sh"

# ── Defaults ───────────────────────────────────────────────────────────────────
ARCHIVE=""
CLIENT_KEY="reactory"
TARGET_ENV="local"
RESTORE_MONGO=true
RESTORE_POSTGRES=true
MONGO_NS_FROM=""
MONGO_NS_TO=""
PG_TARGET_DB=""
DROP=false
DRY_RUN=false

# ── Argument parsing ───────────────────────────────────────────────────────────
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mongo-only)      RESTORE_POSTGRES=false; shift ;;
    --postgres-only)   RESTORE_MONGO=false;    shift ;;
    --drop)            DROP=true;              shift ;;
    --dry-run)         DRY_RUN=true;           shift ;;
    --mongo-ns-from)   MONGO_NS_FROM="$2";     shift 2 ;;
    --mongo-ns-to)     MONGO_NS_TO="$2";       shift 2 ;;
    --pg-target-db)    PG_TARGET_DB="$2";      shift 2 ;;
    --*)               echo "Unknown option: $1"; exit 1 ;;
    *)                 POSITIONAL+=("$1");     shift ;;
  esac
done
[[ ${#POSITIONAL[@]} -gt 0 ]] && ARCHIVE="${POSITIONAL[0]}"
[[ ${#POSITIONAL[@]} -gt 1 ]] && CLIENT_KEY="${POSITIONAL[1]}"
[[ ${#POSITIONAL[@]} -gt 2 ]] && TARGET_ENV="${POSITIONAL[2]}"

if [[ -z "$ARCHIVE" ]]; then
  echo -e "${RED}Usage: bin/restore.sh <archive> [client_key] [environment] [options]${NC}"
  exit 1
fi

if [[ ! -e "$ARCHIVE" ]]; then
  echo -e "${RED}Archive not found: $ARCHIVE${NC}"
  exit 1
fi

# ── Load env file for credentials ─────────────────────────────────────────────
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

# ── Extract archive if needed ──────────────────────────────────────────────────
WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

if [[ -f "$ARCHIVE" && "$ARCHIVE" == *.tar.gz ]]; then
  echo "Extracting archive: $ARCHIVE"
  tar -xzf "$ARCHIVE" -C "$WORK_DIR"
  # Find the top-level backup directory inside the archive
  BACKUP_DIR="$(find "$WORK_DIR" -maxdepth 1 -mindepth 1 -type d | head -1)"
elif [[ -d "$ARCHIVE" ]]; then
  BACKUP_DIR="$ARCHIVE"
else
  echo -e "${RED}Archive must be a .tar.gz file or a directory${NC}"
  exit 1
fi

if [[ -z "$BACKUP_DIR" || ! -d "$BACKUP_DIR" ]]; then
  echo -e "${RED}Could not locate backup directory inside archive${NC}"
  exit 1
fi

# ── Read manifest ──────────────────────────────────────────────────────────────
MANIFEST="$BACKUP_DIR/manifest.json"
if [[ ! -f "$MANIFEST" ]]; then
  echo -e "${YELLOW}No manifest.json found — proceeding with env file values${NC}"
  MANIFEST_MONGO_DB="${MONGO_DB:-reactory}"
  MANIFEST_PG_DB="${POSTGRES_DB:-reactory}"
else
  echo "Reading manifest: $MANIFEST"
  # Parse manifest using python3 if available, otherwise use basic grep
  if has_command python3; then
    MANIFEST_MONGO_DB=$(python3 -c "import json,sys; d=json.load(open('$MANIFEST')); print(d['databases']['mongodb']['database'])" 2>/dev/null || echo "${MONGO_DB:-reactory}")
    MANIFEST_PG_DB=$(python3   -c "import json,sys; d=json.load(open('$MANIFEST')); print(d['databases']['postgres']['database'])" 2>/dev/null || echo "${POSTGRES_DB:-reactory}")
    MANIFEST_TIMESTAMP=$(python3 -c "import json,sys; d=json.load(open('$MANIFEST')); print(d['timestamp'])" 2>/dev/null || echo "unknown")
    echo "  Backup timestamp : $MANIFEST_TIMESTAMP"
    echo "  MongoDB database : $MANIFEST_MONGO_DB"
    echo "  PostgreSQL db    : $MANIFEST_PG_DB"
  else
    MANIFEST_MONGO_DB=$(grep -o '"database": "[^"]*"' "$MANIFEST" | head -1 | cut -d'"' -f4)
    MANIFEST_PG_DB=$(grep   -o '"database": "[^"]*"' "$MANIFEST" | tail -1 | cut -d'"' -f4)
    [[ -z "$MANIFEST_MONGO_DB" ]] && MANIFEST_MONGO_DB="${MONGO_DB:-reactory}"
    [[ -z "$MANIFEST_PG_DB"    ]] && MANIFEST_PG_DB="${POSTGRES_DB:-reactory}"
  fi
fi

echo "================================================="
echo "  Reactory Platform Restore"
echo "  Client   : $CLIENT_KEY"
echo "  Env      : $TARGET_ENV"
echo "  Archive  : $ARCHIVE"
echo "  Drop     : $DROP"
echo "  DryRun   : $DRY_RUN"
echo "================================================="

# ── MongoDB restore ────────────────────────────────────────────────────────────
if [[ "$RESTORE_MONGO" == "true" ]]; then
  MONGO_BACKUP_FILE="$BACKUP_DIR/mongodb/${MANIFEST_MONGO_DB}.agz"

  if [[ ! -f "$MONGO_BACKUP_FILE" ]]; then
    echo -e "${YELLOW}MongoDB backup file not found: $MONGO_BACKUP_FILE — skipping${NC}"
  elif ! ensure_mongo_tools; then
    echo -e "${RED}MongoDB restore skipped — tools unavailable${NC}"
  else
    MONGO_HOST="${MONGO_HOST:-localhost}"
    MONGO_PORT="${MONGO_PORT:-27017}"
    MONGO_USER="${MONGO_USER:-}"
    MONGO_PASSWORD="${MONGO_PASSWORD:-}"

    # Namespace remapping: default to same-name if no --mongo-ns-to given
    NS_FROM="${MONGO_NS_FROM:-${MANIFEST_MONGO_DB}}"
    NS_TO="${MONGO_NS_TO:-${MANIFEST_MONGO_DB}}"

    MONGO_ARGS=(
      --host "$MONGO_HOST"
      --port "$MONGO_PORT"
      --nsFrom "${NS_FROM}.*"
      --nsTo   "${NS_TO}.*"
      --gzip
      --archive="$MONGO_BACKUP_FILE"
    )
    [[ -n "$MONGO_USER"     ]] && MONGO_ARGS+=(--username "$MONGO_USER" --authenticationDatabase admin)
    [[ -n "$MONGO_PASSWORD" ]] && MONGO_ARGS+=(--password "$MONGO_PASSWORD")
    [[ "$DROP" == "true"    ]] && MONGO_ARGS+=(--drop)

    echo -e "${GREEN}Restoring MongoDB: $MANIFEST_MONGO_DB → $NS_TO on ${MONGO_HOST}:${MONGO_PORT}${NC}"
    if [[ "$DRY_RUN" == "false" ]]; then
      mongorestore "${MONGO_ARGS[@]}"
      echo -e "${GREEN}MongoDB restore complete${NC}"
    else
      echo "  [dry-run] mongorestore ${MONGO_ARGS[*]}"
    fi
  fi
fi

# ── PostgreSQL restore ─────────────────────────────────────────────────────────
if [[ "$RESTORE_POSTGRES" == "true" ]]; then
  PG_BACKUP_FILE="$BACKUP_DIR/postgres/${MANIFEST_PG_DB}.pgdump"

  if [[ ! -f "$PG_BACKUP_FILE" ]]; then
    echo -e "${YELLOW}PostgreSQL backup file not found: $PG_BACKUP_FILE — skipping${NC}"
  elif ! ensure_pg_client; then
    echo -e "${RED}PostgreSQL restore skipped — tools unavailable${NC}"
  else
    PG_HOST="${POSTGRES_DB_HOST:-localhost}"
    PG_PORT="${POSTGRES_DB_PORT:-5432}"
    PG_USER="${POSTGRES_USER:-reactory}"
    PG_TARGET="${PG_TARGET_DB:-$MANIFEST_PG_DB}"
    export PGPASSWORD="${POSTGRES_PASSWORD:-}"

    PG_RESTORE_ARGS=(
      --host="$PG_HOST"
      --port="$PG_PORT"
      --username="$PG_USER"
      --dbname="$PG_TARGET"
      --verbose
    )
    [[ "$DROP" == "true" ]] && PG_RESTORE_ARGS+=(--clean --if-exists)

    echo -e "${GREEN}Restoring PostgreSQL: $MANIFEST_PG_DB → $PG_TARGET on ${PG_HOST}:${PG_PORT}${NC}"
    if [[ "$DRY_RUN" == "false" ]]; then
      pg_restore "${PG_RESTORE_ARGS[@]}" "$PG_BACKUP_FILE"
      echo -e "${GREEN}PostgreSQL restore complete${NC}"
    else
      echo "  [dry-run] pg_restore ${PG_RESTORE_ARGS[*]} $PG_BACKUP_FILE"
    fi
    unset PGPASSWORD
  fi
fi

echo "================================================="
echo "  Restore finished"
echo "================================================="
