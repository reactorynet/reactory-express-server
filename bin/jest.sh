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

# Parse arguments
USE_BUN=false
BUN_VERSION=""
POSITIONAL=()
EXTRA_ARGS=()

for arg in "$@"; do
  case "$arg" in
    --bun)
      USE_BUN=true
      ;;
    --bun-version=*)
      USE_BUN=true
      BUN_VERSION="${arg#*=}"
      ;;
    --version=*)
      BUN_VERSION="${arg#*=}"
      ;;
    *)
      if [[ ${#POSITIONAL[@]} -lt 3 && "$arg" != -* ]]; then
        POSITIONAL+=("$arg")
      else
        EXTRA_ARGS+=("$arg")
      fi
      ;;
  esac
done

CLIENT=${POSITIONAL[0]:-reactory}
ENVIRONMENT=${POSITIONAL[1]:-local}
FILE_PATTERN=${POSITIONAL[2]:-**/**/*.spec.*s}

copy_env_file "$CLIENT" "$ENVIRONMENT"
source_env_file "$CLIENT" "$ENVIRONMENT"
check_env_vars

echo "🛠️ Loading Environment: client [${CLIENT}] env [${ENVIRONMENT}] runtime: $([[ "$USE_BUN" == "true" ]] && echo 'bun' || echo 'node')"
echo "🧪 File Pattern: ${FILE_PATTERN}"
echo "🔧 Additional Args: ${EXTRA_ARGS[*]}"

if [[ "$USE_BUN" == "true" ]]; then
  ensure_bun "$BUN_VERSION" || exit 1
  echo "🚀 Running: bun test \"${FILE_PATTERN}\" ${EXTRA_ARGS[*]}"
  NODE_PATH=./ env-cmd --no-override -f ./.env bun test "${FILE_PATTERN}" "${EXTRA_ARGS[@]}"
else
  # Build Jest command
  JEST_CMD="NODE_PATH=./ env-cmd --no-override -f ./.env npx jest \"${FILE_PATTERN}\" ${EXTRA_ARGS[*]} --detectOpenHandles --forceExit"
  echo "🚀 Running: ${JEST_CMD}"
  echo ""
  eval $JEST_CMD
fi