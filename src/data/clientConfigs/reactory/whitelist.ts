let whitelist: string[] = [
  'https://apex.reactory.net',
  'http://apex.reactory.net',
];

const {
  API_URI_ROOT,
  REACTORY_APP_WHITELIST,
  REACTORY_SITE_URL,
  REACTORY_NATIVEAPP_URI,
  MODE = 'development',
} = process.env as Reactory.Server.ReactoryEnvironment;

if(REACTORY_APP_WHITELIST) {
  whitelist = [...whitelist, ...REACTORY_APP_WHITELIST.split(',')];
} else {
  //default behavior
  if(MODE.toLowerCase() === 'development') {
    whitelist = [
      ...whitelist,
      API_URI_ROOT,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://localhost:3003',
      REACTORY_NATIVEAPP_URI || 'reactorynative://',
    ]
  }
  else {
    whitelist = [
      ...whitelist,
      API_URI_ROOT,
      REACTORY_SITE_URL || 'https://app.reactory.net',
      REACTORY_NATIVEAPP_URI || 'reactorynative://',
    ]
  }
}

export default whitelist;