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
# Note this file will only run a compiled version of the application.
REACTORY_CONFIG_ID=${1:-reactory}
REACTORY_ENV_ID=${2:-local}
source ./bin/shared/shell-utils.sh
check_env_vars
check_node
NODE_PATH=./ env-cmd -f .env node ./app/index.js
 