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
export REACTORY_CONFIG_ID=${1:-reactory}
export REACTORY_ENV_ID=${2:-local}
source ./bin/shared/shell-utils.sh
check_env_vars
check_node
# read package.json to get the version
BUILD_VERSION=$(node -p "require('./package.json').version")
export REACTORY_BUILD_KEY="${1:-reactory}.${2:-local}@${BUILD_VERSION}"

WORKING_FOLDER=$(pwd)
DEFAULT_APPLICATION_ROOT=app
INCLUDE_ENV=true
NODE_PATH=$REACTORY_SERVER/src
CLEAN_NODE_MODULES=true
BUILD_OPTIONS=$REACTORY_SERVER/config/$REACTORY_CONFIG_ID/.env.build.$REACTORY_ENV_ID
export ENV_FILE=$REACTORY_SERVER/config/$REACTORY_CONFIG_ID/.env.$REACTORY_ENV_ID
BUILD_PATH=$REACTORY_SERVER/build/server/$REACTORY_CONFIG_ID/$REACTORY_ENV_ID
APP_BUILD_PATH=$BUILD_PATH/${DEFAULT_APPLICATION_ROOT}
BIN_BUILD_PATH=$BUILD_PATH/bin
CONFIG_BUILD_PATH=$BUILD_PATH/config
BUILD_LOGS=$BUILD_PATH/logs
# Source the ENV_FILE
if [ -f $ENV_FILE ]; then
  source $ENV_FILE
else
  echo "Environment file $ENV_FILE not found, exiting"
  exit -1;
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq could not be found, please install it to proceed"
  echo "On Ubuntu: sudo apt-get install jq"
  echo "On macOS: brew install jq"
  exit 1
fi

# Generate correct imports for the selected configuration
sh ./bin/generate.sh $REACTORY_CONFIG_ID $REACTORY_ENV_ID


# Check if the BUILD_OPTIONS file exists, if it does, source it
if [ -f $BUILD_OPTIONS ]; then
  source $BUILD_OPTIONS
fi

echo "Building Reactory Server $BUILD_VERSION for $REACTORY_CONFIG_ID $REACTORY_ENV_ID configuration"
# Clean the build directory
echo "♻️ Cleaning $BUILD_PATH"
rm -rf $BUILD_PATH

# read the MODULES_ENABLED variable and only copy 
# the modules we need. We will first just copy everything using
# the rsync definitions and then rm folder that we don't
# require afterwards
MODULES_FILE=$REACTORY_SERVER/src/modules/$MODULES_ENABLED.json

if [ -f $MODULES_FILE ]; then
  jq -r '.[] | .id' $MODULES_FILE | while read module; do
    if [ -f $REACTORY_SERVER/src/modules/$module/build/pre-build.sh ]; then
      echo "Running pre-build tasks for module $module"
      sh $REACTORY_SERVER/src/modules/$module/build/pre-build.sh
      if [ $? -ne 0 ]; then
        echo "❌ Error: pre-build script failed for module $module"
        exit 1
      fi
    fi
  done
fi

echo "⬇️ Compiling Reactory Server"
# Compile using npx with babel
# First we compile our helpers in the bin/ directory
NODE_PATH=./src npx babel ./bin --presets=@babel/env,@babel/preset-typescript,@babel/preset-flow --extensions ".ts" --out-dir $BUILD_PATH/bin
# Compile the app/ directory
NODE_PATH=./src env-cmd -f $ENV_FILE npx babel ./src --presets @babel/env --extensions ".ts,.tsx" --ignore "**/node_modules/**" --out-dir $APP_BUILD_PATH
# Copy additional files while preserving directory structure
echo "🔁 Synchronizing additional files [app, bin, lib]"
rsync -av --filter='merge ./bin/build.app.rsync' ./src/ $APP_BUILD_PATH --quiet
rsync -av --filter='merge ./bin/build.bin.rsync' ./bin/ $BIN_BUILD_PATH --quiet
# rsync the lib/ directory as it may contain additional libraries that are not available via
# npm or yarn.
rsync -av --filter='merge ./bin/build.lib.rsync' ./lib/ $BUILD_PATH/lib --quiet

