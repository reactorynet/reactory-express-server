![Build Anything Fast](./img/banner.png)
# What is Reactory?
Reactory is a RAD (Rapid Application Development) toolkit that gives you enterprise features and abilities on a NodeJS platform.
It is lightweight when running in production and is highly extensible and is multi tenant / white labeled out of the box. 

It allows the seamless integration of multiple data sources tailored to the specific functionality of the API call.  
The reactory client is driven largely through configuration but also allows for hyper tailored components, injected through a plugin API.

Supports both REST and GRAPH based APIs, but GRAPH apis are the preferred method of implementing features.

Core data is stored in MongoDB but applications allows realtime integration into multiple sources like MySQL, SQL server and 3rd party APIs.
# Reactory Server
This guide will walk you through the most common tasks from installing, to running and making changes to the Reactory platform.
This project is a graphql, express, mongodb implementation that runs using pm2 configuration for production and yarn / npm for development purposes. So it assumed that you are familiar with the node, express and graphql tools.



Below you will find some information on how to perform common tasks.<br>

## Installing and running server
This section will cover the basic installation and configuration of the Reactory Server.

# Installing Reactory Server
The reactory core server is an express nodejs server. The server can be started by using the commands provided in the /bin folder.

It is highly advised to install [nvm](https://github.com/nvm-sh/nvm) as your node version manager.

Install nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
or
```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

The server is currently being maintained on Node 16.13.2 and can be run on Windows using the Ubuntu on Windows feature.

If you have not worked with the Ubuntu on Windows feature, you can go to the link below.
https://ubuntu.com/tutorials/ubuntu-on-windows#1-overview

## Prepare your environment
The Reactory server has many configuration options and generators that allows the server to dynamically change the server functionality based on configuration. In order for all of these to work correctly you need to ensure your system is correctly configured.

You will need to be comfortable with the command line.
#### 1. Set your environment variables
The reactory server require a couple of environment variables in order for it to manage distribution and dependency updates.

Depending on what shell you are running, you will need to update either your `.zprofile`, `.bash_profile` or `.zshrc` files with the following.


```bash
export REACTORY_HOME="$HOME/Projects/reactory"
export REACTORY_DATA="$REACTORY_HOME/reactory-data"
export REACTORY_SERVER="$REACTORY_HOME/reactory-express-server"
export REACTORY_CLIENT="$REACTORY_HOME/reactory-pwa-client"
export REACTORY_NATIVE="$REACTORY_HOME/reactory-native"
export REACTORY_PLUGINS="$REACTORY_DATA/plugins"
```

Save your changes and then you will need to open a new terminal, or you need to re-ingest your terminal profile exports by executing `> source ~/.bash_profile` or `> source ~/.zprofile` if you are using the Mac terminal.


#### 2. Install Dependencies
The PDF rendering require some specific configuration and has a requirement on build-essential and libss1-dev. Install these using the commands

Bellow is installation instructions for Ubuntu / Linux based systems.
`> sudo apt-get update`
`> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

For Mac OS, use brew to install the required libraries
`> brew install pkg-config cairo pango libpng jpeg giflib librsvg`


Node Canvas is one of the dependencies and installation instructions for specific environments can be found here https://github.com/Automattic/node-canvas#installation


### mongodb
You need to have a mongodb instance the server can connect to.  MongoDB is currently use via mongoose as the core data storage.  It is however not limited to it and mysql, sqlserver and postgress drivers can be used for storage for custom resolvers and plugins.

#### Installing mongodb

The preferred approach is to use the podman-compose.sh command to provide a podman environment

The easiest way to install mongodb is to use the docker image.  You can find the instructions here https://hub.docker.com/_/mongo

For development purposes you can use the docker image to run a local mongodb instance.  For production you can use a hosted mongodb instance or install mongodb on a server.

Installing on Linux:
`> sudo apt-get install mongodb`


You can also install mongodb on MacOS using brew
`> brew install mongodb` 

Your specific environment may have other ways of installing mongodb.  The mongodb documentation can be found here https://docs.mongodb.com/manual/installation/

## Install nvm (optional)
You can install nvm using the curl command below:

`> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.0/install.sh | bash`

Latest releases of nvm can be found on [github](
https://github.com/nvm-sh/nvm/releases)

## Install Node and NPM
If you installed nvm you can install node using (the .nvmrc file specifies the correct version as well)
`> nvm install 16.13.2`
## Getting the code
Reactory Server core and the client is distributed as Open Source, but it is very possible your organization has their own private repo. The reactory server can otherwise be cloned from the github repos.

It is advised that you create a root reactory folder, and then create sub folders inside this for the client, the core types, the data storage folder and other reactory related projects you may build.
### Checkout the server source code
```bash
> mkdir reactory
> cd reactory
> git clone git@github.com:reactorynet/reactory-data.git ./reactory-data/
> git clone git@github.com:reactorynet/reactory-server.git ./reactory-server/
> git clone git@github.com:reactorynet/reactory-core.git ./reactory-core/
> git clone git@github.com:reactorynet/reactory-client.git ./reactory-client/
```

This will clone the server into `reactory/reactory-server/` and the core types into `reactory/reactory-core` and the PWA client into `reactory/reactory-client/` as well as the data / or the CDN folder structure to `reactory/reactory-data/` folder.

The Reactory core library is a core types definition library and is shared across all applications. It has a two npm scripts that is used for compiling and deploying the library.  The `make-install` script, will compile and package the library. The `deploy-local` will use the environment variables we set prior and deploy the library to `reactory/reactory-server/lib`,  `reactory/reactory-client/lib` and the `reactory/reactory-data/plugins/artifacts` folders. 

## Install env-cmd and create a configuration file
Before you continue with the install, make sure you have dotenv installed globally.

dotenv is used for development / environment configuration when running the server from the terminal.
pm2 configuration files are used for running within the pm2 container.
`> npm install -g env-cmd`
Make a copy of the sample environment file and set the settings that is applicable for your instance.

`> cp reactory-server/config/reactory/.env.sample reactory-server/config/reactory/.env.local`
Changes your variables to match the directories to where you have installed your server and where you want your data folder.

You can also run the [addconfig.sh](/bin/addconfig.sh) command to create an environment file in the reactory-server/config folder.

`>bin/addconfig.sh <config-name> <environment>`

The config-name is the name of the configuration file you want to create.  The environment is the environment you want to create the configuration for. You can use the same utility to generate client configuration files as well.

## Install Reactory Core Library
The [Reactory Core library](https://github.com/reactorynet/reactory-core) is currently not published to npm, so you need to install it locally.  The easiest way to do this is to run the following commands.

```bash
> cd reactory-core
> npm i
> npm run make-install
> npm run deploy-local
```
If all dependencies are installed and it is the first time you run the deploy-local, it will take some time, as it is also running `npm i` on the reactory-server and reactory-client projects. If you encounter any errors, please check your environment variables and make sure they are set correctly.
### Install Azure Module
Currently the Reactory server is using the Azure Graph API for authentication and authorization and has direct dependency on the Azure module. We will be refactoring the code and remove this direct dependency in the future and make the azure graph and optional module.

To clone the module follow the below command line instructions.

```bash
> cd /src/modules/
> git clone git@github.com:reactorynet/reactory-azure.git ./reactory-azure/
```

### Install additional modules (optional)
If you want to install additional modules, you can clone them into the `reactory-server/src/modules` folder.  Your modules can be any custom module as long as it provides an index file that exports the module definition.

We are in the process of creating some utility scripts that will scaffold a new module and make it easier to create your own modules, so keep an eye out on the github repo.
### Create a modules enabled json file
The reactory server uses a json file to load the modules you want to include in your server build.
The easiest way to create this file is to copy the available.json file (published with the source) and copy the file to enabled.json.  The server will use the enabled.json as the default module definition file.  

> `cp src/modules/available.json src/modules/enabled.json`

The enabled.json file is a list of the modules that you can enabled or disable or add your own.
They are ignored by git as these may changed from system to system.

The available.json file will contain the list of publically published modules that you will be able to include.

!! VERSION 2.0 will have a downloader and installer utitlity.

#### Multiple Module Definitions
If you use a single source tree for your core server and want to run multiple configurations you can specify the name of your enabled.json file with by specifying your own MODULES_ENABLED environment variable in your .env / pm2 configurations.

!NOTE the filename must not include the extension, only the filename portion ie.
> MODULES_ENABLED=my_custom_module_file    


The actual filename will then be `src/modules/my_custom_module_file.json`

### Create a clients / tennant config file
The reactory server a clientsConfig folder to load the reactory application clients / tennants into the database.  This is done mostly to allow for runtime environment variable and logic for managing the reactory client.  There is no other way to load Reactory Client (applications) into the database. There are no API calls or scripts to generate / insert client configuration.

The server uses the enabled-clients.json file to load reactory client configurations.  The json file contains a simple string array with the folder names of the clients to include.  The server uses the list of clients to resolve the module entry point and generates a static __index.ts file which is used to load client configurations into the system.

You can specify a custom filename for your clients include json file by settting the CLIENTS_ENABLED environment variable.

The easiest way to create a new enabled clients file  

> `echo [\"MyApp\"] > src/data/clientConfigs/enabled-clients.myapp.json`  

Replace MyApp and myapp with your specific client / application / tennant name

## Development
To start the default server first copy a .env.local to the /config/reactory/ folder
`> cp config/.env.sample config/reactory/.env.local`

#### sample .env file content
```bash
 #The root data folder for the server  
 APP_DATA_ROOT=/var/reactory/data   
 #The system fonts folder - this is required by the PDF engine    
 #('nix based) || </mnt/c/Windows/Fonts> (ubuntu on windows)
 APP_SYSTEM_FONTS=/usr/share/fonts
 MONGOOSE=mongodb://localhost:27017/reactory
 #the name portion of the json used to generate the module __index.ts file
 MODULES_ENABLED=
 #<CLIENTS_FILENAME> used to generate the clietns __index.ts file    
 CLIENTS_ENABLED=
 #The port the server will run on
 API_PORT=4000 
 #The sendgrid api key used for sending emails 
 SENDGRID_API_KEY=SG.YourKeyDataHere  
 #The root url of the server for production it would be https://yourdomain.com
 API_URI_ROOT=http://localhost:4000
 # The CDN root url for the server for production it would be https://yourdomain.com/cdn/
 CDN_ROOT=http://localhost:4000/cdn/
 # A Secret key used for session and jwt tokens  
 SECRET_SAUCE=YOUR_SECRET_KEY
 # The development mode flag, this will enable the development mode features
 MODE=DEVELOP  
 # The mongo user
 MONGO_USER=mongouser  
 # The mongo password
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
```

To run the application in development mode in your terminal run:
`> bin/start.sh <key> <environment>` where"key" is the specific environment configuration folder within `<root>/config/<key>/.env.<environment>`

Files matching `<root>/config/**` will be ignored by git by default. 

<b>Note:</b> Do not commit and env files to the repository.  The .env files are used to store sensitive information and should not be shared with anyone.  The .env files are ignored by git by default.

_** Running the start command without any parameters will start with 'reactory' and 'local' as the parameters for key and environment._

If you have configured everything correctly along with your CDN folder and default data, you should be presented by the following output in your terminal.

![Build Anything Fast](/branding/reactory-text.png)


## Production / Other
The full configuration of a production server is beyond the scope of this document.  However the following is a list of the steps required to setup a production server.

Create a user account under which to run the server. Ensure that user permissions are resitrcted to the minimum required to run the server.  The following is a sample of the steps required to setup a production server.

* `sudo adduser -d /var/reactory -m reactory`
* `sudo usermod -aG sudo reactory`
* ensure the reactory user is the owner of the folder
* check out the code into the reactory-server folder
* follow all the normal installation steps to setup the server
* ensure you have a valid .env file in the /config/reactory folder
* start your server using the bin/server.sh script.  This will start the server in production mode. If you want to run the server in development mode use the bin/start.sh script.
* install pm2 or alternatively use the service definition file to register your service in order to run the server as a service.
* Setup PM2 monitoring and register your account with PM2.


## Common Issues and Solutions
### The server is not starting
* Ensure you have a valid .env file in the /config/<config-name> folder
* Ensure your mongodb server is running
* Ensure you have a valid username and password for mongo
* Ensure you have a valid enabled-modules.json file in the /src/modules folder and the correct value corresponds to the MODULES_ENABLED environment variable
* Ensure you have a valid enabled-clients.json file in the /src/data/clientConfigs folder and the correct value corresponds to the CLIENTS_ENABLED environment variable
* Ensure the mongo db connectionstring doesn't have the username in the connection string.  The username and password should be specified in the MONGO_USER and MONGO_PASSWORD environment variables.