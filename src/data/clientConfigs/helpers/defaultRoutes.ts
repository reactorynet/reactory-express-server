export const loginroute = {
  id: '0',
  key: 'login',
  title: 'Login',
  path: '/login',
  public: true,
  roles: ['ANON'],
  componentFqn: 'core.Login@1.0.0',
  args: [
    {
      key: 'magicLink',
      value: {
        type: 'bool',
        magicLink: true,
      },
    },
  ],
};

export const registerRoute = {
  id: '5',
  key: 'register',
  title: 'Register',
  path: '/register',
  public: true,
  roles: ['ANON'],
  componentFqn: 'core.Register@1.0.0',
};


export const forgotpasswordroute = {
  id: '1',
  key: 'forgot-password',
  title: 'Forgot',
  path: '/forgot',
  public: true,
  roles: ['ANON'],
  componentFqn: 'core.ForgotPassword@1.0.0',
  args: [
    {
      key: 'magicLink',
      value: {
        type: 'bool',
        magicLink: false,
      },
    },
  ],
};

/**
 * The password reset form.
 *
 * `public` and the `ANON` role are load-bearing, not cosmetic: someone using a
 * reset link is by definition not signed in, so a USER-only route made the emailed
 * link a dead end even once the server endpoint existed. The token in the query
 * string is the authorisation; the route itself needs none.
 */
export const resetpasswordroute = {
  id: '2',
  key: 'reset-password',
  title: 'Reset',
  path: '/reset-password',
  public: true,
  exact: true,
  roles: ['ANON', 'USER'],
  componentFqn: 'core.ResetPassword@1.0.0',
};

/**
 * Communicator email-template editor.
 *
 * Deliberately NOT in the default array below: the communicator is a platform
 * module, and a client that has not adopted it should not carry a dead route.
 * Clients opt in by spreading this export into their own routes.
 *
 * Gated on the template roles rather than `USER`. The server enforces the same
 * gates on the query, so the route gate only prevents an operator from landing on
 * a screen that answers 403.
 */
export const communicatortemplatesroute = {
  id: '6',
  key: 'communicator-templates',
  title: 'Email Templates',
  path: '/communicator/templates',
  public: false,
  exact: true,
  roles: [
    'COMMUNICATOR_TEMPLATE_VIEW',
    'COMMUNICATOR_TEMPLATE_ADMIN',
    'ADMIN',
  ],
  componentFqn: 'communicator.EmailTemplates@1.0.0',
};

export const logoutroute = {
  id: '3',
  key: 'logout',
  title: 'Logout',
  path: '/logout',
  public: true,
  roles: ['USER'],
  componentFqn: 'core.Logout@1.0.0',
};

export const sendlinkroute = {
  id: '4',
  key: 'send-link',
  title: 'Send Link',
  path: '/send-link',
  public: true,
  roles: ['ANON'],
  componentFqn: 'core.ForgotPassword@1.0.0',
  args: [
    {
      key: 'magicLink',
      value: {
        type: 'bool',
        magicLink: true,
      },
    },
  ],
};

export const notfoundroute = {
  id: '98',
  key: 'notauthorized',
  title: 'No Permission',
  path: '/not-authorized',
  public: true,
  roles: ['USER', 'ANON'],
  componentFqn: 'core.NotFound@1.0.0',
  args: {
    message: 'You do not have permission to view this section',
  },
};

export const formsroute = {
  id: '99',
  key: 'forms',
  title: 'Custom Forms',
  path: '/forms',
  public: true,
  roles: ['USER'],
  componentFqn: 'core.ReactoryRouter@1.0.0',
};

export const presetSimple = [
  loginroute,
  forgotpasswordroute,
  resetpasswordroute,
];

export const presetMicrosoftLoginOnly = [
  {
    ...loginroute,
    args: [
      {
        key: 'forgotEnabled',
        value: {
          type: 'bool',
          forgotEnabled: false,
        },
      },
      {
        key: 'authlist',
        value: {
          type: 'bool',
          authlist: [
            'microsoft',
          ],
        },
      },
    ],
  },
];

export default [
  loginroute,
  forgotpasswordroute,
  resetpasswordroute,
  sendlinkroute,
  logoutroute,
  notfoundroute,
  formsroute,
];
