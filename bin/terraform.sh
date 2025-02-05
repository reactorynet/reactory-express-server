#!/bin/bash

# Use terraform.sh to execute terraform for a specific environment and target
# usage: 
# bin/terraform.sh <command> --reactory-config=<config key> --reactory-env=<reactory key>

# check all the args and extract our config key and environment
REACTORY_CONFIG=reactory
REACTORY_ENV=local
REACTORY_K8_TARGET=minikube
TF_LOG=INFO
extract_options() {
  NEW_ARGS=()
  for arg in "$@"; do
    case $arg in
      --reactory-config=*)
        REACTORY_CONFIG="${arg#*=}"
        ;;
      --reactory-env=*)
        REACTORY_ENV="${arg#*=}"
        ;;
      --reactory-k8-target=*)
        REACTORY_K8_TARGET="${arg#*=}"
        ;;
      --log-level=*)
        TF_LOG="${arg#*=}"
        ;;
      *)
        NEW_ARGS+=("$arg")
        ;;
    esac
  done
}

extract_options "$@"

# Set the target folder where we will find the main.tf
TARGET_DIR=./config/${REACTORY_CONFIG:-reactory}/terraform/${REACTORY_K8_TARGET}
# resolve the file we will use to ingest our environment vars
# and if it exists we source the env file, if not we exit.
ENV_FILE=./config/${REACTORY_CONFIG:-reactory}/.env.${REACTORY_ENV:-local}
LOG_FILE_NAME=terraform-$(date +%Y%m%d%H%M%S).log

export TF_LOG_PATH=$TARGET_DIR/.logs/$LOG_FILE_NAME
export TF_LOG=$TF_LOG

# check if .logs directory exists, if not create it
if [ ! -d $TARGET_DIR/.logs ]; then
  mkdir -p $TARGET_DIR/.logs
fi

if [ -f $ENV_FILE ]; then
  source $ENV_FILE
  echo "🛠️ Loaded Environment $ENV_FILE"
  echo $MINIKUBE_HOME
else
  echo "Environment file $ENV_FILE not found, exiting"
  exit 0
fi

if [ -f $TARGET_DIR/main.tf ]; then
  if [ -f $TARGET_DIR/tfvars.sh ]; then
    source $TARGET_DIR/tfvars.sh
  fi  
else
  echo "Target environment / main.tf not $TARGET_DIR/main.tf not found, please ensure you have specified a valid configuration and target."
  exit 0;
fi

if [ -f $TARGET_DIR/beforerun.sh ]; then
echo "Running pre-requisites script"
  source $TARGET_DIR/beforerun.sh
fi

# Pass the new arguments to terraform
terraform -chdir=$TARGET_DIR "${NEW_ARGS[@]}"

if [ -f $TARGET_DIR/afterrun.sh ]; then
  echo "Running cleanup script"
  source $TARGET_DIR/afterrun.sh
fi