export default [
  {
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
          magicLink: false,
        },
      },
    ],
  },
  {
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
  },
  {
    id: '2',
    key: 'reset-password',
    title: 'Reset',
    path: '/reset-password',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: 'core.ResetPassword@1.0.0',
  },
  {
    id: '3',
    key: 'logout',
    title: 'Logout',
    path: '/logout',
    public: true,
    roles: ['USER'],
    componentFqn: 'core.Logout@1.0.0',
  },
  {
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
  },
  {
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
  },
  {
    id: '99',
    key: 'forms',
    title: 'Custom Forms',
    path: '/forms',
    public: true,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
  },
];