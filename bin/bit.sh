#!/bin/bash

# This script is a utility that will 
# execute the following steps:
# 1. Build the Reactory Server application
# 2. Export the image to a tar file
# 3. Terraform apply the infrastructure
# The script takes two optional arguments:
# 1. The configuration ID
REACTORY_CONFIG_ID=${1:-reactory}
# 2. The environment ID
REACTORY_ENV_ID=${2:-local}

# Build the Reactory Server application
./bin/build.sh $REACTORY_CONFIG_ID $REACTORY_ENV_ID

# Export the image to a tar file
./bin/podman-build.sh $REACTORY_CONFIG_ID $REACTORY_ENV_ID

# Build the Reactory Client application
cd $REACTORY_CLIENT
./bin/build.sh $REACTORY_CONFIG_ID $REACTORY_ENV_ID

# Export the image to a tar file
./bin/podman-build.sh $REACTORY_CONFIG_ID $REACTORY_ENV_ID

cd $REACTORY_SERVER
# Terraform apply the infrastructure
./bin/terraform.sh apply -auto-approve --reactory-config=$REACTORY_CONFIG_ID --reactory-env=$REACTORY_ENV_ID