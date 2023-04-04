
import { ReadLine } from 'readline';
import { IQuestionCollection, IServerConfiguration, QuestionHandlerResponse } from '../config.types';
import { strongRandom, isHelpRequest, colors, persistServerConfiguration } from '../helpers';

const {
  REACTORY_DATA
} = process.env;

export const DEFAULT_SERVER_CONFIG: IServerConfiguration = {
  name: 'reactory',
  environment: 'local',
  api_uri_root: 'http://localhost:4000',
  cdn_root: 'http://localhost:4000/cdn',
  server_id: 'reactoory.local',
  log_level: 'debug',
  mongo_password: strongRandom(),
  mongo_user: 'reactory',
  mongoose_connection: 'mongodb://localhost:27017/reactory?keepAlive=true&socketTimeoutMS=360000&connectTimeoutMS=360000',
  oauth_app_id: '',
  oauth_app_password: '',
  oauth_authority: '',
  oauth_authorize_endpoint: '',
  oauth_id_metadata: '',
  oauth_redirect_uri: '',
  oauth_scopes: '',
  oauth_token_endpoint: '',
  port: 4000,
  secret_key: strongRandom(),
  sendgrid_api_key: 'SG.disabled',
  app_data_root: process.env.REACTORY_DATA,
  modules_enabled: `enabled-reactory`,
  system_user_id: `system@reactory`,
}

