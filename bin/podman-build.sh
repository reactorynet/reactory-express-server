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

# Compose script is used to start the podman services with 
# the given configuration name and environment. The script will check
# environment variables and the existence of the podman-compose file
source ./bin/shared/shell-utils.sh
check_env_vars
echo "📓 Loading Environment ./config/${1:-reactory}/${2:-local} "
BUILD_VERSION=$(node -p "require('./package.json').version")
TAG=reactory/${1:-reactory}-${2:-local}:$BUILD_VERSION
echo "🛠️ Building Image $TAG"
podman build -t $TAG -f ./config/${1:-reactory}/${3:-Dockerfile} .
