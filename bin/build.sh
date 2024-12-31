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
export REACTORY_IS_BUILDING='true'
source ./bin/shared/shell-utils.sh

check_env_vars

# Generate correct imports for the selected configuration
sh ./bin/generate.sh ${1:-reactory} ${2:-local}

# read package.json to get the version
DEFAULT_APPLICATION_ROOT=app
BUILD_VERSION=$(node -p "require('./package.json').version")
INCLUDE_ENV=true
NODE_PATH=$REACTORY_SERVER/src
CLEAN_NODE_MODULES=true
BUILD_OPTIONS=$REACTORY_SERVER/config/${1:-reactory}/.env.build.${2:-local}
env_file=$REACTORY_SERVER/config/${1:-reactory}/.env.${2:-local}
BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}
APP_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/${DEFAULT_APPLICATION_ROOT}
BIN_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/bin
CONFIG_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/config

# Check if the BUILD_OPTIONS file exists, if it does, source it
if [ -f $BUILD_OPTIONS ]; then
  source $BUILD_OPTIONS
fi

echo "Building Reactory Server $BUILD_VERSION for ${1:-reactory} ${2:-local} configuration"
if [ $CLEAN_NODE_MODULES = "true" ]; then
  echo "Cleaning node_modules"
  rm -rf $BUILD_PATH/node_modules
fi


# Clean the build directory
echo "Cleaning $BUILD_PATH"
rm -rf $BUILD_PATH/bin
rm -rf $BUILD_PATH/lib
rm -rf $BUILD_PATH/src
rm $BUILD_PATH/.env
rm $BUILD_PATH/package.json
rm $BUILD_PATH/yarn.lock
if [ -f $BUILD_PATH/pm2.config.js ]; then
  rm $BUILD_PATH/pm2.config.js
fi

# we leave other files and folders.

echo "Compiling Reactory Server"
# Compile using npx with babel
NODE_PATH=./src env-cmd -f $env_file npx babel ./src --presets @babel/env --extensions ".js,.ts,.jsx,.tsx" --out-dir $APP_BUILD_PATH
# Copy additional files while preserving directory structure

echo "Copying additional files"
rsync -av --filter='merge ./bin/build.app.rsync' ./src/ $APP_BUILD_PATH --quiet
rsync -av --filter='merge ./bin/build.bin.rsync' ./bin/ $BIN_BUILD_PATH --quiet
# rsync the lib/ directory
rsync -av --filter='merge ./bin/build.lib.rsync' ./lib/ $BUILD_PATH/lib --quiet

# Check if there is a pm2 configuration file
if [ -f "./config/${1:-reactory}/pm2.${2:-local}.config.js" ]; then
  echo "Copying pm2 configuration file"
  # Copy the pm2 configuration file to the build directory
  cp "./config/${1:-reactory}/pm2.${2:-local}.config.js" $BUILD_PATH/pm2.config.js
fi

# Copy package.json
echo "Copying package.json"
cp ./package.json $BUILD_PATH

# Copy package-lock.json
echo "Copying yarn.lock"
cp ./yarn.lock $BUILD_PATH

if [ $INCLUDE_ENV = "true" ] && [ -f $env_file ]; then
  # Copy .env file
  echo "Copying .env file"
  cp $env_file $BUILD_PATH/.env
  # update the APPLICATION_ROOT variable in the .env file
  # to match the DEFAULT_APPLICATION_ROOT value using sed
  # check if the env file contains the APPLICATION_ROOT variable
  # if it does, update it, if not, add it
  if ! grep -q "APPLICATION_ROOT" $BUILD_PATH/.env; then
    echo "APPLICATION_ROOT=${DEFAULT_APPLICATION_ROOT}" >> $BUILD_PATH/.env
  else
    sed -i "s/APPLICATION_ROOT=.*/APPLICATION_ROOT=${DEFAULT_APPLICATION_ROOT}/" $BUILD_PATH/.env
  fi
fi

# Create archive for deployment
echo "Creating archive for deployment"
cd $BUILD_PATH

tar -czf ../${1:-reactory}-server-${BUILD_VERSION}.tar.gz .

echo "🏆 Built Reactory Server to $BUILD_PATH"

export REACTORY_IS_BUILDING='false'