export const serverConfigQuestions = (rl: ReadLine, next?: QuestionHandlerResponse): IQuestionCollection => ({
  required: {
    name: {
      question: `What is the name for this configuration? default: ${DEFAULT_SERVER_CONFIG.name}`,
      response: null,
      valid: false,
      handler: (response: string, configuration: IServerConfiguration) => {
        if (response.length === 0) {
          configuration.name = DEFAULT_SERVER_CONFIG.name || 'reactory';
          return { next: serverConfigQuestions(rl).required.environments, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.gray(`
  The configuration name, would be a short concise name that describes
  the name of the application api, i.e. if you are building a shop front 
  api, then a name might be <brand name>-shop, or just shop.\n 
  A brand name can be thought of the abbreviation for your business or 
  corporation.\nThis can be useful if you intend to run multiple configurations from a 
  single source base.\ni.e.\nacme-shop, acme-sales, acme-warehouse, acme-hr etc.

  To enable the reactory default application, use the name "reactory".

  `));

          return { next: serverConfigQuestions(rl).required.name, configuration };
        }

        configuration.name = response;
        return { next: serverConfigQuestions(rl).required.environments, configuration };
      },
    },
    environments: {
      question: `Which environment would you like to provision for? default is "${DEFAULT_SERVER_CONFIG.environment}"`,
      response: null,
      valid: false,
      handler: (response: string = 'local,develop,test,production', configuration: IServerConfiguration) => {
        if (response.length === 0) {
          configuration.environment = 'local';
          return { next: serverConfigQuestions(rl).required.system_user_id, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The environment name will be used to create .env.<environment> file.
  These files are used to start your reactory server and load environment
  variables into the node process.env list.  When starting the server
  using "bin/start.sh ${DEFAULT_SERVER_CONFIG.name} local", the server will load the 
  corresponding dotenv file from the config directory.
  The default value is "local".
  <reactory-server>/  <-- Your root install folder
    + /config/
    +--> /${DEFAULT_SERVER_CONFIG.name}/
      +--> /.env.local
      +--> /.env.develop
      +--> /.env.test
      +--> /.env.production
  If you want to know more about dotenv you can view the package
  on npm here: https://www.npmjs.com/package/dotenv
`));
          return {
            next: serverConfigQuestions(rl).required.environments,
            configuration: configuration
          };
        }

        configuration.environment = response;
        return { next: serverConfigQuestions(rl).required.system_user_id, configuration };
      }
    },
    system_user_id: {
      question: 'Provide an email address that will be used for the system account. i.e. reactory_admin@acme.com',
      handler: (response: string, configuration: IServerConfiguration) => {
        if (response.length === 0) {
          rl.write(colors.red(`
  The system user id is required and must be a valid email address.
            `))
          return { next: serverConfigQuestions(rl).required.system_user_id, configuration }
        }
        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The system user id, should be an email address that you can 
  access.  The system will use this address to send alert
  or configured notifications to that email address.
`));
          return { next: serverConfigQuestions(rl).required.system_user_id, configuration };
        }
        configuration.system_user_id = response;
        return { next: serverConfigQuestions(rl).required.server_id, configuration };
      }
    },
    server_id: {
      question: 'Provide a server id that can be used to identify the server a client is a connected to. default: <name>-local',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.server_id = `${configuration.name}-local`;
          return { next: serverConfigQuestions(rl).required.app_data_root, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The server id is a descriptive name that can be used to identify
  to identify the server a client is connected to.  This is useful
  if you are running multiple servers, and want to identify which
  server a client is connected to.  This is also used to identify
  the server in the admin dashboard. The id is returned as 
  part of the apiStatus graph query.

  The default value is the name of the configuration appended with
  the word "local".  i.e. ${configuration.name}-local
`));
          return { next: serverConfigQuestions(rl).required.server_id, configuration };
        }

        configuration.server_id = response;
        return { next: serverConfigQuestions(rl).required.app_data_root, configuration };
      }

    },
    app_data_root: {
      question: `Provide the location of your data root folder? default (${REACTORY_DATA})`,
      handler: (response: string, configuration: IServerConfiguration) => {
        if (response.length === 0) {
          configuration.app_data_root = REACTORY_DATA;
          return { next: serverConfigQuestions(rl).required.modules_enabled, configuration };
        }

        if (isHelpRequest(response)) {

          rl.write(colors.grey(`  
  This is the base folder where the reactory server stores,
  processes and uploads data.  These folders may be local or network
  mapped drives. The default value is ${REACTORY_DATA}.  
`));

          return { next: serverConfigQuestions(rl).required.app_data_root, configuration };
        }

        configuration.app_data_root = response;

        return { next: serverConfigQuestions(rl).required.modules_enabled, configuration };
      }
    },
    modules_enabled: {
      question: `What is the name of the modules enabled file you want to load? (default: enabled-${DEFAULT_SERVER_CONFIG.name})`,
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          DEFAULT_SERVER_CONFIG.modules_enabled = `enabled-${configuration.name}`;

          return { next: serverConfigQuestions(rl).required.port, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  This is the name of the json file that will contain the list of modules that will 
  be used to create the src/modules/__index.ts file.
  The default is enabled-${DEFAULT_SERVER_CONFIG.name}.
  When the server starts, first bin/generate.sh is called.  This executes a script
  that will emit the __index.ts file. The module index file. The script will use the
  MODULES_ENABLED environment variable to look for a json file that matches it.  
  i.e. if your MODULES_ENABLED environment variable is enabled-${DEFAULT_SERVER_CONFIG.name}, there has
  to be a src/modules/enabled-${DEFAULT_SERVER_CONFIG.name}.json file on your file system.
  If the file does not exist, one will be clone from the available.json file.
`));

          return { next: serverConfigQuestions(rl).required.modules_enabled, configuration };
        }

        configuration.modules_enabled = response;

        return { next: serverConfigQuestions(rl).required.port, configuration };
      }
    },
    port: {
      question: 'What port number would you like to run the server on. (default 4000)',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.port = 4000;

          return { next: serverConfigQuestions(rl).required.sendgrid_api_key, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The TCP port number the server must use.  The default is 4000.
  If you want configure the reactory server in a cluster you
  will need to copy and paste your config dotenv file and use
  the appropriate command line argument to specify the config
  file to load.
`));

          return { next: serverConfigQuestions(rl).required.port, configuration };
        }

        configuration.port = parseInt(response, 10);

        return { next: serverConfigQuestions(rl).required.sendgrid_api_key, configuration };
      }
    },
    sendgrid_api_key: {
      question: 'Provide a send grid api key to enable send grid mail integration. default (SG.disabled)',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.sendgrid_api_key = 'SG.disabled';
          return { next: serverConfigQuestions(rl).required.api_uri_root, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  If you want to use the default sendgrid email service, then you will need to provide
  your own sendgrid API key.

  You can leave it blank and sendgrid integration will be disabled.

  For more on getting an API key from sendgrid, go here:
  https://sendgrid.com/
`));
        }

        configuration.sendgrid_api_key = response;
        return { next: serverConfigQuestions(rl).required.api_uri_root, configuration };
      }

    },
    api_uri_root: {
      question: 'Provide an API uri root. Ensure it has protocol and correct port default: http://localhost:4000/ >> ',
      response: null,
      valid: false,
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.api_uri_root = `http://localhost:${DEFAULT_SERVER_CONFIG.port}/`
          return { next: serverConfigQuestions(rl).required.cdn_root, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The API_URI_ROOT value is the root of your server. If you are running it on your 
  local machine for development the value should be http://localhost:${DEFAULT_SERVER_CONFIG.port}/

  if you are running on your production / test or envinments which require internet
  access, then this has to be the root of your api server.  

  i.e. if you plan to run your api on a subdomain of your primary domain, you will 
  configure it as:
  https://reactory.acme.com/

  The graphql api will be running and available at the https://reactory.acme.com/api 
  endpoint.
`));

          return { next: serverConfigQuestions(rl).required.api_uri_root, configuration };
        }

        configuration.api_uri_root = response;
        return { next: serverConfigQuestions(rl).required.cdn_root, configuration };
      },
    },
    cdn_root: {
      question: `Provide the url which will match your Content Delivery Network url for the server. (default: http://localhost:${DEFAULT_SERVER_CONFIG.port}/cdn/)`,
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          DEFAULT_SERVER_CONFIG.cdn_root = `http://localhost:${configuration.port}/cdn/`
          return { next: serverConfigQuestions(rl).required.secret_key, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The CDN_ROOT value is the root of your server CDN. If you are running it on your 
  local machine for development the value should be http://localhost:${DEFAULT_SERVER_CONFIG.port}/cdn/

  if you are running on your production / test or envinments which require internet
  access, then this has to be the root of your api server with a matching.

  i.e. if you plan to run your api on a subdomain of your primary domain, you will 
  configure it as:
  https://reactory.acme.com/cdn/
  
`));

          return { next: serverConfigQuestions(rl).required.cdn_root, configuration };
        }

        configuration.api_uri_root = response;
        return { next: serverConfigQuestions(rl).required.secret_key, configuration };
      }

    },
    secret_key: {
      question: 'Provide a secret key for your JWT tokens / login session key generation',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {          
          configuration.secret_key = strongRandom()

          return { next: serverConfigQuestions(rl).required.log_level, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The secret key is a used during the authorization process for a user.
  This should be a unique difficult to guess pass key.  This pass key should
  be updated and changed every few weeks / months.

  If you leave this blank, the server will generate a random key for you.
`));

          return { next: serverConfigQuestions(rl).required.secret_key, configuration };

        }

        configuration.secret_key = response;

        return { next: serverConfigQuestions(rl).required.log_level, configuration };
      }

    },
    log_level: {
      question: 'What level would you like to set the logging at?',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          DEFAULT_SERVER_CONFIG.log_level = `debug`

          return { next: serverConfigQuestions(rl).required.mongo_user, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  The log level is the level of logging that will be output to the console.
  Logs are built in windsor and can be found in the logs folder. The log levels
  that are available are:
  * debug
  * info
  * warning
  * error
`));

          return { next: serverConfigQuestions(rl).required.log_level, configuration };

        }

        DEFAULT_SERVER_CONFIG.log_level = response;
        return { next: serverConfigQuestions(rl).required.mongo_user, configuration };
      }

    },
    mongo_user: {
      question: 'Mongo database username',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.mongo_user = `reactorycore`

          return { next: serverConfigQuestions(rl).required.mongo_password, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

          return { next: serverConfigQuestions(rl).required.mongo_user, configuration };

        }

        configuration.mongo_user = response;

        return { next: serverConfigQuestions(rl).required.mongo_password, configuration };
      }

    },
    mongo_password: {
      question: 'Mongo database password',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.mongo_password = `reactorycore`

          return { next: serverConfigQuestions(rl).required.mongoose_connection, configuration };
        }


        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

          return { next: serverConfigQuestions(rl).required.mongo_password, configuration };

        }

        configuration.mongo_password = response;


        return { next: serverConfigQuestions(rl).required.mongoose_connection, configuration };
      }

    },
    mongoose_connection: {
      question: 'Mongo db connection string',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.mongoose_connection = `mongodb://localhost:27017/${configuration.name}-local-reactory`;

          return { next: serverConfigQuestions(rl).required.oauth_app_id, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the full mongo url (without username and password) that
  represents the connection to your database.

  If you leave it blank the default will be set to

  mongodb://localhost:27017/${configuration.name}-local-reactory
            `));

          return { next: serverConfigQuestions(rl).required.mongoose_connection, configuration };

        }

        return { next: serverConfigQuestions(rl).required.oauth_app_id, configuration };
      }

    },
    oauth_app_id: {
      question: 'Provide your MS OAUTH APP ID if you want to enable MS authentication',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_app_id = null
          persistServerConfiguration(configuration, configuration.environment, rl);
          return { next: null, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth App ID that you have registered with Microsoft.
  This is required if you want to enable MS authentication.
  To register an app with Microsoft, go to https://apps.dev.microsoft.com.
  
  If you leave it blank, the server will not enable MS authentication and the 
  reset of the oauth questions will be skipped.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_app_id, configuration };

        }

        configuration.oauth_app_id = response;

        return { next: serverConfigQuestions(rl).required.oauth_app_password, configuration };
      }

    },
    oauth_app_password: {
      question: 'Provide your MS OAUTH APP password',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_app_password = `<insert oauth password>`

          return { next: serverConfigQuestions(rl).required.oauth_redirect_uri, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth App password that you have registered with Microsoft.
  If you leave it blank, the server will not enable MS authentication and the
  reset of the oauth questions will be skipped.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_app_password, configuration };

        }

        configuration.oauth_app_password = response;

        return { next: serverConfigQuestions(rl).required.oauth_redirect_uri, configuration };
      }

    },
    oauth_redirect_uri: {
      question: 'Provide your oauth redirect uri',
      handler: (response: string, configuration: IServerConfiguration) => {


        if (response.length === 0) {
          configuration.oauth_redirect_uri = `http;//localhost:${configuration.port}/auth/microsoft/openid/complete/${configuration.name}`

          return { next: serverConfigQuestions(rl).required.oauth_scopes, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth redirect uri that you have registered with Microsoft. 
  This is required if you want to enable MS authentication.

  If you leave it blank, a default will be applied for a localhost development environment.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_redirect_uri, configuration };

        }

        return { next: serverConfigQuestions(rl).required.oauth_scopes, configuration };
      }

    },
    oauth_scopes: {
      question: 'Provide your oauth scopes',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_scopes = `profile offline_access user.read calendars.read mail.read email`

          return { next: serverConfigQuestions(rl).required.oauth_authority, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth scopes that you have registered with Microsoft.
  This is required if you want to enable MS authentication.

  If you leave it blank, a default scopes will be applied.

  defaults: profile offline_access user.read calendars.read mail.read email
            `));

          return { next: serverConfigQuestions(rl).required.oauth_scopes, configuration };

        }

        return { next: serverConfigQuestions(rl).required.oauth_authority, configuration };
      }

    },
    oauth_authority: {
      question: 'Provide the oath authority; default is https://login.microsoftonline.com/common',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_authority = 'https://login.microsoftonline.com/common'

          return { next: serverConfigQuestions(rl).required.oauth_id_metadata, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth authority that you have registered with Microsoft.
  The default is https://login.microsoftonline.com/common and should not
  be changed unless you know what you are doing.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_authority, configuration };

        }

        configuration.oauth_authority = response;

        return { next: serverConfigQuestions(rl).required.oauth_id_metadata, configuration };
      }

    },
    oauth_id_metadata: {
      question: 'Provide the oauth id meta data: default is /v2.0/.well-known/openid-configuration',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_id_metadata = `/v2.0/.well-known/openid-configuration`

          return { next: serverConfigQuestions(rl).required.oauth_authorize_endpoint, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth id meta data that you have registered with Microsoft.
  The default is /v2.0/.well-known/openid-configuration and should not
  be changed unless you know what you are doing.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_id_metadata, configuration };

        }

        return { next: serverConfigQuestions(rl).required.oauth_authorize_endpoint, configuration };
      }

    },
    oauth_authorize_endpoint: {
      question: 'Provide the oauth endpoint: default is /oauth2/v2.0/authorize',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_authorize_endpoint = '/oauth2/v2.0/authorize'

          return { next: serverConfigQuestions(rl).required.oauth_token_endpoint, configuration };
        }


        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth authorize endpoint that you have registered with Microsoft.
  the default is /oauth2/v2.0/authorize and should not be changed unless you
  know what you are doing.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_authorize_endpoint, configuration };

        }

        return { next: serverConfigQuestions(rl).required.oauth_token_endpoint, configuration };
      }

    },
    oauth_token_endpoint: {
      question: 'Provide the oauth token endpoint; default is /oauth2/v2.0/token',
      handler: (response: string, configuration: IServerConfiguration) => {

        if (response.length === 0) {
          configuration.oauth_token_endpoint = '/oauth2/v2.0/token';
          persistServerConfiguration(configuration, configuration.environment, rl);

          return { next: null, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`  
  Provide the OAuth token endpoint that you have registered with Microsoft.
  the default is /oauth2/v2.0/token and should not be changed unless you
  know what you are doing.
            `));

          return { next: serverConfigQuestions(rl).required.oauth_authorize_endpoint, configuration };

        }

        configuration.oauth_token_endpoint = response;
        return persistServerConfiguration(configuration, configuration.environment, rl, next || { next: null, configuration });
      }
    }
  },
});