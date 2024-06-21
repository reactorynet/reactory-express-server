#!/bin/bash

# Default values
CONFIG_NAME="reactory"
CONFIG_ENV="local"
WATCH_MODE=false

# Loop through the arguments
for arg in "$@"; do
  case $arg in
      --watch) WATCH_MODE=true ;;
      --cname=*) CONFIG_NAME="${arg#*=}" ;;
      --cenv=*) CONFIG_ENV="${arg#*=}" ;;
      --debug) DEBUG=true ;;
      *) ;;
  esac
done

# Set the environment file based on the selected parameters
ENV_FILE="./config/$CONFIG_NAME/.env.$CONFIG_ENV"

# Check if environment file exists
if [ ! -f ${ENV_FILE} ]; then
  echo "Error: ${ENV_FILE} does not exist."
  exit 1
fi

# Verify that node_modules exist before running
if [ ! -d "./node_modules" ]; then
  echo "Error: node_modules directory not found. Run 'npm install'."
  exit 1
fi

# Run the script
SCRIPT_PATH=./src/reactory/cli/index.ts
if [ ! -f ${SCRIPT_PATH} ]; then
  echo "Error: ${SCRIPT_PATH} does not exist."
  exit 1
fi

# Check if debug flag is set
if [ "$DEBUG" = true ]; then
  NODE_DEBUG_OPTIONS="--inspect"
fi

# Check if watch mode is enabled
if [ "$WATCH_MODE" = true ]; then
  NODE_PATH=./src env-cmd -f ${ENV_FILE} npx nodemon -e js,ts,tsx,graphql --exec npx babel-node ${SCRIPT_PATH} \
    ${NODE_DEBUG_OPTIONS} \
    --presets=@babel/env,@babel/preset-typescript,@babel/preset-flow \
    --extensions=".js,.ts" \
    --max_old_space_size=2000000 \
    --config_name=${CONFIG_NAME} \
    --config_env=${CONFIG_ENV} \
    "$@"
else
  NODE_PATH=./src env-cmd -f ${ENV_FILE} npx babel-node ${SCRIPT_PATH} \
    ${NODE_DEBUG_OPTIONS} \
    --presets=@babel/env,@babel/preset-typescript,@babel/preset-flow \
    --extensions=".js,.ts" \
    --max_old_space_size=2000000 \
    --config_name=${CONFIG_NAME} \
    --config_env=${CONFIG_ENV} \
    "$@"
fi

# Check the exit status of the script
if [ $? -eq 0 ]; then
  echo "Script completed successfully"
else
  echo "Error: Script did not complete successfully"
  exit 1
fi