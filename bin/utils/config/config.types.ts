/**
 * The IClientConfiguration interface defines the properties that are
 * used to create the .env file for the client configuration.
 * 
 * Sample .env file:
 * @example
```bash
PORT=3000
PUBLIC_URL=http://localhost:3000/
REACT_APP_API_ENDPOINT=http://localhost:4000
REACT_APP_CDN=http://localhost:4000/cdn
REACT_APP_TITLE='Reactory'
REACT_APP_THEME=reactory
REACT_APP_CLIENT_KEY=reactory
REACT_APP_SHORTNAME=Reactory
REACT_APP_CLIENT_PASSWORD=hbelLE5g7T4xlJUWzajIprVt3tT2X62j
REACT_APP_THEME_PRIMARY=#1a2049
REACT_APP_THEME_BG=#464775
REACT_APP_WEBROOT=/var/reactory/reactory-cdn/html
REACT_APP_FROALA_KEY=FroalaKey
NODE_ENV=development
BABEL_ENV=development
CI=false
```
 */
export interface IClientConfiguration {
  name: string,
  environment: string,
  port: number,
  public_url: string,
  api_endpoint: string,
  cdn: string,
  title: string,
  theme: string,
  client_key: string,
  shortname: string,
  client_password: string,
  theme_primary: string,
  theme_bg: string,
  webroot: string,
  froala_key: string,
  node_env: string,
  babel_env: string,
  ci: boolean
}

export interface IServerConfiguration {
  name: string,
  environment: string,
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

export type ReactoryConfiguration = IServerConfiguration | IClientConfiguration | Reactory.Models.IReactoryClient;

export interface QuestionHandlerResponse {
  next: IQuestion | null,
  configuration: ReactoryConfiguration
}

export interface IQuestion {
  id?: number,
  question: string,
  response?: string,
  valid?: boolean,
  handler: (response: string, configuration: ReactoryConfiguration) => QuestionHandlerResponse
}

export interface IQuestionGroup {
  [key: string | symbol]: IQuestion,
}

export interface IQuestionCollection {
  [key: string | symbol]: IQuestionGroup
}
