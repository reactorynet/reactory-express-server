'use strict'
import Reactory from '@reactory/reactory-core';

/**
 * Basic Login Form. Used for 3rd party authentication
 * Author: Werner Weber
 */
const LoginForm: Reactory.Forms.IReactoryForm = {
  id: 'LoginForm',
  uiFramework: 'material',
  name: 'LoginForm',
  nameSpace: 'forms',
  version: '1.0.0',
  registerAsComponent: true,
  uiSupport: ['material'],
  uiResources: [],
  title: 'Login',
  tags: ['login', 'user account'],
  schema: {
    title: 'Login',
    description: '',
    type: 'object',
    required: [
      'email',
      'password',
    ],
    properties: {
      baseUrl: {
        type: 'string',
        title: 'Site Base',
        default: '',
      },
      clientId: {
        type: 'string',
        title: 'Client Id',
        default: 'masonwabe',
      },
      email: {
        type: 'string',
        format: 'email',
        title: 'Email',
      },
      password: {
        type: 'string',
        format: 'password',
        title: 'Password',
      },
    },
  },
  uiSchema: {
    submitIcon: 'lock',

    email: {
      className: 'login-form-email',
    },

    password: {
      className: 'login-form-password',
    },
  },
};

export default LoginForm;
