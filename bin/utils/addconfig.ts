'use strict';
import fs from 'fs';
import readline from 'readline';
import colors from 'colors/safe';



// set theme
colors.setTheme({
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red'
});

export interface IConfigurationProperties {
  name: string,
  environments?: string[],
  server_id?: string,
  system_user_id?: string,
  app_data_root?: string,
  modules_enabled?: string,

  port: number,
  sendgrid_api_key: string,
  api_uri_root: string,
  cdn_root: string,
  secret_key: string,
  log_level: string,

  mongo_user: string,
  mongo_password: string,
  mongoose_connection: string,

  oauth_app_id: string,
  oauth_app_password: string,
  oauth_redirect_uri: string,
  oauth_scopes: string,

  oauth_authority: string,
  oauth_id_metadata: string,
  oauth_authorize_endpoint: string,
  oauth_token_endpoint: string
  [key: string | symbol]: unknown
};

export interface QuestionHandlerResponse {
  next: IQuestion | null,
  configuration: IConfigurationProperties
}

export interface IQuestion {
  id?: number,
  question: string,
  response?: string,
  valid?: boolean,
  handler: (response: string, configuration: IConfigurationProperties) => QuestionHandlerResponse
}

export interface IQuestionGroup {
  [key: string | symbol]: IQuestion,
}

export interface IQuestionCollection {
  [key: string | symbol]: IQuestionGroup
}


const addConfiguration = (props: IConfigurationProperties) => {
  const {
    name,
    environments,
    system_user_id,
    app_data_root,
    modules_enabled,

    port,
    sendgrid_api_key,
    api_uri_root,
    cdn_root,
    secret_key,
    log_level,

    mongo_user = 'reactory',
    mongo_password = 'reactory',
    mongoose_connection = 'mongodb://localhost:27017/reactory-local',

    oauth_app_id,
    oauth_app_password,
    oauth_redirect_uri = 'http://localhost:4000/auth/microsoft/openid/complete',
    oauth_scopes = "profile offline_access user.read calendars.read mail.read email",

    oauth_authority = 'https://login.microsoftonline.com/common',
    oauth_id_metadata = '/v2.0/.well-known/openid-configuration',
    oauth_authorize_endpoint = '/oauth2/v2.0/authorize',
    oauth_token_endpoint = '/oauth2/v2.0/token'

  } = props;


  const folder = `/config/${name}/`;

}


