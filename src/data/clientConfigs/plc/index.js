import {
  profileSmall,
  towerStoneMenuDef,
} from '../helpers/menus';

import systemRoutes, { loginroute, resetpasswordroute, forgotpasswordroute, logoutroute } from '../helpers/defaultRoutes';


const { CDN_ROOT, MODE } = process.env;

const key = 'plc';

export default {
  key,
  name: 'The Purposeful Leadership Company',
  username: 'plc',
  email: 'plc@towerstone-global.com',
  salt: 'generate',
  password: process.env.REACTORY_APPLICATION_PASSWORD_PLC,
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.purposefulleadershipcompany.com',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON'],
  billingType: 'partner',
  components: [
    {
      nameSpace: 'plc',
      name: 'Dashboard',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['USER'],
      arguments: [],
      resources: [],
    },
  ],
  menus: [
    profileSmall,
    towerStoneMenuDef,
  ],
  routes: [
    {
      ...loginroute,
      args: [
        ...loginroute.args,
        {
          key: 'style',
          value: {
            type: 'object',
            style: {
              marginTop: '10px',
            },
          },
        },
      ],
    },
    logoutroute,
    resetpasswordroute,
    forgotpasswordroute,
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: 'towerstone.Dashboard@1.0.0',
      args: [
        {
          key: 'variant',
          value: {
            type: 'string',
            variant: 'plc',
          },
        },
      ],
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },
    {
      key: 'surveys',
      title: 'Surveys',
      path: '/surveys/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Surveys@1.0.0',
      componentProps: {
        minimal: false,
      },
      args: {
        key: 'minimal',
        value: {
          minimal: false,
        },
      },
    },
    {
      key: 'assessment',
      title: 'Surveys',
      path: '/assess/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Assessment@1.0.0',
    },
    /* {
      key: 'reports',
      title: 'Reports',
      path: '/reports/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'towerstone.Report@1.0.0',
    },
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Task@1.0.0',
      args: {
        key: 'lanes',
        value: [
          {
            status: 'new', title: 'New', icon: 'star_border', color: 'inherit',
          },
          {
            status: 'in-progress', title: 'In Progress', icon: 'star_half', color: 'inherit',
          },
          {
            status: 'completed', title: 'Completed', icon: 'star', color: 'inherit',
          },
          {
            status: 'overdue', title: 'Overdue', icon: 'excalmation', color: 'inherit',
          },
        ],
      },
    }, */
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile/**',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withPeers: true,
      },
    },
    {
      key: 'reactoryrouter',
      title: 'Reactory Forms',
      path: '/reactory/**',
      exact: false,
      public: false,
      roles: ['ADMIN', 'DEVELOPER'],
      componentFqn: 'core.ReactoryRouter',
      args: [
        {
          key: 'routePrefix',
          value: {
            type: 'string',
            routePrefix: '/reactory'
          },
        }
      ]
    },
    {
      key: 'administration',
      title: 'Administration',
      path: '/admin/**',
      exact: true,
      public: false,
      roles: ['ADMIN'],
      componentFqn: 'core.Administration@1.0.0',
    },
    {
      key: 'content-list',
      title: 'Content List',
      path: '/static-content/',
      public: false,
      exact: true,
      roles: ['USER', 'ADMIN', 'DEVELOPER'],
      componentFqn: 'static.ContentList@1.0.0',
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
      key: 'graphiql',
      title: 'GraphiQL',
      path: '/graphiql/**',
      exact: true,
      public: false,
      roles: ['ADMIN', 'DEVELOPER'],
      componentFqn: 'core.ReactoryGraphiQLExplorer@1.0.0'
    },
    {
      key: 'content-capture',
      title: 'Content Capture',
      path: '/static-content/edit/:slug/*',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN', 'DEVELOPER'],
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
  ],
  theme: 'plc',
  themeOptions: {
    key,
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#3C6598',
      primary: {
        light: '#6d92c9',
        main: '#3c6598',
        dark: '#003b6a',
        contrastText: '#fff',
      },
      secondary: {
        light: '#6d92c9',
        main: '#3c6598',
        dark: '#003b6a',
        contrastText: '#fff',
      },
      report: {
        empty: '#6d92c9',
        fill: '#3C6598',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/stairs.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      feplmodel: `${CDN_ROOT}themes/${key}/images/feplinfo.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.ico`,
      emailLogo: 'http://www.purposefulleadershipcompany.com/wp-content/uploads/2017/03/logo.png',
    },
    content: {
      appTitle: 'The Purposeful Leadership Company',
      login: {
        message: 'Each one of us has only one precious life',
      },
    },
  },
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
  settings: [
    {
      name: 'new_user_roles',
      componentFqn: 'core.Setting@1.0.0',
      formSchema: {
        type: 'string',
        title: 'Default User Role',
        description: 'The default user role to assign to a new user',
      },
      data: ['USER'],
    },
    {
      name: 'email_redirect/DEVELOP',
      data: {
        email: 'werner.weber+plcredirect@gmail.com',
        enabled: true,
      },
    },
    {
      name: 'email_redirect/PRODUCTION',
      data: {
        email: 'werner.weber+plcredirect@gmail.com',
        enabled: false,
      },
    },
    {
      name: 'login_partner_keys',
      data: {
        partner_keys: ['plc', 'towerstone', 'mores', 'thinklead', 'reactory'],
        defaultAction: 'add_default_membership',
        organization_excludes: [],
        organization_includes: [],
      },
    }
  ],
  whitelist: [
    'localhost',
    'plc.reactory.net',
    'app.purposefulleadershipcompany.com',
  ],
};
