export enum UIFrameWork {
  material = 'material',
  bootstrap = 'bootstrap',
  office = 'office',
  blueprint = 'blueprint'
}

export enum TemplateType { 
  email = 'email', 
  widget = 'widget', 
  page ='page', 
  css = 'css', 
  layout = 'layout', 
  content = 'content', 
  pdf = 'pdf' 
}

export interface ReactoryEnvironment {
  NODE_PATH: string
  NODE_ENV: string
  APP_DATA_ROOT: string
  MONGOOSE: string
  WORKFLOW_MONGO: string
  API_PORT: number
  SENDGRID_API_KEY: string
  API_URI_ROOT: string
  API_GRAPHQL_URI: string 
  CDN_ROOT: string
  MODE: string
  LOG_LEVEL: string
  OAUTH_APP_ID: string
  OAUTH_APP_PASSWORD: string
  OAUTH_REDIRECT_URI: string
  OAUTH_SCOPES: string
  OAUTH_AUTHORITY: string
  OAUTH_ID_METADATA: string
  OAUTH_AUTHORIZE_ENDPOINT: string
  OAUTH_TOKEN_ENDPOINT: string
};

export const ENVIRONMENT : ReactoryEnvironment = {  
    NODE_PATH: process.env.NODE_PATH || '.',
    NODE_ENV: process.env.NODE_ENV || 'development',
    APP_DATA_ROOT: process.env.APP_DATA_ROOT,    
    MONGOOSE: process.env.MONGOOSE,
    WORKFLOW_MONGO: process.env.WORKFLOW_MONGO,
    API_PORT: parseInt(`${process.env.API_PORT||4001}`),
    SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    API_URI_ROOT: process.env.API_URI_ROOT,
    API_GRAPHQL_URI: `${process.env.API_URI_ROOT}/api`, 
    CDN_ROOT: process.env.CDN_ROOT,
    MODE: process.env.MODE,
    LOG_LEVEL: process.env.LOG_LEVEL,
    OAUTH_APP_ID: process.env.OAUTH_APP_ID,
    OAUTH_APP_PASSWORD: process.env.OAUTH_APP_PASSWORD,
    OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI,
    OAUTH_SCOPES: process.env.OAUTH_SCOPES,
    OAUTH_AUTHORITY: process.env.OAUTH_AUTHORITY,
    OAUTH_ID_METADATA: process.env.OAUTH_ID_METADATA,
    OAUTH_AUTHORIZE_ENDPOINT: process.env.OAUTH_AUTHORIZE_ENDPOINT,
    OAUTH_TOKEN_ENDPOINT: process.env.OAUTH_TOKEN_ENDPOINT,
};