const main = (kwargs: string[]) => {


  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${kwargs[1]}\n`
  });


  const conf: IConfigurationProperties = {
    name: '',
    api_uri_root: '',
    cdn_root: '',
    server_id: 'local',
    log_level: 'debug',
    mongo_password: 'password',
    mongo_user: 'mongouser',
    mongoose_connection: '',
    oauth_app_id: '',
    oauth_app_password: '',
    oauth_authority: '',
    oauth_authorize_endpoint: '',
    oauth_id_metadata: '',
    oauth_redirect_uri: '',
    oauth_scopes: '',
    oauth_token_endpoint: '',
    port: 4000,
    secret_key: 'secret',
    sendgrid_api_key: '',
    app_data_root: '',
    environments: ['develop', 'qa', 'production'],
    modules_enabled: `enabled-${kwargs[2]}`,
    system_user_id: ``,
  }

  rl.prompt(true);


  rl.write(colors.yellow(`
+---------------------------------------------------------------------------+
| Welcome to the reactory configuration helper utility. This utility will   |\r
| walk you through creating a configuration file set to run a reactory      |\r
| server instance.  For more help on each question, respond with ? to get   |\r
| more help on the impact of each configuration entry.                      |\r
|                                                                           |\r
|                 !!This tool is still under development!!                  |\r
+---------------------------------------------------------------------------+
`));

  const isHelpRequest = (response: string) => isHelpRequest(response)

  const persistConfiguration = ($configuration: IConfigurationProperties) => {
    rl.write(`
    Configuration written to file\r
    ${JSON.stringify($configuration, null, 2)}\r
    `);
    rl.close();
  };


  const ask = (question: IQuestion, $configuration: IConfigurationProperties) => {

    rl.question(`|\r${colors.yellow('+--[reactory]:: ')}${colors.green(`${question.question}`)} >`, ($response: string) => {
      let { next, configuration } = question.handler($response, $configuration);
      if (next) {
        ask(next, configuration);
      } else {
        persistConfiguration(configuration);
      }
    });

  }

  let questions: IQuestionCollection = null;

  const configure_another: IQuestion = {
    question: 'Would you like to create another configuration? (y/n)',
    handler: (response: string, configuration) => {
      persistConfiguration(configuration);
      if (response === 'n') {
        return null;
      }

      return { next: questions.required.name, configuration }
    }
  }


  questions = {
    required: {
      name: {
        question: 'What is the name for this configuration?',
        response: null,
        valid: false,
        handler: (response: string, configuration: IConfigurationProperties) => {
          if (response.charCodeAt(0) === 27) {
            rl.write(colors.red('\nConfiguration name is a required field\n'));
            return { next: questions.required.name, configuration };
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

            return { next: questions.required.name, configuration };
          }

          configuration.name = response;
          return { next: questions.required.environments, configuration };
        },
      },
      environments: {
        question: 'Which environments would you like to provision for? (comma seperated list default "local,dev,prod")',
        response: null,
        valid: false,
        handler: (response: string = 'local,dev,prod', configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.environments = ['local', 'dev', 'prod'];
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The environment names will be used to create .env.<environment> files.
  These files are used to start your reactory server and load environment
  variables into the node process.env list.  When starting the server
  using "bin/start.sh ${conf.name} local", the server will load the 
  corresponding dotenv file from the config directory.
  The default value is "local,dev,prod".  This means the utility
  will generate 3 .env files in the follow folder. Where 
  <reactory-server>/  <-- Your root install folder
    + /config/
    +--> /${conf.name}/
      +--> /.env.local
      +--> /.env.dev
      +--> /.env.prod
  If you want to know more about dotenv you can view the package
  on npm here: https://www.npmjs.com/package/dotenv
`));
            return {
              next: questions.required.environments,
              configuration: configuration
            };
          }

          if (response.indexOf(',') > 0) {
            configuration.environments = response.split(',');
          } else {
            configuration.environments = [response];
          }

          return { next: questions.required.system_user_id, configuration };
        }
      },
      system_user_id: {
        question: 'Provide an email address that will be used for the system account. i.e. reactory_admin@acme.com',
        handler: (response: string, configuration: IConfigurationProperties) => {
          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The system user id, should be an email address that you can 
  access.  The system will use this address to send alert
  or configured notifications to that email address.  
`));
            return { next: questions.required.system_user_id, configuration };
          }

          return { next: questions.required.app_data_root, configuration };
        }
      },
      server_id: {
        question: 'Provide a server id that can be used to identify the server a client is a connected to. i.e. acme_reactor_uk',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.server_id = `${configuration.name}-local`;
          }

          return { next: questions.required.app_data_root, configuration };
        }

      },
      app_data_root: {
        question: 'Provide the location of your data root folder? default (/var/reactory/data)',
        handler: (response: string, configuration: IConfigurationProperties) => {
          if (response.charCodeAt(0) === 27) {
            configuration.app_data_root = `/var/reactory/data`;
          }
          if (isHelpRequest(response)) {

            rl.write(colors.grey(`  
  This is the base folder where the reactory server stores,
  processes and uploads data.  These folders may be local or network
  mapped drives.  
`));

            return { next: questions.required.app_data_root, configuration };
          }

          configuration.app_data_root = response;

          return { next: questions.required.modules_enabled, configuration };
        }
      },
      modules_enabled: {
        question: `What is the name of the modules enabled file you want to load? (default: enabled-${conf.name})`,
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            conf.modules_enabled = `enabled-${configuration.name}`;

            return { next: questions.required.port, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  This is the name of the json file that will contain the list of modules that will 
  be used to create the src/modules/__index.ts file.
  The default is enabled-${conf.name}.
  When the server starts, first bin/generate.sh is called.  This executes a script
  that will emit the __index.ts file. The module index file. The script will use the
  MODULES_ENABLED environment variable to look for a json file that matches it.  
  i.e. if your MODULES_ENABLED environment variable is enabled-${conf.name}, there has
  to be a src/modules/enabled-${conf.name}.json file on your file system.
  If the file does not exist, one will be clone from the available.json file.
`));

            return { next: questions.required.modules_enabled, configuration };
          }

          configuration.modules_enabled = response;

          return { next: questions.required.app_data_root, configuration };
        }
      },


      port: {
        question: 'What port number would you like to run the server on. (default 4000)',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.port = 4000;

            return { next: questions.required.sendgrid_api_key, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The TCP port number the server must use.  The default is 4000.
  If you want configure the reactory server in a cluster you
  will need to copy and paste your config dotenv file and use
  the appropriate command line argument to specify the config
  file to load.
`));

            return { next: questions.required.port, configuration };
          }

          configuration.port = parseInt(response, 10);

          return { next: questions.required.sendgrid_api_key, configuration };
        }
      },

      sendgrid_api_key: {
        question: 'Provide a send grid api key to enable send grid mail integration.',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.sendgrid_api_key = 'SG.disabled';

            return { next: questions.required.api_uri_root, configuration };
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


          return { next: questions.required.api_uri_root, configuration };
        }

      },

      api_uri_root: {
        question: 'Provide an API uri root. Ensure it has protocol and correct port default: http://localhost:4000/ >> ',
        response: null,
        valid: false,
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.api_uri_root = `http://localhost:${conf.port}/`

            return { next: questions.required.cdn_root, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The API_URI_ROOT value is the root of your server. If you are running it on your 
  local machine for development the value should be http://localhost:${conf.port}/

  if you are running on your production / test or envinments which require internet
  access, then this has to be the root of your api server.  

  i.e. if you plan to run your api on a subdomain of your primary domain, you will 
  configure it as:
  https://reactory.acme.com/

  The graphql api will be running and available at the https://reactory.acme.com/api 
  endpoint.
`));

            return { next: questions.required.api_uri_root, configuration };
          }

          configuration.api_uri_root = response;
          return { next: questions.required.cdn_root, configuration };
        },
      },

      cdn_root: {
        question: 'Provide the url which will match your Content Delivery Network url for the server.',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            conf.cdn_root = `http://localhost:${configuration.port}/cdn/`

            return { next: questions.required.secret_key, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The CDN_ROOT value is the root of your server CDN. If you are running it on your 
  local machine for development the value should be http://localhost:${conf.port}/cdn/

  if you are running on your production / test or envinments which require internet
  access, then this has to be the root of your api server with a matching.

  i.e. if you plan to run your api on a subdomain of your primary domain, you will 
  configure it as:
  https://reactory.acme.com/cdn/
  
`));

            return { next: questions.required.cdn_root, configuration };
          }

          configuration.api_uri_root = response;
          return { next: questions.required.secret_key, configuration };
        }

      },

      secret_key: {
        question: 'Provide a secret key for your JWT tokens / login session key generation',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.secret_key = `xxxxxxxxxxx`

            return { next: questions.required.log_level, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The secret key is a used during the authorization process for a user.
  This should be a unique difficult to guess pass key.  This pass key should
  be updated and changed every few weeks / months.
`));

            return { next: questions.required.secret_key, configuration };

          }

          configuration.secret_key = response;

          return { next: questions.required.log_level, configuration };
        }

      },

      log_level: {
        question: 'What level would you like to set the logging at?',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            conf.log_level = `debug`

            return { next: questions.required.mongo_user, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  The secret key is a used during the authorization process for a user.
  This should be a unique difficult to guess pass key.  This pass key should
  be updated and changed every few weeks / months.
`));

            return { next: questions.required.log_level, configuration };

          }

          conf.log_level = response;
          return { next: questions.required.mongo_user, configuration };
        }

      },

      mongo_user: {
        question: 'Mongo database username',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.mongo_user = `reactorycore`

            return { next: questions.required.mongo_password, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

            return { next: questions.required.mongo_user, configuration };

          }

          configuration.mongo_user = response;

          return { next: questions.required.mongo_password, configuration };
        }

      },
      mongo_password: {
        question: 'Mongo database password',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.mongo_password = `reactorycore`

            return { next: questions.required.mongoose_connection, configuration };
          }


          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

            return { next: questions.required.mongo_password, configuration };

          }

          configuration.mongo_password = response;


          return { next: questions.required.mongoose_connection, configuration };
        }

      },
      mongoose_connection: {
        question: 'Mongo db connection string',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.mongoose_connection = `mongodb://localhost:27017/${configuration.name}-local-reactory`;

            return { next: questions.required.oauth_app_id, configuration };
          }

          if (isHelpRequest(response)) {
            rl.write(colors.grey(`  
  Provide the full mongo url (without username and password) that
  represents the connection to your database.

  If you leave it blank the default will be set to

  mongodb://localhost:27017/${configuration.name}-local-reactory
            `));

            return { next: questions.required.mongoose_connection, configuration };

          }

          return { next: questions.required.oauth_app_id, configuration };
        }

      },

      oauth_app_id: {
        question: 'Provide your MS OAUTH APP ID if you want to enable MS authentication',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.mongo_password = `reactorycore`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_app_password, configuration };
        }

      },
      oauth_app_password: {
        question: 'Provide your MS OAUTH APP password',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.oauth_app_password = `<insert oauth password>`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_redirect_uri, configuration };
        }

      },
      oauth_redirect_uri: {
        question: 'Provide your oauth redirect uri',
        handler: (response: string, configuration: IConfigurationProperties) => {


          if (response.charCodeAt(0) === 27) {
            configuration.oauth_redirect_uri = `http;//localhost:${configuration.port}/auth/microsoft/openid/complete/${configuration.name}`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_scopes, configuration };
        }

      },
      oauth_scopes: {
        question: 'Provide your oauth scopes',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.oauth_scopes = `profile offline_access user.read calendars.read mail.read email`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_authority, configuration };
        }

      },

      oauth_authority: {
        question: 'Provide the oath authority',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.mongo_password = `reactorycore`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_id_metadata, configuration };
        }

      },
      oauth_id_metadata: {
        question: 'Provide the oauth id meta data',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.oauth_id_metadata = `/v2.0/.well-known/openid-configuration`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_authorize_endpoint, configuration };
        }

      },
      oauth_authorize_endpoint: {
        question: 'Provide the oauth endpoint',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: questions.required.oauth_token_endpoint, configuration };
        }

      },
      oauth_token_endpoint: {
        question: 'Provide the oauth token endpoint',
        handler: (response: string, configuration: IConfigurationProperties) => {

          if (response.charCodeAt(0) === 27) {
            configuration.oauth_token_endpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

            return { next: questions.required.mongoose_connection, configuration };
          }

          return { next: configure_another, configuration };
        }

      }
    },
  };


  /**
   * 
   *  name: string,
  node_env: string,
  environments?: string[],
  system_user_id?: string,
  app_data_root?: string,
  modules_enabled?: string,

  port: number,
  sendgrid_api_key: string,
  api_uri_root: string,
  cdn_root: string,
  secret_key: string,
  log_level: string,

  mongo_user: string,
  mongo_password: string,
  mongoose_connection: string,

  oauth_app_id: string,
  oauth_app_password: string,
  oauth_redirect_uri: string,
  oauth_scopes: string,

  oauth_authority: string,
  oauth_id_metadata: string,
  oauth_authorize_endpoint: string,
  oauth_token_endpoint: string
   * 
   */

  ask(questions.required.name, conf);

  rl.on('close', () => {
    console.log('Goodbye.')
  });
}

main(process.argv);