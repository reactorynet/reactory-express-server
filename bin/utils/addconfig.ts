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
};

export interface IQuestion {
  id?: number,
  question: string,
  response?: string,
  valid?: boolean,
  handler: (response: string, configuration: IConfigurationProperties) => { next: IQuestion | null, configuration: IConfigurationProperties }
}

export interface IQuestionGroup {
  [key: string]: IQuestion,
}

export interface IQuestionCollection {
  [key: string]: IQuestionGroup
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
    mongo_password: process.env.MONGO_USER,
    mongo_user: process.env.MONGO_USER,
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
            return questions.required.name;
          }

          if (response === '?') {
            rl.write(colors.gray(`
  The configuration name, would be a short concise name that describes
  the name of the application api, i.e. if you are building a shop front 
  api, then a name might be <brand name>-shop, or just shop.\n 
  A brand name can be thought of the abbreviation for your business or 
  corporation.\nThis can be useful if you intend to run multiple configurations from a 
  single source base.\ni.e.\nacme-shop, acme-sales, acme-warehouse, acme-hr etc.
  `));

            return questions.required.name;
          }

          conf.name = response;
          return questions.required.environments;
        },
      },
      environments: {
        question: 'Which environments would you like to provision for? (comma seperated list default "local,dev,prod")',
        response: null,
        valid: false,
        handler: (response: string = 'local,dev,prod') => {

          if (response.charCodeAt(0) === 27) {
            conf.environments = ['local', 'dev', 'prod'];
          }

          if (response === '?') {
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
            return questions.required.environments;
          }

          if (response.indexOf(',') > 0) {
            conf.environments = response.split(',');
          } else {
            conf.environments = [response];
          }

          return questions.required.system_user_id;
        }
      },
      system_user_id: {
        question: 'Provide an email address that will be used for the system account. i.e. reactory_admin@acme.com',
        handler: (response: string) => {



          if (response === "?") {
            rl.write(colors.grey(`  
  The system user id, should be an email address that you can 
  access.  The system will use this address to send alert
  or configured notifications to that email address.  
`));
            return questions.required.system_user_id
          }

          return questions.required.app_data_root;
        }
      },
      server_id: {
        question: 'Provide a server id that can be used to identify the server a client is a connected to. i.e. acme_reactor_uk',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.server_id = `${conf.name}-local`;
          }

          return questions.required.app_data_root;
        }

      },
      app_data_root: {
        question: 'Provide the location of your data root folder? default (/var/reactory/data)',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.app_data_root = `/var/reactory/data`;
          }

          if (response === '?') {

            rl.write(colors.grey(`  
  This is the base folder where the reactory server stores,
  processes and uploads data.  These folders may be local or network
  mapped drives.  
`));

            return questions.required.app_data_root;
          }

          return questions.required.modules_enabled;
        }
      },
      modules_enabled: {
        question: `What is the name of the modules enabled file you want to load? (default: enabled-${conf.name})`,
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.modules_enabled = `enabled-${conf.name}`;

            return questions.required.port;
          }

          if (response === "?") {
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

            return questions.required.modules_enabled;
          }

          conf.modules_enabled = response;

          return questions.required.app_data_root;
        }
      },


      port: {
        question: 'What port number would you like to run the server on. (default 4000)',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.port = 4000;

            return questions.required.sendgrid_api_key;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  The TCP port number the server must use.  The default is 4000.
  If you want configure the reactory server in a cluster you
  will need to copy and paste your config dotenv file and use
  the appropriate command line argument to specify the config
  file to load.
`));

            return questions.required.port;
          }

          conf.port = parseInt(response);

          return questions.required.sendgrid_api_key;
        }
      },

      sendgrid_api_key: {
        question: 'Provide a send grid api key to enable send grid mail integration.',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.sendgrid_api_key = 'SG.disabled';

            return questions.required.api_uri_root;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  If you want to use the default sendgrid email service, then you will need to provide
  your own sendgrid API key.

  You can leave it blank and sendgrid integration will be disabled.

  For more on getting an API key from sendgrid, go here:
  https://sendgrid.com/
`));
          }

          conf.sendgrid_api_key = response;


          return questions.required.api_uri_root;
        }

      },

      api_uri_root: {
        question: 'Provide an API uri root. Ensure it has protocol and correct port default: http://localhost:4000/ >> ',
        response: null,
        valid: false,
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.api_uri_root = `http://localhost:${conf.port}/`

            return questions.required.cdn_root;
          }

          if (response === "?") {
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

            return questions.required.api_uri_root;
          }

          conf.api_uri_root = response;
          return questions.required.cdn_root
        },
      },

      cdn_root: {
        question: 'Provide the url which will match your Content Delivery Network url for the server.',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.cdn_root = `http://localhost:${conf.port}/cdn/`

            return questions.required.secret_key;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  The CDN_ROOT value is the root of your server CDN. If you are running it on your 
  local machine for development the value should be http://localhost:${conf.port}/cdn/

  if you are running on your production / test or envinments which require internet
  access, then this has to be the root of your api server with a matching.

  i.e. if you plan to run your api on a subdomain of your primary domain, you will 
  configure it as:
  https://reactory.acme.com/cdn/
  
`));

            return questions.required.cdn_root;
          }

          conf.api_uri_root = response;
          return questions.required.secret_key;
        }

      },

      secret_key: {
        question: 'Provide a secret key for your JWT tokens / login session key generation',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.secret_key = `xxxxxxxxxxx`

            return questions.required.log_level;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  The secret key is a used during the authorization process for a user.
  This should be a unique difficult to guess pass key.  This pass key should
  be updated and changed every few weeks / months.
`));

            return questions.required.secret_key;

          }

          conf.secret_key = response;

          return questions.required.log_level;
        }

      },

      log_level: {
        question: 'What level would you like to set the logging at?',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.log_level = `debug`

            return questions.required.mongo_user;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  The secret key is a used during the authorization process for a user.
  This should be a unique difficult to guess pass key.  This pass key should
  be updated and changed every few weeks / months.
`));

            return questions.required.log_level;

          }

          conf.log_level = response;
          return questions.required.mongo_user;
        }

      },

      mongo_user: {
        question: 'Mongo database username',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_user = `reactorycore`

            return questions.required.mongo_password;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

            return questions.required.mongo_user;

          }

          conf.mongo_user = response;

          return questions.required.mongo_password;
        }

      },
      mongo_password: {
        question: 'Mongo database password',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }


          if (response === "?") {
            rl.write(colors.grey(`  
  Your mongo database should be protected with a username and password.  
  
  If you leave it blank, the default will be set to reactorycore.
            `));

            return questions.required.mongo_password;

          }

          conf.mongo_password = response;


          return questions.required.mongoose_connection;
        }

      },
      mongoose_connection: {
        question: 'Mongo db connection string',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongoose_connection = `mongodb://localhost:27017/${conf.name}-local-reactory`;

            return questions.required.oauth_app_id;
          }

          if (response === "?") {
            rl.write(colors.grey(`  
  Provide the full mongo url (without username and password) that
  represents the connection to your database.

  If you leave it blank the default will be set to

  mongodb://localhost:27017/${conf.name}-local-reactory
            `));

            return questions.required.mongoose_connection;

          }

          return questions.required.oauth_app_id;
        }

      },

      oauth_app_id: {
        question: 'Provide your MS OAUTH APP ID if you want to enable MS authentication',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_app_password;
        }

      },
      oauth_app_password: {
        question: 'Provide your MS OAUTH APP password',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_redirect_uri;
        }

      },
      oauth_redirect_uri: {
        question: 'Provide your oauth redirect uri',
        handler: (response: string) => {


          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_scopes;
        }

      },
      oauth_scopes: {
        question: 'Provide your oauth scopes',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_authority;
        }

      },

      oauth_authority: {
        question: 'Provide the oath authority',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_id_metadata;
        }

      },
      oauth_id_metadata: {
        question: 'Provide the oauth id meta data',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_authorize_endpoint;
        }

      },
      oauth_authorize_endpoint: {
        question: 'Provide the oauth endpoint',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return questions.required.oauth_token_endpoint;
        }

      },
      oauth_token_endpoint: {
        question: 'Provide the oauth token endpoint',
        handler: (response: string) => {

          if (response.charCodeAt(0) === 27) {
            conf.mongo_password = `reactorycore`

            return questions.required.mongoose_connection;
          }

          return configure_another
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

  ask(questions.required.name);



  rl.on('close', () => {
    console.log('Goodbye.')
  })


}

main(process.argv);