DATA_RSYNC_INCLUDE=$REACTORY_SERVER/src/config/$REACTORY_CONFIG_ID/build.data.rsync_inc.$REACTORY_ENV_ID

if [ "${PACKAGE_DATA_FOLDER:-false}" = "true" ]; then
  if [ ! -f $DATA_RSYNC_INCLUDE ]; then  
    echo "🔁 Synchronising Reactory Data [build.data.rsync_inc]"
    rsync -av --filter='dir-merge ./bin/build.data.rsync' $REACTORY_DATA/ $BUILD_PATH/data --quiet
  else
    echo "🔁 Synchronising Reactory Data [$DATA_RSYNC_INCLUDE]"
    rsync -av --filter="dir-merge ./bin/build.data.rsync" --include-from="$DATA_RSYNC_INCLUDE" $REACTORY_DATA/ $BUILD_PATH/data --quiet
  fi
fi

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

  # use jq to read the modules file and for each module we run a rsync command if 
  # there is a build.rsync file in the module directory
  echo "Copying module files"
  # Read module IDs from the JSON file
  jq -r '.[] | .id' $MODULES_FILE | while read module; do
    if [ -f $REACTORY_SERVER/src/modules/$module/build/post-build.sh ]; then
      echo "Running post-build tasks for module $module"
      sh $REACTORY_SERVER/src/modules/$module/build/post-build.sh    
    fi

    if [ -f $REACTORY_SERVER/src/modules/$module/build/build.rsync ]; then
      echo "Copying files for module $module"
      rsync -rah --filter="merge $REACTORY_SERVER/src/modules/$module/build/build.rsync" $REACTORY_SERVER/src/modules/$module/ $APP_BUILD_PATH/modules/$module --quiet
    else
      echo "No rsync file found for module $module, skipping"
    fi
  done

  # Pre-compile form modules and generate rsync filter
  echo "🧩 Pre-compiling form widget modules for enabled modules"
  TEMP_RUNTIME_PLUGINS_RSYNC=./bin/build.runtime-plugins.rsync
  NODE_PATH=./src env-cmd -f $ENV_FILE npx babel-node --presets @babel/env,@babel/preset-typescript --extensions ".ts,.tsx,.js" --max_old_space_size=2000000 ./bin/utils/build/compile-form-modules.ts --output=$TEMP_RUNTIME_PLUGINS_RSYNC
  if [ $? -ne 0 ]; then
    echo "❌ Error: Form module compilation failed"
    exit 1
  fi

  DATA_SOURCE_PLUGINS=""
  if [ -n "$REACTORY_DATA" ] && [ -d "$REACTORY_DATA/plugins/__runtime__/lib" ]; then
    DATA_SOURCE_PLUGINS="$REACTORY_DATA/plugins/__runtime__/lib"
  elif [ -n "$APP_DATA_ROOT" ] && [ -d "$APP_DATA_ROOT/plugins/__runtime__/lib" ]; then
    DATA_SOURCE_PLUGINS="$APP_DATA_ROOT/plugins/__runtime__/lib"
  fi

  if [ -n "$DATA_SOURCE_PLUGINS" ] && [ -d "$DATA_SOURCE_PLUGINS" ]; then
    echo "🔁 Synchronizing compiled __runtime__ plugins to build destination"
    mkdir -p $BUILD_PATH/data/plugins/__runtime__/lib
    rsync -av --filter="merge $TEMP_RUNTIME_PLUGINS_RSYNC" $DATA_SOURCE_PLUGINS/ $BUILD_PATH/data/plugins/__runtime__/lib/ --quiet
    echo "🔗 Ensuring .js symlinks for runtime plugins"
    (cd "$BUILD_PATH/data/plugins/__runtime__/lib" && for f in *.min.js; do [ -f "$f" ] && ln -sf "$f" "${f%.min.js}.js"; done)
  fi

  PLUGINS_ROOT=""
  if [ -n "$REACTORY_DATA" ] && [ -d "$REACTORY_DATA/plugins" ]; then
    PLUGINS_ROOT="$REACTORY_DATA/plugins"
  elif [ -n "$APP_DATA_ROOT" ] && [ -d "$APP_DATA_ROOT/plugins" ]; then
    PLUGINS_ROOT="$APP_DATA_ROOT/plugins"
  fi

  if [ -n "$PLUGINS_ROOT" ] && [ -d "$PLUGINS_ROOT/reactory-client-core/lib" ]; then
    echo "🔁 Synchronizing reactory-client-core plugin to build destination"
    mkdir -p $BUILD_PATH/data/plugins/reactory-client-core/lib
    rsync -av $PLUGINS_ROOT/reactory-client-core/lib/ $BUILD_PATH/data/plugins/reactory-client-core/lib/ --quiet
  fi

  if [ -n "$PLUGINS_ROOT" ]; then
    [ -f "$PLUGINS_ROOT/installed.json" ] && cp "$PLUGINS_ROOT/installed.json" $BUILD_PATH/data/plugins/
    [ -f "$PLUGINS_ROOT/available.json" ] && cp "$PLUGINS_ROOT/available.json" $BUILD_PATH/data/plugins/
  fi

  THEMES_ROOT=""
  if [ -n "$REACTORY_DATA" ] && [ -d "$REACTORY_DATA/themes" ]; then
    THEMES_ROOT="$REACTORY_DATA/themes"
  elif [ -n "$APP_DATA_ROOT" ] && [ -d "$APP_DATA_ROOT/themes" ]; then
    THEMES_ROOT="$APP_DATA_ROOT/themes"
  fi

  if [ -n "$THEMES_ROOT" ] && [ -d "$THEMES_ROOT" ]; then
    echo "🔁 Synchronizing themes to build destination"
    mkdir -p $BUILD_PATH/data/themes
    rsync -av $THEMES_ROOT/ $BUILD_PATH/data/themes/ --quiet
  fi

  DATA_ROOT=""
  if [ -n "$REACTORY_DATA" ] && [ -d "$REACTORY_DATA" ]; then
    DATA_ROOT="$REACTORY_DATA"
  elif [ -n "$APP_DATA_ROOT" ] && [ -d "$APP_DATA_ROOT" ]; then
    DATA_ROOT="$APP_DATA_ROOT"
  fi

  if [ -n "$DATA_ROOT" ]; then
    # Synchronize content (documentation, articles, static pages)
    if [ -d "$DATA_ROOT/content" ]; then
      echo "🔁 Synchronizing content to build destination"
      mkdir -p $BUILD_PATH/data/content
      rsync -av $DATA_ROOT/content/ $BUILD_PATH/data/content/ --quiet
    fi

    # Synchronize wordnet dictionary database
    if [ -d "$DATA_ROOT/wordnet" ]; then
      echo "🔁 Synchronizing wordnet dictionary to build destination"
      mkdir -p $BUILD_PATH/data/wordnet
      rsync -av $DATA_ROOT/wordnet/ $BUILD_PATH/data/wordnet/ --quiet
    fi

    # Synchronize profiles (default and reactory system profiles)
    if [ -d "$DATA_ROOT/profiles/default" ]; then
      echo "🔁 Synchronizing profiles/default to build destination"
      mkdir -p $BUILD_PATH/data/profiles/default
      rsync -av $DATA_ROOT/profiles/default/ $BUILD_PATH/data/profiles/default/ --quiet
    fi
    if [ -d "$DATA_ROOT/profiles/reactory" ]; then
      echo "🔁 Synchronizing profiles/reactory to build destination"
      mkdir -p $BUILD_PATH/data/profiles/reactory
      rsync -av $DATA_ROOT/profiles/reactory/ $BUILD_PATH/data/profiles/reactory/ --quiet
    fi

    # Synchronize system fonts if present
    if [ -d "$DATA_ROOT/fonts" ]; then
      echo "🔁 Synchronizing fonts to build destination"
      mkdir -p $BUILD_PATH/data/fonts
      rsync -av $DATA_ROOT/fonts/ $BUILD_PATH/data/fonts/ --quiet
    fi

    # Synchronize base i18n directory
    if [ -d "$DATA_ROOT/i18n" ]; then
      echo "🔁 Synchronizing base i18n directory to build destination"
      mkdir -p $BUILD_PATH/data/i18n
      rsync -av $DATA_ROOT/i18n/ $BUILD_PATH/data/i18n/ --quiet
    fi
  fi

  # Package i18n translation files for enabled namespaces
  echo "🌐 Packaging i18n translation files for enabled namespaces [${I18N_NS:-reactory}]"
  NODE_PATH=./src env-cmd -f $ENV_FILE npx babel-node --presets @babel/env,@babel/preset-typescript --extensions ".ts,.tsx,.js" ./bin/utils/build/package-translations.ts --output=$BUILD_PATH/data/i18n
  if [ $? -ne 0 ]; then
    echo "❌ Error: Translation packaging failed"
    exit 1
  fi
