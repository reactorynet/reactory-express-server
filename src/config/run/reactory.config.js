/**
 * env-cmd -f ./config/.env.production npx nodemon --exec npx babel-node ./src/server.ts --presets @babel/env --max_old_space_size=2000000
 */
module.exports = {
  apps: [{
    name: 'ReactoryApi',
    script: 'src/server.ts',
    kill_timeout: 3000,
    listen_timeout: 10000,
    max_memory_restart: '2G',
    interpreter: './node_modules/.bin/babel-node',
    node_args: '--presets @babel/env',
    watch: true,
    env_development: {
      NODE_PATH: '.',
      NODE_ENV: 'development',
      APP_DATA_ROOT: '/mnt/d/data/reactory',
      LEGACY_APP_DATA_ROOT: '/mnt/d/data',
      MONGOOSE: 'mongodb://localhost:27017/reactory',
      WORKFLOW_MONGO: 'mongodb://localhost:27017/reactory-workflow',
      API_PORT: 4000,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      API_URI_ROOT: 'http://locahost:4000',
      CDN_ROOT: 'http://localhost:4000/cdn/',
      MODE: 'DEVELOP',
      LOG_LEVEL: 'debug',
      OAUTH_APP_ID: '66763ec1-8ada-49a3-a0e3-17ff1e4a5cad', //'ac149de8-0529-48ac-9b4d-a950a73dfbab',
      OAUTH_APP_PASSWORD: 'X@m5[ftn2NR]s.7FmhQHSD0nem0Hv1-D', //'<OAUTH PASSWORD>',
      OAUTH_REDIRECT_URI: 'http://localhost:4000/auth/microsoft/openid/complete/reactory',
      OAUTH_SCOPES: 'profile user.read email',
      OAUTH_AUTHORITY: 'https://login.microsoftonline.com/common',
      OAUTH_ID_METADATA: '/v2.0/.well-known/openid-configuration',
      OAUTH_AUTHORIZE_ENDPOINT: '/oauth2/v2.0/authorize',
      OAUTH_TOKEN_ENDPOINT: '/oauth2/v2.0/token',
    },
    env_production: {
      NODE_PATH: '.',
      NODE_ENV: 'production',
      APP_DATA_ROOT: '/data/reactory',
      LEGACY_APP_DATA_ROOT: '/data/legacy',
      MONGOOSE: 'mongodb://localhost:27017/reactory',
      WORKFLOW_MONGO: 'mongodb://localhost:27017/reactory-workflow',
      API_PORT: 4000,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      API_URI_ROOT: 'https://api.reactory.net',
      CDN_ROOT: 'https://api.reactory.net/cdn/',
      MODE: 'PRODUCTION',
      LOG_LEVEL: 'info',
      OAUTH_APP_ID: '66763ec1-8ada-49a3-a0e3-17ff1e4a5cad', //'ac149de8-0529-48ac-9b4d-a950a73dfbab',
      OAUTH_APP_PASSWORD: 'X@m5[ftn2NR]s.7FmhQHSD0nem0Hv1-D', //'<OAUTH PASSWORD>',
      OAUTH_REDIRECT_URI: 'https://api.reactory.net/auth/microsoft/openid/complete',
      OAUTH_SCOPES: 'profile offline_access user.read calendars.read mail.read email',
      OAUTH_AUTHORITY: 'https://login.microsoftonline.com/common',
      OAUTH_ID_METADATA: '/v2.0/.well-known/openid-configuration',
      OAUTH_AUTHORIZE_ENDPOINT: '/oauth2/v2.0/authorize',
      OAUTH_TOKEN_ENDPOINT: '/oauth2/v2.0/token',
    },
    env_staging: {
      NODE_ENV: 'staging',
      APP_DATA_ROOT: '/data/reactory',
      LEGACY_APP_DATA_ROOT: '/data/legacy',
      MONGOOSE: 'mongodb://localhost:27017/reactory',
      WORKFLOW_MONGO: 'mongodb://localhost:27017/reactory-workflow',
      API_PORT: 4000,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      API_URI_ROOT: 'https://qa-api.reactory.net/',
      CDN_ROOT: 'https://qa-api.reactory.net/cdn/',
      MODE: 'PRODUCTION',
      LOG_LEVEL: 'info',
      OAUTH_APP_ID: '66763ec1-8ada-49a3-a0e3-17ff1e4a5cad', //'ac149de8-0529-48ac-9b4d-a950a73dfbab',
      OAUTH_APP_PASSWORD: 'X@m5[ftn2NR]s.7FmhQHSD0nem0Hv1-D', //'<OAUTH PASSWORD>',
      OAUTH_REDIRECT_URI: 'https://qa-api.reactory.net/auth/microsoft/openid/complete',
      OAUTH_SCOPES: 'profile offline_access user.read calendars.read mail.read email',
      OAUTH_AUTHORITY: 'https://login.microsoftonline.com/common',
      OAUTH_ID_METADATA: '/v2.0/.well-known/openid-configuration',
      OAUTH_AUTHORIZE_ENDPOINT: '/oauth2/v2.0/authorize',
      OAUTH_TOKEN_ENDPOINT: '/oauth2/v2.0/token',
    },
  }],
  deploy: {
    production: {
      user: 'root',
      host: ['api.reactory.net'],
      ref: 'origin/develop',
      repo: 'git@bitbucket.org:WernerWeber/assessor-api.git',
      path: '/var/reactory/api',
      ssh_options: ['IdentityFile=~/.ssh/reactory_bitbucket_key', 'StrictHostKeyChecking=no'],
      'post-deploy': 'pm2 start config/run/reactory.config.js',
      env: {
        NODE_ENV: 'production',
      },
      // 'pre-setup': "apt-get install git ; ls -la",
      // Post-setup commands or path to a script on the host machine
      // eg: placing configurations in the shared dir etc
      // 'post-setup': "ls -la",
      // pre-deploy action
      // 'pre-deploy-local': "echo 'This is a local executed command'",
      // post-deploy action
      'post-deploy': 'npm install',
    },
  },
};
