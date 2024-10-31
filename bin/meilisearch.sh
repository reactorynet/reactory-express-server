#!/bin/bash
#$0 - The name of the Bash script.
#$1 - $9 - The first 9 arguments to the Bash script. (As mentioned above.)
#$# - How many arguments were passed to the Bash script.
#$@ - All the arguments supplied to the Bash script.
#$? - The exit status of the most recently run process.
#$$ - The process ID of the current script.
#$USER - The username of the user running the script.
#$HOSTNAME - The hostname of the machine the script is running on.
#$SECONDS - The number of seconds since the script was started.
#$RANDOM - Returns a different random number each time is it referred to.
#$LINENO - Returns the current line number in the Bash script.
echo "Starting MeiliSearch"  

# get the master key from the command arguments
MEILISEARCH_MASTER_KEY=$1

# use the REACTORY_DATA/search directory to start MeiliSearch
if [[ ! -d "${REACTORY_DATA}/search" ]]; then
  echo "Creating search directory"
  mkdir -p ${REACTORY_DATA}/search
fi

cd ${REACTORY_DATA}/search;

meilisearch --db-path ${REACTORY_DATA}/search --master-key ${MEILISEARCH_MASTER_KEY}

echo "Started MeiliSearch"