module.exports = {
  apps: [{
    name: 'ReactoryApi',
    script: './server.js',
    env: {
      NODE_ENV: 'development',
      APP_DATA_ROOT: '/mnt/d/data/reactory',
      LEGACY_APP_DATA_ROOT: '/mnt/d/data',
      MONGOOSE: 'mongodb://localhost:27017/reactory',
      API_PORT: 4000,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      API_URI_ROOT: 'http://locahost:4000/',
      CDN_ROOT: 'http://localhost:4000/cdn/',
      MODE: 'DEVELOP',
      LOG_LEVEL: 'info',
    },
    env_production: {
      APP_DATA_ROOT: '/data/reactory',
      LEGACY_APP_DATA_ROOT: '/data/legacy',
      MONGOOSE: 'mongodb://localhost:27017/reactory',
      API_PORT: 4000,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      API_URI_ROOT: 'https://api.reactory.net/',
      CDN_ROOT: 'https://api.reactory.net/cdn/',
      MODE: 'PRODUCTION',
    },
  }],
};
