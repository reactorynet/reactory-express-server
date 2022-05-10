import { profileSmall } from '../helpers/menus';

import themes from './themes';
import settings from './settings';
import routes from './routes';

import Reactory from '@reactory/reactory-core'

const { CDN_ROOT, MODE, NODE_ENV } = process.env;

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


const REACTORY_CONFIG: Reactory.Server.IReactoryClientConfig = {
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
      email: 'werner.weber@gmail.com', roles: ['SYS-ADMIN', 'ADMIN', 'USER', 'DEVELOPER'], firstName: 'Werner', lastName: 'Weber',
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
  routes,
  theme: 'reactory',  
  themes,
  plugins: [],
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