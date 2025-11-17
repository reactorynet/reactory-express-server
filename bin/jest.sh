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

source ./bin/shared/shell-utils.sh

# Show usage information
show_usage() {
  echo "🧪 Reactory Jest Test Runner"
  echo ""
  echo "Usage: $0 [client] [environment] [file-pattern] [options...]"
  echo ""
  echo "Parameters:"
  echo "  client       Client configuration (default: reactory)"
  echo "  environment  Environment (default: local)"
  echo "  file-pattern Test file pattern (default: **/**/*.spec.*s)"
  echo "  options      Additional Jest options"
  echo ""
  echo "Examples:"
  echo "  $0                                    # Run all tests with defaults"
  echo "  $0 reactory local YamlWorkflow        # Run tests matching 'YamlWorkflow'"
  echo "  $0 reactory local 'YamlWorkflow' --testNamePattern='should validate step types'"
  echo "  $0 reactory local 'YamlWorkflow' -t 'step types'"
  echo "  $0 reactory local '**/*.test.ts'      # Run all .test.ts files"
  echo "  $0 reactory local YamlWorkflow --verbose --no-coverage"
  echo ""
  echo "Useful Jest Options:"
  echo "  --testNamePattern=PATTERN  or  -t PATTERN    Run tests matching pattern"
  echo "  --verbose                                    Verbose output"
  echo "  --watch                                      Watch mode"
  echo "  --coverage                                   Generate coverage report"
  echo "  --no-coverage                               Skip coverage"
  echo "  --updateSnapshot          or  -u            Update snapshots"
  echo "  --detectOpenHandles                         Detect open handles"
  echo "  --forceExit                                 Force exit"
  echo ""
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
  show_usage
  exit 0
fi


# Check if env-cmd is installed
if package_exists "env-cmd"; then
  echo "🛠️  env-cmd is installed"
else
  if has_command "env-cmd"; then
    echo "🛠️  env-cmd is installed - globally"
  else
    echo "🛠️  env-cmd is not installed"
    echo "🛠️  Installing env-cmd"
    npm i -g env-cmd
  fi
fi


if package_exists "jest"; then
  echo "🛠️  jest is installed locally"
else
  echo "🛠️  jest is not installed"
  echo "🛠️  Installing depedencies"
  npm i
fi

# check environment variables
check_env_vars

# Extract parameters
CLIENT=${1:-reactory}
ENVIRONMENT=${2:-local}
FILE_PATTERN=${3:-**/**/*.spec.*s}

echo "🛠️ Loading Environment ./config/${CLIENT}/${ENVIRONMENT}"
echo "🧪 File Pattern: ${FILE_PATTERN}"
echo "🔧 Additional Args: ${@:4}"

# Build Jest command
JEST_CMD="NODE_PATH=./ env-cmd -f ./config/${CLIENT}/.env.${ENVIRONMENT} npx jest \"${FILE_PATTERN}\" ${@:4} --detectOpenHandles --forceExit"

echo "🚀 Running: ${JEST_CMD}"
echo ""

# Execute Jest
eval $JEST_CMD