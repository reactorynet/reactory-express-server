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

Below you will find some information on how to perform common tasks.

---

## Quick Start (Automated Installer)

The fastest way to get a fully configured Reactory environment is to use the interactive installer. It handles system dependencies, Node.js, repository cloning, environment configuration, module selection, and dependency installation for the server, data/CDN, and PWA client — all in one guided session.

### Run the installer remotely
```bash
bash <(curl -fsSL https://raw.githubusercontent.com/reactorynet/reactory-express-server/master/bin/install.sh)
```

### Run the installer locally
If you have already cloned the server repository:
```bash
bash bin/install.sh
```

> **Important:** Use `bash <(curl ...)` (process substitution) rather than piping with `|` so that the interactive prompts can read from your terminal.

### What the installer does

| Step | Description |
|------|-------------|
| **1. System Dependencies** | Detects your OS and package manager (brew, apt, dnf, pacman). Installs git, curl, and the native canvas/PDF libraries (cairo, pango, giflib, etc.). |
| **2. Node.js via nvm** | Installs nvm v0.39.7 (if needed), then installs and activates Node 20.19.4. Also installs yarn and env-cmd globally. |
| **3. Repositories** | Prompts for a root directory, then clones the server, PWA client, core types library, and data/CDN repos. Optionally clones reactory-native. Clones the required reactory-azure module. Skips any repo that already exists. |
| **4. Shell Environment** | Detects your shell profile (.zshrc, .zprofile, .bashrc) and appends the required `REACTORY_*` exports. |
| **5. Server .env** | Walks you through MongoDB connection, API port, URLs, admin credentials, and more. Generates a complete `.env.<environment>` file with a random `SECRET_SAUCE`. |
| **6. Modules & Clients** | Presents the available modules from `available.json` and lets you select which to enable. Creates the `enabled-<name>.json` and `enabled-clients.<name>.json` files. |
| **7. Build & Install** | Optionally sets up MongoDB via Docker/Podman. Runs `yarn install` in the server and client (note: reactory-core is cloned but not built locally, as `@reactorynet/reactory-core` is installed from npm). |

Every step has sensible defaults and can be skipped. Re-running the installer is safe — it will not overwrite existing clones or configuration files unless you explicitly confirm.

Once the installer finishes, start the server with:
```bash
cd $REACTORY_SERVER
bin/start.sh <config-name> <environment>
```

---

## Manual Installation

If you prefer full control or need to understand each step in detail, follow the manual process below.

### Prerequisites

