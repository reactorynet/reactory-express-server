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
    componentType: 'div',
    container: 'div',
    style: {
      textAlign: 'center',
      border: 'none'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      route: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
  ],
  'ui:grid-options': {
    container: 'div',
    containerStyle: {
      textAlign: 'center'
    }
  },
  route: {
    'ui:widget': 'LinkFieldWidget',
    'ui:options': {
      showLabel: false,
      fullWidth: false,
      format: '${formData}/${formContext.api.CLIENT_KEY}?x-client-key=${formContext.api.CLIENT_KEY}&x-client-pwd=${formContext.api.CLIENT_PWD}', //eslint-disable-line
      title: 'Login With Microsoft O365',
      name: 'office-365-login-button',
      id: 'reactory-security::office-365-login-button',
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
    route: `${API_URI_ROOT}auth/microsoft/openid/start`,
  },
};
