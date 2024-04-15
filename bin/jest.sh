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
echo "🛠️ Loading Environment ./config/${1:-reactory}/${2:-local} "
NODE_PATH=./ env-cmd -f ./config/${1:-reactory}/.env.${2:-local} npx jest ${3:-**/**/*.spec.*s} ${@:4} --detectOpenHandles