# What is Reactory?
Reactory is a RAD (Rapid Application Development) toolkit that gives you enterprise features and abilities on a NodeJS platform.
It is lightweight when running in production and is highly extensible and is multi tenant / white labeled out of the box. 

It allows the seamless integration of multiple data sources tailored to the specific functionality of the API call.  
The reactory client is driven largely through configuration but also allows for hyper tailored components, injected through a plugin API.

Supports both REST and GRAPH based APIs, but GRAPH apis are the preferred method of implementing features.

Core data is stored in MongoDB but applications allows realtime integration into multiple sources like MySQL, SQL server and 3rd party APIs.
# Reactory Server
This guide will walk you through the most common tasks from installing, to running and making changes to the Reactory platform.
This project is a graphql, express, mongodb implementation that runs using pm2 configuration for production and yarn / npm for development purposes.


Below you will find some information on how to perform common tasks.<br>

## Installing and running server
This section will cover the basic installation and configuration of the server.

# Installing Reactory Server
The reactory core server is a node js based server, that can be started by using the commands provided in the /bin folder.

It is advised to install nvm as your node version manager.

The server is currently being maintained on Node 10.16.3 and can be run on Windows using the Ubuntu on Windows feature.

Checkout the source code

`> git clone git@bitbucket.org:reactory/reactory-server.git`

## Dependencies
The PDF rendering require some specific configuration and has a requirement on build-essential and libss1-dev and is installed using 


`> sudo apt-get update`

`> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

### mongodb
You need to have a mongodb instance the server can connect to.  MongoDB is currently use via mongoose as the core data storage.  It is however not limited to it and mysql, sqlserver and postgress drivers can be used for storage for custom resolvers and plugins.

## Install nvm (optional)
You can install nvm using the curl command below:

`> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash`

Latest releases of nvm can be found on [github](
https://github.com/nvm-sh/nvm/releases)

## Install Node and NPM
If you installed nvm you can install node using 
`> nvm install 10.16.3`

run `> npm install` this will install all the dependencies for the server.

## Development
To run the application in development mode in your terminal run:
`> bin/start.sh <key> <environment>` where"key" is the specific environment configuration folder within `<root>/config/<key>/.env.<environment>`

Files matching `<root>/config/*/.env*.local` will be ignored by git by default. 

<b>Note:</b> Do not commit and env files that are used for local use.

_** Running the start command without any parameters will start with 'reactory' and 'local' as the parameters for key and environment._


`npm install -g env-cmd`

# mongo --port 27017 -u "reactorycore" -p "abc123" \ --authenticationDatabase "admin"
# mongo --port 27017  --authenticationDatabase "admin" -u "reactorycore" -p <MONGO_PASSWORD>
# MONGO_USER=reactorycore
# MONGO_PASSWORD=<MONGO_PASSWORD>

## Production / Other

Create a user account under which to run the server. 

* `sudo adduser -d /var/reactory -m reactory`
* `sudo usermod -aG sudo reactory`
* ensure the reactory user is the 
* check out the code into the reactory-api folder
* install pm2 or alternatively use the service definition file to register your service