It is highly advised to install [nvm](https://github.com/nvm-sh/nvm) as your node version manager.

Install nvm:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```
or
```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

The server is currently being maintained on Node 20.19.4 and can be run on Windows using the Ubuntu on Windows feature.

If you have not worked with the Ubuntu on Windows feature, you can go to the link below.
https://ubuntu.com/tutorials/ubuntu-on-windows#1-overview

### Prepare your environment
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
export REACTORY_CORE="$REACTORY_HOME/reactory-core"
export REACTORY_NATIVE="$REACTORY_HOME/reactory-native"
export REACTORY_PLUGINS="$REACTORY_DATA/plugins"
```

Save your changes and then you will need to open a new terminal, or you need to re-ingest your terminal profile exports by executing `> source ~/.bash_profile` or `> source ~/.zprofile` if you are using the Mac terminal.


#### 2. Install Dependencies
The PDF rendering require some specific configuration and has a requirement on build-essential and libss1-dev. Install these using the commands

Below is installation instructions for Ubuntu / Linux based systems.
`> sudo apt-get update`
`> sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`

For Mac OS, use brew to install the required libraries
`> brew install pkg-config cairo pango libpng jpeg giflib librsvg`


Node Canvas is one of the dependencies and installation instructions for specific environments can be found here https://github.com/Automattic/node-canvas#installation


### MongoDB
You need to have a mongodb instance the server can connect to.  MongoDB is currently use via mongoose as the core data storage.  It is however not limited to it and mysql, sqlserver and postgress drivers can be used for storage for custom resolvers and plugins.

#### Installing mongodb

The preferred approach is to use the podman-compose.sh command to provide a podman environment

The easiest way to install mongodb is to use the docker image.  You can find the instructions here https://hub.docker.com/_/mongo

For development purposes you can use the docker image to run a local mongodb instance.  For production you can use a hosted mongodb instance or install mongodb on a server.

**Docker (recommended for development):**
```bash
docker run -d --name reactory-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=reactory \
  -e MONGO_INITDB_ROOT_PASSWORD=reactorycore \
  -v reactory-mongo-data:/data/db \
  mongo:7
```

**Linux:**
`> sudo apt-get install mongodb`

**MacOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
```

Your specific environment may have other ways of installing mongodb.  The mongodb documentation can be found here https://docs.mongodb.com/manual/installation/

### Install Node and NPM
If you installed nvm you can install node using (the .nvmrc file specifies the correct version as well)
```bash
nvm install 20.19.4
nvm use 20.19.4
```

#### Install yarn
The reactory server express make use of sub modules. Yarn is used as the package manager as it supports sub modules natively.

Run `npm install -g yarn` or `brew install yarn` if you do not already have yarn installed.


### Getting the code
Reactory Server core and the client is distributed as Open Source, but it is very possible your organization has their own private repo. The reactory server can otherwise be cloned from the github repos.

It is advised that you create a root reactory folder, and then create sub folders inside this for the client, the core types, the data storage folder and other reactory related projects you may build.

#### Checkout the source code
```bash
mkdir reactory
cd reactory
git clone git@github.com:reactorynet/reactory-data.git ./reactory-data/
git clone git@github.com:reactorynet/reactory-server.git ./reactory-server/
git clone git@github.com:reactorynet/reactory-core.git ./reactory-core/
git clone git@github.com:reactorynet/reactory-client.git ./reactory-client/
```

This will clone the server into `reactory/reactory-server/`, the core types into `reactory/reactory-core`, the PWA client into `reactory/reactory-client/`, and the data/CDN folder structure to `reactory/reactory-data/`.

> **Note:** The Reactory Core library is published to npm as `@reactorynet/reactory-core`. The repository is cloned for development purposes and module definitions, but the build process is skipped during installation as the npm package is used instead. 

### Environment Configuration Files
Before you continue with the install, make sure you have env-cmd installed globally.

env-cmd is used for development / environment configuration when running the server from the terminal.
`> npm install -g env-cmd` or `yarn global add env-cmd`

Reactory uses a two-stage environment resolution model:
- **Base Environment**: `config/<name>/.env` or root `./.env` (contains common/default settings)
- **Environment Overrides**: `config/<name>/.env.<environment>` (e.g. `.env.local`, `.env.staging`)

For local development, copy the sample environment file to create your local override:
`> cp config/reactory/env.sample config/reactory/.env.local`

Change your variables to match the directories where you have installed your server and data folder.

In production deployments, providing a single `.env` file at the server root or in `config/<name>/.env` is fully supported without requiring `.env.local`. See [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) for full details.

You can also run the [addconfig.sh](/bin/addconfig.sh) command to generate a new configuration:
`> bin/addconfig.sh <config-name> <environment>`

### Install Azure Module
Currently the Reactory server is using the Azure Graph API for authentication and authorization and has direct dependency on the Azure module. We will be refactoring the code and remove this direct dependency in the future and make the azure graph an optional module.

To clone the module follow the below command line instructions.

```bash
cd src/modules/
git clone git@github.com:reactorynet/reactory-azure.git ./reactory-azure/
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

#### Multiple Module Definitions
If you use a single source tree for your core server and want to run multiple configurations you can specify the name of your enabled.json file with by specifying your own MODULES_ENABLED environment variable in your .env / pm2 configurations.

> **Note:** the filename must not include the extension, only the filename portion ie.
> MODULES_ENABLED=my_custom_module_file    

The actual filename will then be `src/modules/my_custom_module_file.json`

### Create a clients / tenant config file
The reactory server uses a clientsConfig folder to load the reactory application clients / tenants into the database.  This is done mostly to allow for runtime environment variable and logic for managing the reactory client.  There is no other way to load Reactory Client (applications) into the database. There are no API calls or scripts to generate / insert client configuration.

The server uses the enabled-clients.json file to load reactory client configurations.  The json file contains a simple string array with the folder names of the clients to include.  The server uses the list of clients to resolve the module entry point and generates a static __index.ts file which is used to load client configurations into the system.

You can specify a custom filename for your clients include json file by setting the CLIENTS_ENABLED environment variable.

The easiest way to create a new enabled clients file  

> `echo ["MyApp"] > src/data/clientConfigs/enabled-clients.myapp.json`  

Replace MyApp and myapp with your specific client / application / tenant name

---

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
 #<CLIENTS_FILENAME> used to generate the clients __index.ts file    
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
`> bin/start.sh <key> <environment>` where "key" is the specific configuration folder within `<root>/config/<key>` (default: `reactory`) and "environment" is the environment overlay (default: `local`).

Files matching `<root>/config/**` will be ignored by git by default. 

<b>Note:</b> Do not commit env files to the repository. The .env files are used to store sensitive information and are ignored by git by default.

Running the start command without parameters (`bin/start.sh`) will automatically resolve the base `.env` and merge with `.env.local` if present. In production deployments, a single `.env` at the server root is used directly without requiring `.env.local`.

If you have configured everything correctly along with your CDN folder and default data, you should be presented by the following output in your terminal.

![Build Anything Fast](/branding/reactory-text.png)

---

## Utility Scripts

The `/bin` folder contains comprehensive utilities for managing your Reactory instance. See [bin/README.MD](/bin/README.MD) and [ENVIRONMENT_CONFIGURATION.md](./ENVIRONMENT_CONFIGURATION.md) for detailed reference.

| Script | Purpose | Usage |
|--------|---------|-------|
| `bin/reactory` | **Unified Reactory CLI executable** (workflows, service-gen, module-gen) | `bin/reactory <command> [options]` |
| `bin/install.sh` | Interactive guided installer for the full platform | `bash bin/install.sh` |
| `bin/start.sh` | Start local development server with nodemon auto-restart | `bin/start.sh [client] [env] [--no-nodemon]` |
| `bin/start-otel.sh` | Dev server with OpenTelemetry instrumentation | `bin/start-otel.sh [client] [env] [no-nodemon]` |
| `bin/debug.sh` | Start with Node inspector attached for remote debugging | `bin/debug.sh [client] [env]` |
| `bin/run.sh` | Run compiled version of the application | `bin/run.sh [client] [env]` |
| `bin/run-otel.sh` | Run compiled app in continuous loop with OpenTelemetry | `bin/run-otel.sh [client] [env]` |
| `bin/serve.sh` | Start in production mode via PM2 | `bin/serve.sh [client] [env] [pm2-env]` |
| `bin/restart-server.sh` | Gracefully restart running server by PID / port inspection | `bin/restart-server.sh` |
| `bin/compose.sh` | Unified container launcher (auto-selects Podman / Docker Compose v2/v1) | `bin/compose.sh [config] [env] [variant] [cmd]` |
| `bin/build.sh` | Compile server application and produce deployment tar archive | `bin/build.sh [client] [env]` |
| `bin/build-image.sh` | Build container image from server build tar | `bin/build-image.sh [client] [env] [Dockerfile]` |
| `bin/bic.sh` | **Full deployment pipeline**: build → image → compose (3 steps in one) | `bin/bic.sh [config] [env] [variant]` |
| `bin/bit.sh` | **Infra pipeline**: build → image → PWA build → terraform apply | `bin/bit.sh [config] [env] [options]` |
| `bin/migrate.sh` | Module-aware MongoDB migration runner (status, up, down, create) | `bin/migrate.sh [command] [client] [env]` |
| `bin/migrate-typeorm.sh` | Module-aware PostgreSQL/TypeORM migration runner | `bin/migrate-typeorm.sh [command] [client] [env]` |
| `bin/backup.sh` | Comprehensive database backup (MongoDB + PostgreSQL) | `bin/backup.sh [client] [env] [options]` |
| `bin/restore.sh` | Comprehensive database restore from archive or directory | `bin/restore.sh <archive> [client] [env] [options]` |
| `bin/generate.sh` | Run code generation from YAML service definitions | `bin/generate.sh [client] [env]` |
| `bin/depends.sh` | Manage yarn dependencies and lockfiles for a configuration | `bin/depends.sh [--watch] [--cname=name]` |
| `bin/git-manager.sh` | Multi-repo git management across the Reactory workspace | `bin/git-manager.sh <command>` |
| `bin/docker-compose.sh` | Legacy docker-compose wrapper (superseded by `compose.sh`) | `bin/docker-compose.sh [client] [env] [command]` |
| `bin/podman-compose.sh` | Legacy podman-compose wrapper (superseded by `compose.sh`) | `bin/podman-compose.sh [client] [env]` |
| `bin/restore2.sh` | Legacy MongoDB-only restore (superseded by `restore.sh`) | `bin/restore2.sh <dbFrom> <dbTo> <file>` |

---

## Production / Other
The full configuration of a production server is beyond the scope of this document.  However the following is a list of the steps required to setup a production server.

Create a user account under which to run the server. Ensure that user permissions are restricted to the minimum required to run the server.  The following is a sample of the steps required to setup a production server.

* `sudo adduser -d /var/reactory -m reactory`
* `sudo usermod -aG sudo reactory`
* ensure the reactory user is the owner of the folder
* check out the code into the reactory-server folder
* follow all the normal installation steps to setup the server (or run `bin/install.sh`)
* ensure you have a valid .env file in the /config/reactory folder
* start your server using the bin/serve.sh script.  This will start the server in production mode. If you want to run the server in development mode use the bin/start.sh script.
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
