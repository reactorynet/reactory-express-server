let whitelist: string[] = []

const {
  API_URI_ROOT,
  REACTORY_APP_WHITELIST,
  REACTORY_SITE_URL,
  REACTORY_NATIVEAPP_URI,
  MODE = 'development',
} = process.env as Reactory.Server.ReactoryEnvironment;

if(REACTORY_APP_WHITELIST) {
  whitelist = REACTORY_APP_WHITELIST.split(',');
} else {
  //default behavior
  if(MODE.toLowerCase() === 'development') {
    whitelist = [
      API_URI_ROOT,
      REACTORY_SITE_URL || 'http://localhost:3000',
      REACTORY_NATIVEAPP_URI || 'reactorynative://',
    ]
  }
  else {
    whitelist = [
      API_URI_ROOT,
      REACTORY_SITE_URL || 'https://app.reactory.net',
      REACTORY_NATIVEAPP_URI || 'reactorynative://',
    ]
  }
}

export default whitelist;