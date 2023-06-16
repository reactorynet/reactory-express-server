#!/bin/bash

# Default values
DEFAULT_USER="reactory"
DEFAULT_PASSWORD="reactorycore"
DATABASE_NAME="reactory-local-reactory"

# Parse command-line arguments
while [[ $# -gt 0 ]]
do
    key="$1"
    case $key in
        --user)
            MONGO_USER="$2"
            shift
            shift
            ;;
        --pwd)
            PASSWORD="$2"
            shift
            shift
            ;;
        *)
            echo "Unknown argument: $1"
            exit 1
            ;;
    esac
done

# Set default values if arguments are not provided
MONGO_USER="${MONGO_USER:-$DEFAULT_USER}"
PASSWORD="${PASSWORD:-$DEFAULT_PASSWORD}"

# Generate MongoDB script
SCRIPT="use admin;\n\n"

# Check if user exists
SCRIPT+="var userExists = db.getUser(\"$MONGO_USER\");\n"
SCRIPT+="if (userExists) {\n"
SCRIPT+="  db.updateUser(\"$MONGO_USER\", { roles: [{ role: \"dbOwner\", db: \"$DATABASE_NAME\" }] });\n"
SCRIPT+="  print(\"User '$MONGO_USER' exists. Updated user permissions.\");\n"
SCRIPT+="} else {\n"
SCRIPT+="  db.createUser({ user: \"$MONGO_USER\", pwd: \"$PASSWORD\", roles: [{ role: \"dbOwner\", db: \"$DATABASE_NAME\" }] });\n"
SCRIPT+="  print(\"User '$MONGO_USER' created with database owner permissions.\");\n"
SCRIPT+="}\n"

# Execute MongoDB script
echo -e $SCRIPT | mongosh