else
  echo "Modules file $MODULES_FILE not found, skipping module copy"
fi

# Check if there is a pm2 configuration file
if [ -f "./config/$REACTORY_CONFIG_ID/pm2.$REACTORY_ENV_ID.config.js" ]; then
  echo "Copying pm2 configuration file"
  # Copy the pm2 configuration file to the build directory
  cp "./config/$REACTORY_CONFIG_ID/pm2.$REACTORY_ENV_ID.config.js" $BUILD_PATH/pm2.config.js
fi

# Copy .yarnrc.yml
# Without this, Yarn 4 has no nodeLinker config in the build output and
# defaults to Plug'n'Play — it generates .pnp.cjs instead of a conventional
# node_modules tree, so the compiled server (a plain `node index.js`/fork(),
# no PnP loader hooked in) can't resolve ANY dependency at runtime.
if [ -f ./.yarnrc.yml ]; then
  echo "Copying .yarnrc.yml"
  cp ./.yarnrc.yml $BUILD_PATH
fi

# Copy package.json
echo "Copying package.json"
cp ./package.json $BUILD_PATH
# Rewrite "workspaces" globs from src/modules/* to app/modules/*, matching
# where the compiled modules actually land in this build output. Without
# this, `yarn workspaces focus` (used when building the container image)
# resolves zero workspace members here and silently drops their
# dependencies — e.g. reactory-telemetry's @opentelemetry/* packages.
node -e "
  const fs = require('fs');
  const path = '$BUILD_PATH/package.json';
  const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
  if (Array.isArray(pkg.workspaces)) {
    pkg.workspaces = pkg.workspaces.map((w) => w.replace(/^src\//, 'app/'));
  }
  fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
"

# Copy package-lock.json
echo "Copying yarn.lock"
cp ./yarn.lock $BUILD_PATH
# yarn.lock's workspace locators are keyed to the source path (e.g.
# "reactory-telemetry@workspace:src/modules/reactory-telemetry"). Rewrite
# them to app/modules/* to match the package.json rewrite above — otherwise
# the lockfile entry for every module workspace no longer matches its
# on-disk location, and yarn silently treats those modules' dependencies as
# unresolved instead of installing them.
sed -i.bak 's#@workspace:src/modules/#@workspace:app/modules/#g' $BUILD_PATH/yarn.lock && rm -f $BUILD_PATH/yarn.lock.bak

# Copy jsconfig.json
echo "Copying jsconfig.json"
cp ./jsconfig.json $BUILD_PATH
# update the target jsconfig.json file to include the correct paths
# for the modules and the application root

cd $BUILD_PATH
sed 's/src/app/g' jsconfig.json > jsconfig_temp.json && mv jsconfig_temp.json jsconfig.json
cd $WORKING_FOLDER

if [ "${INCLUDE_ENV:-false}" = "true" ] && [ -f "$ENV_FILE" ]; then
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
if [ "${INCLUDE_DATA_WITH_IMAGE:-true}" = "true" ]; then
  echo "Including data folder in archive"
  tar -czf ../$REACTORY_CONFIG_ID-server-${REACTORY_ENV_ID}-${BUILD_VERSION}.tar.gz .
else
  echo "Excluding data folder from archive"
  if [ -d $BUILD_PATH/data ]; then    
    mv $BUILD_PATH/data /tmp
  fi
  tar -czf ../$REACTORY_CONFIG_ID-server-${REACTORY_ENV_ID}-${BUILD_VERSION}.tar.gz .  
  if [ -d /tmp/data ]; then
    mv /tmp/data $BUILD_PATH
  fi
fi

echo "🏆 Built Reactory Server to $BUILD_PATH"

export REACTORY_IS_BUILDING='false'
