#!/bin/bash
# backup mongodb
db=${1:-reactory}
env=${2:-production}
root=${3:-/var/reactory/data}
script_root=$(dirname $(readlink -f $0))
filename=$(date +"%Y%m%d%H%M%S%N")
if [ ! -d "$root/database/backup/$env" ]; then
  mkdir "$root/database/backup/$env"
fi
echo "file://$root/database/backup/$env/$db-$filename.agz"
mongodump --db $db --gzip --archive > "$root/database/backup/$env/$db-$filename.agz"
