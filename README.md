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

It is highly advised to install nvm as your node version manager.

The server is currently being maintained on Node 10.16.3 and can be run on Windows using the Ubuntu on Windows feature.

If you have not worked with the Ubuntu on Windows feature, you can check out the link below.
https://ubuntu.com/tutorials/ubuntu-on-windows#1-overview

Checkout the source code
`> mkdir reactory`
`> cd reactory`
`> git clone git@bitbucket.org:reactory/reactory-server.git ./reactory-server/`

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

run `> npm install` this will install all the dependencies for the server. The install can take a few minutes but if all your pdf libraries are installed correctly it will complete in about 2 - 3 minutes depending on your internet connection and machine.


## Install env-cmd and create a configuration file
dotenv is used for development / environment configuration when running the server from the terminal.
pm2 configuration files are used for running within the pm2 container.
`> npm install -g env-cmd`

`> cp config/.env.sample config/reactory/.env.local`
Changes your variables to match the directories to where you have installed your server and where you want your data folder.  When complete run the `> bin/init.sh` script.  This will create your data / local folder structures that is required for development.

### Install MORES module
`> cd src/modules/`
`> git clone git@bitbucket.org:reactory/mores-server-module.git`

### Enabled your modules
Copy the available.json to enabled.json

The enabled.json file is a list of the modules that you can enabled or disable or add your own.
They are ignored by git as these may changed from system to system.

The available.json file will contain the list of publically published modules that you will be able to install and download with installer script. (TO BE COMPLETED)

`> cp src/modules/available.json src/modules/enabled.json`
## Development
To start the default server first copy a .env.local to the /config/reactory/ folder
`> cp config/.env.sample config/reactory/.env.local`

#### sample .env file content
APP_DATA_ROOT=/mnt/d/data/reactory
APP_SYSTEM_FONTS=/mnt/c/Windows/Fonts
LEGACY_APP_DATA_ROOT=/mnt/d/data
MONGOOSE=mongodb://localhost:27017/reactory
WORKFLOW_MONGO=mongodb://localhost:27017/reactory-workflow
API_PORT=4000
SENDGRID_API_KEY=YOUR KEY GOES HERE
API_URI_ROOT=http://localhost:4000
CDN_ROOT=http://localhost:4000/cdn/
SECRET_SAUCE=YOUR SECRET KEY (used for sESSIONS)
MODE=DEVELOP
MONGO_USER=mongouser
MONGO_PASSWORD=mongopwd

OAUTH_APP_ID=
OAUTH_APP_PASSWORD=
OAUTH_REDIRECT_URI=http://localhost:4000/auth/microsoft/openid/complete/reactory
OAUTH_SCOPES='profile offline_access user.read calendars.read mail.read email'
OAUTH_AUTHORITY=https://login.microsoftonline.com/common
OAUTH_ID_METADATA=/v2.0/.well-known/openid-configuration
OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token

MAIL_REDIRECT_ENABLED=development,production
MAIL_REDIRECT_ADDRESS=your-email+redirect@gmail.com


To run the application in development mode in your terminal run:
`> bin/start.sh <key> <environment>` where"key" is the specific environment configuration folder within `<root>/config/<key>/.env.<environment>`

Files matching `<root>/config/*/.env*.local` will be ignored by git by default. 

<b>Note:</b> Do not commit and env files that are used for local use.

_** Running the start command without any parameters will start with 'reactory' and 'local' as the parameters for key and environment._


## Production / Other

Create a user account under which to run the server. 

* `sudo adduser -d /var/reactory -m reactory`
* `sudo usermod -aG sudo reactory`
* ensure the reactory user is the 
* check out the code into the reactory-api folder
* install pm2 or alternatively use the service definition file to register your service
