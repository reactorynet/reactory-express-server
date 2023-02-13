import Reactory from '@reactory/reactory-core';
import {  
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,  
} from '@reactory/server-core/data/clientConfigs/helpers/defaultRoutes';

const routes: Reactory.Routing.IReactoryRoute[] = [
  {
    ...loginroute,    
    args: [
      {
        key: 'forgotEnabled',
        value: {
          type: 'bool',
          forgotEnabled: true,
        },
      },
      {
        key: 'magicLink',
        value: {
          type: 'bool',
          magicLink: true
        }
      },
      {
        key: 'authlist',
        value: {
          type: 'bool',
          authlist: [
            'local',
            'microsoft',
            'google',
            'facebook',
            'twitter',
            'linkedin'
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
    roles: ['USER'],
    componentFqn: 'reactory.MyApplications@1.0.0',
  },  
  {
    key: 'modules',
    title: 'Server Modules',
    path: '/reactory-server/*',
    public: false,
    exact: true,
    roles: ['SYS-ADMIN', 'ADMIN'],
    componentFqn: 'reactory.ServerModules@1.0.0',
  },
  {
    key: 'myapplications',
    title: 'Applications',
    path: '/applications/*',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: 'reactory.Applications@1.0.0',
  },
  {
    key: 'profile',
    title: 'Profile',
    path: '/profile',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.UserProfile@1.0.0',
    props: {
      withPeers: true,
      withMemberships: true, 
    },
  },

  {
    key: 'forms_with_mode_and_id',
    title: 'Form with mode and id',
    path: '/forms/:formId/:mode/:id/*',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
    args: [{
      key: "routePrefix",
      value: {
        routePrefix: "forms"
      }
    }],
    exact: false,    
  },

  {
    key: 'forms_with_mode',
    title: 'Form with mode',
    path: '/forms/:formId/:mode',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
    args: [{
      key: "routePrefix",
      value: {
        routePrefix: "forms"
      }
    }],
  },

  {
    key: 'forms_with_id',
    title: 'Form',
    path: '/forms/:formId',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
    args: [{
      key: "routePrefix",
      value: {
        routePrefix: "forms"
      }
    }],
  },

  {
    key: 'forms',
    title: 'Reactory Forms',
    path: '/forms/*',
    public: false,
    roles: ['USER'],
    componentFqn: 'core.ReactoryRouter@1.0.0',
    args: [{
      key: "routePrefix",
      value: {
        routePrefix: "forms"
      }
    }],
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
  
  {
    key: 'general-support',
    title: 'Support Request',
    path: '/support/request',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: 'core.SupportForm@1.0.0',
    args: [{
      key: "mode",
      value: {
        type: "string",
        mode: "new"
      }
    }]
  },

  {
    key: 'my-support-tickets',
    title: 'My Open Tickets',
    path: '/support/open',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: 'core.SupportTickets@1.0.0',
    args: [
      {
        key: 'variant',
        value: {
          type: 'string',
          variant: 'logged_in_user'
        }
      }
    ]
  },
]

export default routes;