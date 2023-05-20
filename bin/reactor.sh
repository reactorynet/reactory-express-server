#!/bin/bash

# Set variables for better organization
CONFIG_NAME=${1:-reactory}
CONFIG_ENV=${2:-local}
ENV_FILE=./config/${CONFIG_NAME}/.env.${CONFIG_ENV}

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

NODE_PATH=./src env-cmd -f ${ENV_FILE} npx babel-node ./bin/utils/chatgpt/chat.ts \
  --presets=@babel/env,@babel/preset-typescript,@babel/preset-flow \
  --extensions=".js,.ts" \
  --max_old_space_size=2000000 \
  --config_name=${CONFIG_NAME} \
  --config_env=${CONFIG_ENV}

# Check the exit status of the script
if [ $? -eq 0 ]; then
  echo "Script completed successfully"
else
  echo "Error: Script did not complete successfully"
  exit 1
fi