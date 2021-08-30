# Reactory Server Utilities
The server has several utilities that makes managing your reactory instance and deployments easier.
These utils are generally shortcut wrappers for more complex node command instructions.
### Active utilities

1. [start.sh](./start.sh) - used to start a local development instance
2. [debug.sh](./start.sh) - used to start a local development instance but with a node debugger listening
3. [backup.sh](./start.sh) - used to make a backup of particular mongo db instance 
4. [restore2.sh](./restore2.sh) - used to restore a set of backups from one database to another
5. [run.sh](./run.sh) - same as [start.sh](./start.sh) (reserved for later use)
6. [serve.sh](./serve.sh) - used to start the service using pm2
7. [test.sh](./test.sh) - used to launch the test suite

### In Progress
8. [upgrade.sh](./upgrade.sh) - pulls the latest version of the server installs dependencies and starts server again
9. [addconfig.sh](./addconfig.sh) - utility that can be used to guide you through creating a configuration file for your environment.

## Starting server in development mode

When the server is running in development mode it checks for file changes in either js, ts and json files. So with every file save your development server should restart without a problem.

bin/[start.sh](./start.sh)

`server>bin/start.sh <client-key> <environment-key>`


## Production mode
In a production mode using pm2

`reactory-server>bin/serve.sh <client-key> <target> <environment>`


bin/[serve.sh](./serve.sh) 
```
echo Starting Reactory Server key: [${1:-reactory}] target: ${2:-local} environment: ${3:-development}
pm2 start ./config/${1:-reactory}/pm2.${2:-local}.config.js --env ${3:-development}
pm2 monit
```
