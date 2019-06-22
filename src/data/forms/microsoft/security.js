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
  'ui:options': {
    showSubmit: false,
    showHelp: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      route: { md: 12 },
    },
  ],
  route: {
    'ui:widget': 'LinkFieldWidget',
    'ui:options': {
      format: '${formData}/${formContext.api.CLIENT_KEY}?x-client-key=${formContext.api.CLIENT_KEY}&x-client-pwd=${formContext.api.CLIENT_PWD}', //eslint-disable-line
      title: 'Login With Microsoft O365',
      icon: 'O365',
      iconType: 'reactory',
      iconProps: {
        color: 'primary',
        style: {
          marginLeft: '16px',
        },
      },
      userouter: false, // use browser navigator
    },
  },
};


export const MicrosoftOpenIDAuthenticationForm = {
  id: 'MicrosoftLogin',
  uiFramework: 'material',
  uiSupport: ['material', 'bootstrap'],
  uiResources: [],
  title: 'Microsoft O365 Authentication',
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
