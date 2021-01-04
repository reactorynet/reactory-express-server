#!/bin/bash
# backup mongodb
dbFrom=${1:-reactory}
dbTo=${2:-reactory_copy}
filename=${3:-nofile.agz}

echo "Restoring from $filename to database $db"
mongorestore --verbose --nsFrom $dbFrom.* --nsTo $dbTo.* --gzip --archive=$filename
