#!/bin/bash
# backup mongodb
db=${1:-reactory}
env=${2:-production}
root=${3:-/data/reactory}
script_root=$(dirname $(readlink -f $0))
filename=$(date +"%Y%m%d%H%M%S%N")
if [ ! -d "$root/database/backup/$env" ]; then
  mkdir "$root/database/backup/$env"
fi
echo "Backing up to $root/database/backup/$env/$db_backup_$filename.agz"
mongodump --db $db --gzip --archive > $root/database/backup/$env/$db_backup_$filename.agz
