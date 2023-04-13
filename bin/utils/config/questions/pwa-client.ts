import { ReadLine } from 'readline';
import { IQuestionCollection, IClientConfiguration, QuestionHandlerResponse } from '../config.types';
import { isHelpRequest, colors, persistClientConfiguration } from '../helpers';

export const DEFAULT_CLIENT_CONFIG: IClientConfiguration = {
  name: 'reactory',
  environment: 'local',
  api_endpoint: 'http://localhost:4000',
  cdn: 'http://localhost:4000/cdn',
  client_key: "reactory",
  client_password: "reactory",
  port: 3000,
  shortname: 'Reactory',
  theme: 'reactory',
  public_url: 'http://localhost:3000',
  title: 'Reactory',
  webroot: '/var/www/reactory',
  theme_primary: '#1a2049',
  theme_bg: '#464775',
  babel_env: 'development',
  node_env: 'development',
  ci: false,
  froala_key: 'disabled',
}

export const clientConfigQuestions = (rl: ReadLine, next?: QuestionHandlerResponse) => ({
  required: {
    name: {
      question: `Provide a name for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.name}'`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.environment, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
  Provide a name for your client configuration. This is required. 
  The name is used to create the correct folder structure
  in your reactory-client project.
            `));

          return { next: clientConfigQuestions(rl).required.name, configuration };
        }

        configuration.name = response;
        return { next: clientConfigQuestions(rl).required.environment, configuration };
      }
    },
    environment: {
      question: `Provide the environment for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.environment}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.port, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the environment for your client configuration. This is required.
            If you don't know what to put here, just hit enter and the default will
            be used.
            `));
          return { next: clientConfigQuestions(rl).required.environment, configuration };
        }

        configuration.environment = response;
        return { next: clientConfigQuestions(rl).required.port, configuration };
      }
    },
    port: {
      question: `Provide the port for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.port}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.public_url, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the port for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default
            port 3000 will be used.
            `));

          return { next: clientConfigQuestions(rl).required.port, configuration };
        }

        configuration.port = parseInt(response);
        return { next: clientConfigQuestions(rl).required.public_url, configuration };
      }
    },
    public_url: {
      question: `Provide the public url for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.public_url}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.api_endpoint, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the public url for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            default is ${DEFAULT_CLIENT_CONFIG.public_url}
            `));

          return { next: clientConfigQuestions(rl).required.public_url, configuration };
        }

        configuration.public_url = response;
        return { next: clientConfigQuestions(rl).required.api_endpoint, configuration };
      }
    },
    api_endpoint: {
      question: `Provide the api endpoint for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.api_endpoint}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.cdn, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the api endpoint for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            default: ${DEFAULT_CLIENT_CONFIG.api_endpoint}
            `));

          return { next: clientConfigQuestions(rl).required.api_endpoint, configuration };
        }

        configuration.api_endpoint = response;
        return { next: clientConfigQuestions(rl).required.cdn, configuration };
      }
    },
    cdn: {
      question: `Provide the cdn for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.cdn}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.title, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the cdn for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));

          return { next: clientConfigQuestions(rl).required.cdn, configuration };
        }

        configuration.cdn = response;
        return { next: clientConfigQuestions(rl).required.title, configuration };
      }
    },
    title: {
      question: `Provide the title for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.title}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.theme, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the title for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));
        }

        configuration.title = response;
        return { next: clientConfigQuestions(rl).required.theme, configuration };
      }
    },
    theme: {
      question: `Provide the theme for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.theme}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.client_key, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the theme for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));
        }

        configuration.theme = response;
        return { next: clientConfigQuestions(rl).required.client_key, configuration };
      }
    },
    client_key: {
      question: `Provide the client key for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.client_key}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          configuration.client_key = DEFAULT_CLIENT_CONFIG.client_key;
          return { next: clientConfigQuestions(rl).required.client_password, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the client key for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));
          
          return { next: clientConfigQuestions(rl).required.client_key, configuration };
        }

        configuration.client_key = response;
        return { next: clientConfigQuestions(rl).required.client_password, configuration };
      }
    },
    client_password: {
      question: `Provide the client password for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.client_password}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.shortname, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the client password for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.

            Note, your password will be stored in plain text in the configuration file. So
            ensure that you don't commit this file to source control. Also the password is 
            set on the server side, so if you change it here, you will need to change it on
            the server as well.

            When generating a new client configuration and you generated the server configuration
            then the password provided there will be used to set the password for the client.
            `));
          
          return { next: clientConfigQuestions(rl).required.client_password, configuration };
        }

        configuration.client_password = response;
        return { next: clientConfigQuestions(rl).required.shortname, configuration };
      }
    },
    shortname: {
      question: `Provide the shortname for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.shortname}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.theme_primary, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the shortname for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));

            return { next: clientConfigQuestions(rl).required.shortname, configuration };
        }

        configuration.shortname = response;
        return { next: clientConfigQuestions(rl).required.theme_primary, configuration };
      }
    },
    theme_primary: {
      question: `Provide the theme primary for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.theme_primary}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.theme_bg, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the theme primary for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));

          return { next: clientConfigQuestions(rl).required.theme_primary, configuration };
        }

        configuration.theme_primary = response;
        return { next: clientConfigQuestions(rl).required.theme_bg, configuration };
      }
    },
    theme_bg: {
      question: `Provide the theme background color for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.theme_bg}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.webroot, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the theme background color for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));
          
          return { next: clientConfigQuestions(rl).required.theme_bg, configuration };
        }

        configuration.theme_bg = response;
        return { next: clientConfigQuestions(rl).required.webroot, configuration };
      }
    },
    webroot: {
      question: `Provide the webroot for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.webroot}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.froala_key, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the webroot for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));
        }

        configuration.webroot = response;
        return { next: clientConfigQuestions(rl).required.froala_key, configuration };
      }
    },
    froala_key: {
      question: `Provide the froala key for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.froala_key}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.node_env, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the froala key for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));

          return { next: clientConfigQuestions(rl).required.froala_key, configuration };
        }

        configuration.froala_key = response;
        return { next: clientConfigQuestions(rl).required.node_env, configuration };
      }
    },
    node_env: {
      question: `Provide the node environment for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.node_env}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          return { next: clientConfigQuestions(rl).required.babel_env, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the node environment for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.

            NB. This must match one of the browserslist environments in your package.json, 
            generally this is development or production.
            `));

          return { next: clientConfigQuestions(rl).required.node_env, configuration };
        }

        configuration.node_env = response;
        return { next: clientConfigQuestions(rl).required.babel_env, configuration };
      }
    },
    babel_env: {
      question: `Provide the babel environment for your client configuration: default is ${DEFAULT_CLIENT_CONFIG.babel_env}`,
      handler: (response: string, configuration: IClientConfiguration) => {
        if (response.length === 0) {
          configuration.babel_env = DEFAULT_CLIENT_CONFIG.babel_env;
          persistClientConfiguration(configuration, configuration.environment, rl);
          return { next: null, configuration };
        }

        if (isHelpRequest(response)) {
          rl.write(colors.grey(`
            Provide the babel environment for your client configuration. This is required. 
            If you don't know what to put here, just hit enter and the default will be used.
            `));

          return { next: clientConfigQuestions(rl).required.babel_env, configuration };
        }

        configuration.babel_env = response;
        return persistClientConfiguration(configuration, configuration.environment, rl, next || { next: null, configuration });        
      }
    }
  }
});