#!/bin/bash
# backup mongodb
env=${1:-production}
root=${2:-/data/reactory}
script_root=$(dirname $(readlink -f $0))
filename=$(date +"%Y%m%d%H%M%S%N")
if [ ! -d "$root/database/backup/$env" ]; then
  mkdir "$root/database/backup/$env"
fi
echo "Backing up to reactory_$filename"
mongodump --db reactory --archive=${dataroot}/database/backup/$env/reactory_$filename.gz --gzip
