#!/bin/bash
# backup mongodb
checkEnvVars(){
  echo "Checking environment variables"
  env_vars=("REACTORY_DATA" "REACTORY_SERVER")
  do_exit=0
  # Loop over each environment variable and check if it is set and points to a valid directory
  for var in ${env_vars[@]}; do
    if [[ -z "${!var}" ]]; then
      echo -e "$var is not set"
      do_exit=1
    elif [[ ! -d "${!var}" ]]; then
      echo -e "$var is not a valid directory"
      do_exit=1
    else
      echo -e "$var is set and points to a valid directory"
    fi
  done
  
  if [[ $do_exit -eq 1 ]]; then
    echo -e "Please set the environment variables listed above"
    exit 1
  fi
  
  echo "Checked Environment Variables"
}

checkEnvVars

DEFAULT_ROOT=$REACTORY_DATA

db=${1:-reactory}
env=${2:-production}
root=${3:-$DEFAULT_ROOT}
script_root=$(dirname $(readlink -f $0))
filename=$(date +"%Y%m%d%H%M%S%N")
if [ ! -d "$root/database/backup/$env" ]; then
  mkdir "$root/database/backup/$env"
fi
echo "file://$root/database/backup/$env/$db-$filename.agz"
mongodump --db $db --gzip --archive > "$root/database/backup/$env/$db-$filename.agz"
