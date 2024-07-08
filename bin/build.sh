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
source ./bin/shared/shell-utils.sh

check_env_vars

# Generate correct imports for the selected configuration
sh ./bin/generate.sh ${1:-reactory} ${2:-local}

# read package.json to get the version
BUILD_VERSION=$(node -p "require('./package.json').version")
NODE_PATH=$REACTORY_SERVEr/src
env_file=$REACTORY_SERVER/config/${1:-reactory}/.env.${2:-local}
BUILD_PATH=$REACTORY_SERVER/bin/server/${1:-reactory}

echo "Building Reactory Server $BUILD_VERSION for ${1:-reactory} ${2:-local} configuration"
# Clean the target path
echo "Cleaning $BUILD_PATH"
rm -rf $BUILD_PATH

echo "Compiling Reactory Server"
# Compile using npx with babel
NODE_PATH=./src env-cmd -f $env_file npx babel ./src --presets @babel/env --extensions ".js,.ts,.jsx,.tsx" --out-dir $BUILD_PATH
# Copy additional files while preserving directory structure

echo "Copying additional files"
rsync -av --filter='merge ./bin/build.rsync' ./src/ $BUILD_PATH

# Check if there is a pm2 configuration file
if [ -f "./config/${1:-reactory}/pm2.${2:-local}.config.js" ]; then
  echo "Copying pm2 configuration file"
  # Copy the pm2 configuration file to the build directory
  cp "./config/${1:-reactory}/pm2.${2:-local}.config.js" $BUILD_PATH
fi

echo "Built Reactory Server to $BUILD_PATH"