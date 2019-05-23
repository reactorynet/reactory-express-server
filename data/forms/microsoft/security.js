const { API_URI_ROOT } = process.env;

export const MicrosoftOpenIDAuthentication = {
  type: 'object',
  description: '',
  title: '',
  required: [],
  properties: {
    route: {
      type: 'string',
      title: 'Signin Route',
    },
  },
};

export const MicrosoftOpenIDAuthenticationUISchema = {
  submitIcon: 'lock',
  'ui:options': {
    showSubmit: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      route: { md: 12 },
    },
  ],
  route: {
    'ui:widget': 'LinkField',
    'ui:options': {
      format: '${formData}/${formContext.api.CLIENT_KEY}?x-client-key=${formContext.api.CLIENT_KEY}&x-client-pwd=${formContext.api.CLIENT_PWD}', //eslint-disable-line
      title: 'Login With Microsoft',
      icon: 'security',
      userouter: false, // use browser navigator
    },
  },
};


export const MicrosoftOpenIDAuthenticationForm = {
  id: 'MicrosoftLogin',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: '',
  tags: ['Authentication', 'Login', 'OpenId', 'Microsoft'],
  schema: MicrosoftOpenIDAuthentication,
  registerAsComponent: true,
  name: 'MicrosoftLogin',
  nameSpace: 'microsoft',
  version: '1.0.0',
  helpTopics: ['microsoft-0365-login'],
  uiSchema: MicrosoftOpenIDAuthenticationUISchema,
  defaultFormValue: {
    route: `${API_URI_ROOT}/auth/microsoft/openid`,
  },
};
