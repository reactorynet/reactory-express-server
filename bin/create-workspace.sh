#!/bin/bash
# Generates a VS Code .code-workspace file for the given config name.
# Usage: bin/create-workspace.sh [config_name] [--out /path/to/output.code-workspace]
#
# Example:
#   bin/create-workspace.sh reactory
#   bin/create-workspace.sh my-config --out ~/Desktop/my.code-workspace
NODE_PATH=./src npx babel-node ./bin/utils/create-workspace.ts --presets=@babel/env,@babel/preset-typescript,@babel/preset-flow --extensions=".js,.ts" --max_old_space_size=2000000 "$@"
