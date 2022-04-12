import { profileSmall } from '../helpers/menus';

import themes from './themes';
import settings from './settings';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from '../helpers/defaultRoutes';
import { Reactory } from 'types/reactory';

const { CDN_ROOT, MODE } = process.env;

const staticContentMappings = [
  {
    key: 'about',
    title: 'About Reactory',
    path: '/about/*',
    public: true,
    exact: true,
    roles: ['USER', 'ANON'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'about',
        }
      }
    ]
  },
  {
    key: 'whats-new',
    title: 'What\'s new',
    path: '/whats-new/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'whats-new',
        }
      }
    ]
  },
  {
    key: 'how-to',
    title: 'How to',
    path: '/news/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'news',
        }
      }
    ]
  },
];


const REACTORY_CONFIG: Reactory.IReactoryClientConfig = {
  key: 'reactory',
  name: 'Reactory Admin Application',
  username: 'reactory',
  email: 'machine@reactory.net',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.reactory.net/',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/reactory/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  users: [
    {
      email: 'werner.weber@gmail.com', roles: ['ADMIN', 'USER', 'DEVELOPER'], firstName: 'Werner', lastName: 'Weber',
    },
  ],
  billingType: 'partner',
  components: [],
  menus: [
    profileSmall,
    {
      name: 'Main',
      key: 'left-nav',
      target: 'left-nav',
      roles: ['USER'],
      entries: [
        {
          ordinal: 1, title: 'My Applications', link: '/', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Reactory Clients', link: '/reactory-clients/', icon: 'check_circle', roles: ['SYS-ADMIN'],
        },
        {
          ordinal: 3, title: 'About Reactory', link: '/about/', icon: 'supervised_user_circle', roles: ['ANON', 'USER'],
        },
        {
          ordinal: 4, title: 'Add Content', link: '/content-capture/new', icon: 'create', roles: ['ADMIN', 'USER'],
        },
        {
          ordinal: 4, title: 'List Content', link: '/content-list/', icon: 'list', roles: ['ADMIN', 'USER'],
        },
      ],
    },
  ],
  routes: [
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
      componentFqn: 'reactory.Dashboard@1.0.0',
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
      componentFqn: 'core.Profile@1.0.0',
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
      path: '/graphiql/**',
      exact: true,
      public: true,
      roles: ['ADMIN'],
      componentFqn: 'core.ReactoryGraphiQLExplorer@1.0.0'
    },
  ],
  theme: 'reactory',  
  themes,
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'LOCAL',
      enabled: true,
    },
    {
      provider: 'FACEBOOK',
      enabled: false,
    },
    {
      provider: 'GOOGLE',
      enabled: false,
    },
  ],
  settings,
  whitelist: [
    'localhost',
    'app.reactory.net',
    'reactory.net',
  ],
};


staticContentMappings.forEach((mapping) => {
  REACTORY_CONFIG.routes.push({
    ...mapping,
    componentFqn: 'core.StaticContent@1.0.0'
  });
});

export default REACTORY_CONFIG;