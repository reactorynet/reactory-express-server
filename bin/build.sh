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

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq could not be found, please install it to proceed"
  echo "On Ubuntu: sudo apt-get install jq"
  echo "On macOS: brew install jq"
  exit 1
fi

# Generate correct imports for the selected configuration
sh ./bin/generate.sh ${1:-reactory} ${2:-local}

# read package.json to get the version
WORKING_FOLDER=$(pwd)
DEFAULT_APPLICATION_ROOT=app
BUILD_VERSION=$(node -p "require('./package.json').version")
INCLUDE_ENV=true
NODE_PATH=$REACTORY_SERVER/src
CLEAN_NODE_MODULES=true
BUILD_OPTIONS=$REACTORY_SERVER/config/${1:-reactory}/.env.build.${2:-local}
ENV_FILE=$REACTORY_SERVER/config/${1:-reactory}/.env.${2:-local}
BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}
APP_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/${DEFAULT_APPLICATION_ROOT}
BIN_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/bin
CONFIG_BUILD_PATH=$REACTORY_SERVER/build/server/${1:-reactory}/config
# Source the ENV_FILE
if [ -f $ENV_FILE ]; then
  source $ENV_FILE
else
  echo "Environment file $ENV_FILE not found, exiting"
  exit -1;
fi

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
echo "♻️ Cleaning $BUILD_PATH"
rm -rf $BUILD_PATH/bin
rm -rf $BUILD_PATH/lib
rm -rf $BUILD_PATH/src
rm -rf $BUILD_PATH/data
rm $BUILD_PATH/.env
rm $BUILD_PATH/package.json
rm $BUILD_PATH/yarn.lock
if [ -f $BUILD_PATH/pm2.config.js ]; then
  rm $BUILD_PATH/pm2.config.js
fi

echo "⬇️ Compiling Reactory Server"
# Compile using npx with babel
NODE_PATH=./src env-cmd -f $ENV_FILE npx babel ./src --presets @babel/env --extensions ".js,.ts,.jsx,.tsx" --out-dir $APP_BUILD_PATH
# Copy additional files while preserving directory structure


echo "🔁 Synchhronizing additional files [app, bin, lib]"
rsync -av --filter='merge ./bin/build.app.rsync' ./src/ $APP_BUILD_PATH --quiet
rsync -av --filter='merge ./bin/build.bin.rsync' ./bin/ $BIN_BUILD_PATH --quiet
# rsync the lib/ directory
rsync -av --filter='merge ./bin/build.lib.rsync' ./lib/ $BUILD_PATH/lib --quiet

DATA_RSYNC_INCLUDE=$REACTORY_SERVER/src/config/${1:-reactory}/build.data.rsync_inc.${2:-local}

if [ $PACKAGE_DATA_FOLDER = "true" ]; then
  if [ ! -f $DATA_RSYNC_INCLUDE ]; then  
    echo "🔁 Synchronising Reactory Data [build.data.rsync_inc]"
    rsync -av --filter='dir-merge ./bin/build.data.rsync' $REACTORY_DATA $BUILD_PATH/data --quiet
  else
    echo "🔁 Synchronising Reactory Data [$DATA_RSYNC_INCLUDE]"
    rsync -av --filter="dir-merge ./bin/build.data.rsync" --include-from="$DATA_RSYNC_INCLUDE" $REACTORY_DATA $BUILD_PATH/data --quiet
  fi
fi

# read the MODULES_ENABLED variable and only copy 
# the modules we need. We will first just copy everything using
# the rsync definitions and then rm folder that we don't
# require afterwards
MODULES_FILE=$REACTORY_SERVER/src/modules/$MODULES_ENABLED.json

if [ -f $MODULES_FILE ]; then
  echo "Generating temporary rsync filter file for modules"
  TEMP_RSYNC_FILE=./bin/build.modules.rsync
  node ./bin/utils/build/prep-module-rsync.js $MODULES_FILE $TEMP_RSYNC_FILE
  
  echo "Copying modules using rsync"
  rsync -av --filter='merge ./bin/build.modules.rsync' $APP_BUILD_PATH/modules/ $APP_BUILD_PATH/modules_temp/ --quiet
  # delete the files in modules path
  rm -rf $APP_BUILD_PATH/modules/
  # copy back the modules.
  mv $APP_BUILD_PATH/modules_temp $APP_BUILD_PATH/modules
else
  echo "Modules file $MODULES_FILE not found, skipping module copy"
fi


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

if [ $INCLUDE_ENV = "true" ] && [ -f $ENV_FILE ]; then
  # Copy .env file
  echo "Copying .env file"
  cp $ENV_FILE $BUILD_PATH/.env
  # update the APPLICATION_ROOT variable in the .env file
  # to match the DEFAULT_APPLICATION_ROOT value using sed
  # check if the env file contains the APPLICATION_ROOT variable
  # if it does, update it, if not, add it
  if ! grep -q "APPLICATION_ROOT" $BUILD_PATH/.env; then
    echo "APPLICATION_ROOT=${DEFAULT_APPLICATION_ROOT}" >> $BUILD_PATH/.env
  else
    cd $BUILD_PATH
    NEW_ENV=$(sed s/APPLICATION_ROOT=.*/APPLICATION_ROOT=${DEFAULT_APPLICATION_ROOT}/ .env)
    echo "$NEW_ENV" > .env
    NEW_ENV=$(sed s/NODE_ENV=.*/NODE_ENV=${DEFAULT_NODE_ENV:-production}/ .env)
    echo "$NEW_ENV" > .env
    cd $WORKING_FOLDER
  fi
fi

# Create archive for deployment
echo "Creating archive for deployment"
cd $BUILD_PATH

tar -czf ../${1:-reactory}-server-${BUILD_VERSION}.tar.gz .

echo "🏆 Built Reactory Server to $BUILD_PATH"

export REACTORY_IS_BUILDING='false'