# Config Files

These configuration files are used to configure specific environments. Production run files are configured using `pm2.<environment>.config.js`
## DEVELOPMENT ENVIRONMENT FILES
Please note the files contained in these folders are generally used when running the server under bin/start.sh {client-key (defaults to "reactory")}. When running the server using PM2 environment variables needs to be configured in the corresponding ``src/config/<environment name>/{clientkey}.config.js``

These files are used by the dotenv package and the env-cmd package that allows you to set environment variables via specific files.  We organize them typically by client (folder) and then a file for each.  Files that end in .local is added by default to .gitignore. This is specifically to prevent to overwriting of local configs.

For more information on PM2 go [here](https://pm2.io)

## Adding New Configuration
You can use the [addconfig.sh](/bin/addconfig.sh) script to guide you through creating a new configuration file.  The utility will walk you through each configuration setting as well as provide help for each element.