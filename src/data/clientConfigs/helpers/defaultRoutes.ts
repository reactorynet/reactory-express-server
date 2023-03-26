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

export const resetpasswordroute = {
  id: '2',
  key: 'reset-password',
  title: 'Reset',
  path: '/reset-password',
  public: false,
  exact: true,
  roles: ['USER'],
  componentFqn: 'core.ResetPassword@1.0.0',
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
