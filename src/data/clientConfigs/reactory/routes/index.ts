import {  
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,  
} from '@reactory/server-core/data/clientConfigs/helpers/defaultRoutes';

const routes = [
  {
    ...loginroute,
    background: {
      image: 'default',
    },
    args: [
      {
        key: 'forgotEnabled',
        value: {
          type: 'bool',
          forgotEnabled: true,
        },
      },
      {
        key: 'authlist',
        value: {
          type: 'bool',
          authlist: [
            'local',
            'microsoft',
          ],
        },
      },
    ],
  },
  logoutroute,
  forgotpasswordroute,
  resetpasswordroute,
  logoutroute,
  {
    key: 'home',
    title: 'Home',
    path: '/',
    public: false,
    exact: true,
    roles: ['SYS-ADMIN'],
    componentFqn: 'reactory.ReactoryNewForm@1.0.0',
  },
  {
    key: 'inbox',
    title: 'Inbox',
    path: '/inbox',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: 'core.InboxComponent@1.0.0',
  },
  {
    key: 'clients',
    title: 'Reactory Clients',
    path: '/reactory-clients/*',
    public: false,
    exact: true,
    roles: ['SYS-ADMIN'],
    componentFqn: 'reactory.Clients@1.0.0',
  },
  {
    key: 'clients',
    title: 'My Applications',
    path: '/applications/*',
    public: false,
    exact: true,
    roles: ['ADMIN'],
    componentFqn: 'reactory.Applications@1.0.0',
  },
  {
    key: 'tasks',
    title: 'Tasks',
    path: '/tasks',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.Task@1.0.0',
  },
  {
    key: 'profile',
    title: 'Profile',
    path: '/profile',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.UserProfile@1.0.0',
  },
  {
    key: 'content-capture',
    title: 'Content Capture',
    path: '/content-capture/edit/:slug/',
    public: false,
    exact: false,
    roles: ['ADMIN'],
    componentFqn: 'static.ContentCapture@1.0.0',
    args: [
      {
        key: 'mode',
        value: {
          type: 'string',
          mode: 'edit',
        }
      }
    ]
  },
  {
    key: 'content-capture-new',
    title: 'Content Capture',
    path: '/content-capture/new',
    public: false,
    exact: true,
    roles: ['ADMIN'],
    componentFqn: 'static.ContentCapture@1.0.0',
    args: [
      {
        key: 'mode',
        value: {
          type: 'string',
          mode: 'new',
        }
      }
    ]
  },
  {
    key: 'content-list',
    title: 'Content List',
    path: '/content-list/',
    public: false,
    exact: true,
    roles: ['ADMIN'],
    componentFqn: 'static.ContentList@1.0.0',

  },
  {
    key: 'graphiql',
    title: 'GraphiQL',
    path: '/graphiql/*',
    exact: true,
    public: true,
    roles: ['ADMIN'],
    componentFqn: 'core.ReactoryGraphiQLExplorer@1.0.0'
  },
]

export default routes;