#!/bin/bash
# backup mongodb
env=${1:-production}
root=${2:-/data/reactory}
script_root=$(dirname $(readlink -f $0))
filename=$(date +"%Y%m%d%H%M%S%N")
if [ ! -d "$root/database/backup/$env" ]; then
  mkdir "$root/database/backup/$env"
fi
echo "Backing up to $root/database/backup/$env/reactory_db_backup_$filename.gz"
mongodump --db reactory --archive=$root/database/backup/$env/reactory_db_backup_$filename.gz --gzip
