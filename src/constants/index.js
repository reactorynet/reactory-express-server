
const {
  NODE_ENV,
  APP_DATA_ROOT,
  MONGOOSE,
  API_PORT,
  SENDGRID_API_KEY,
  API_URI_ROOT,
  CDN_ROOT,
  MODE,
  LOG_LEVEL,
} = process.env;


export default {
  SETTING_KEYS: {
    NEW_USER_ROLES: 'new_user_roles',
  },
  env: {
    NODE_ENV: NODE_ENV || 'development',
    APP_DATA_ROOT: APP_DATA_ROOT || '/data/reactory',
    MONGOOSE: MONGOOSE || 'mongodb://localhost:27017/reactory',
    API_PORT: API_PORT || 4000,
    SENDGRID_API_KEY: SENDGRID_API_KEY || process.env.SENDGRID_API_KEY,
    API_URI_ROOT: API_URI_ROOT || 'http://locahost:4000/',
    CDN_ROOT: CDN_ROOT || 'http://localhost:4000/cdn/',
    MODE: MODE || 'DEVELOP',
    LOG_LEVEL: LOG_LEVEL || 'debug',
  },
};
