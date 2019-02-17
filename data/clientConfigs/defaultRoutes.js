export default [
  {
    id: '0',
    key: 'login',
    title: 'Login',
    path: '/login',
    public: true,
    roles: ['ANON'],
    componentFqn: 'core.Login@1.0.0',
  },
  {
    id: '1',
    key: 'forgot-password',
    title: 'Forgot',
    path: '/forgot',
    public: true,
    roles: ['ANON'],
    componentFqn: 'core.ForgotPassword@1.0.0',
  },
  {
    id: '2',
    key: 'reset-password',
    title: 'Reset',
    path: '/reset-password',
    public: false,
    exact: false,
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
    id: '99',
    key: 'logout',
    title: 'Logout',
    path: '/forms',
    public: true,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
  },
];
