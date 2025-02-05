#!/bin/bash

# This script is used to manage dependencies for the Reactory project.
# It allows setting the configuration name and environment, and optionally enables watch mode.
# The script checks for the existence of the environment file, copies the yarn.lock file if present,
# prompts the user to reinstall dependencies if the node_modules directory exists, installs dependencies,
# and then copies the yarn.lock file back to the configuration directory.

# Default values
CONFIG_NAME="reactory"
CONFIG_ENV="local"
WATCH_MODE=false

KWARGS=

# Loop through the arguments and set the variables
for arg in "$@"; do
  case $arg in
      --watch) WATCH_MODE=true ;;
      --cname=*) CONFIG_NAME="${arg#*=}" ;;
      --cenv=*) CONFIG_ENV="${arg#*=}" ;;
      --debug) DEBUG=true ;;
      *) KWARGS="$KWARGS $arg" ;;
  esac
done

# Set the environment file based on the selected parameters
ENV_FILE="./config/$CONFIG_NAME/.env.$CONFIG_ENV"

# Check if environment file exists
if [ ! -f ${ENV_FILE} ]; then
  echo "Error: ${ENV_FILE} does not exist."
  exit 1
fi

# check if there is a yarn.lock file in the configurations directory
if [ -f "./config/$CONFIG_NAME/yarn.lock" ]; then
  # copy the file to the root directory
  cp "./config/$CONFIG_NAME/yarn.lock" "./yarn.lock"
fi

# if node_modules directory exists, prompt the user for input
if [ -d "./node_modules" ]; then
  echo "node_modules directory already exists. Do you want to reinstall the dependencies? (y/n)"
  read REINSTALL
  if [ "$REINSTALL" = "y" ]; then
    rm -rf ./node_modules
  fi
fi
# install the dependencies
yarn install

# copy the yarn.lock file back to the configurations directory
if [ -f "./yarn.lock" ]; then
  cp "./yarn.lock" "./config/$CONFIG_NAME/yarn.lock"
fi