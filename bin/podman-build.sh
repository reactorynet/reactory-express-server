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
IMAGE_ORG=reactory
IMAGE_TAG=$IMAGE_ORG/${1:-reactory}-express-server:$BUILD_VERSION
BUILD_OPTIONS=$REACTORY_SERVER/config/${1:-reactory}/.env.build.${2:-local}
TARFILE="./build/server/${1:-reactory}/${2:-local}/express-server-image.tar"

# Check if the BUILD_OPTIONS file exists, if it does, source it
if [ -f $BUILD_OPTIONS ]; then
  source $BUILD_OPTIONS
fi

echo "💿 Building Image $IMAGE_TAG"
podman build -t $IMAGE_TAG -f ./config/${1:-reactory}/${3:-Dockerfile} .

# Export the image from podman to a tar file
echo "📦 Exporting Image $IMAGE_TAG to $TARFILE"

# Check if the TARFILE exists, if it does, remove it
if [ -f $TARFILE ]; then
  rm $TARFILE
fi

podman save -o $TARFILE $IMAGE_TAG

# check if image exported successfully
if [ $? -ne 0 ]; then
  echo "❌ Error exporting image $IMAGE_TAG to $TARFILE"
  exit 1
fi

echo "🚀 Image $IMAGE_TAG exported to $TARFILE"

exit 0