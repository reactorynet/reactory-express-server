import dotenv from 'dotenv';
import {
  profileSmall,
  towerStoneMenuDef,
} from '../menus';
import systemRoutes from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE } = process.env;


export default {
  key: 'aot',
  name: 'Age Of Teams',
  username: 'aotadmin',
  email: 'developer@ageofteams.com',
  salt: 'generate',
  password: 'XXXXXXXXXXXXX',
  siteUrl: MODE === 'DEVELOP' ? 'http://localhost:3000' : 'https://app.ageofteams.com',
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/aot/images/avatar.png`,
  applicationRoles: ['USER', 'ADMIN', 'ANON', 'LEADER'], // USER => Team Member, ADMIN => Team Leader + Billing, LEADER => Team Leader
  billingType: 'partner',
  components: [
    {
      nameSpace: 'aot',
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
    {
      nameSpace: 'aot',
      name: 'AnalitcsDashboard',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['ADMIN'],
      arguments: [],
      resources: [],
    },
    {
      nameSpace: 'aot',
      name: 'Administration',
      version: '1.0.0',
      title: 'Administration For Age of Teams',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['ADMIN'],
      arguments: [],
      resources: [],
    },
  ],
  menus: [
    profileSmall,
    {
      name: 'Main',
      key: 'left-nav',
      target: 'left-nav',
      roles: ['USER'],
      entries: [
        {
          ordinal: 0, title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER'],
        },
        {
          ordinal: 2, title: 'Surveys', link: '/surveys/', icon: 'check_circle', roles: ['USER'],
        },
        {
          ordinal: 3, title: 'My Analytics', link: '/analytics/user/', icon: 'insert_chart', roles: ['USER'],
        },
        {
          ordinal: 4, title: 'Team Analytics', link: '/analytics/team/', icon: 'insert_chart_outlined', roles: ['LEADER', 'ADMIN'],
        },
        {
          ordinal: 1, title: 'Due Today', link: '/tasks/today/', icon: 'autorenew', roles: ['USER'],
        },
        {
          ordinal: 6, title: 'My Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
        },
        {
          ordinal: 7, title: 'Admin', link: '/admin/', icon: 'supervisor_account', roles: ['ADMIN'],
        },
        {
          ordinal: 99, title: 'Inbox', link: '/inbox/', icon: 'email', roles: ['USER'],
        },
      ],
    },
  ],
  routes: [
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
          key: 'withRegister',
          value: {
            type: 'boolean',
            withRegister: true,
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
    },
    {
      id: '2',
      key: 'reset-password',
      title: 'Reset',
      path: '/reset-password',
      public: true,
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
      id: '3',
      key: 'logout',
      title: 'Register',
      path: '/register',
      public: true,
      roles: ['ANON'],
      componentFqn: 'core.Register@1.0.0',
    },
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: 'aot.Dashboard@1.0.0',
    },
    {
      key: 'inbox',
      title: 'Inbox',
      path: '/inbox',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
    },
    {
      key: 'reports',
      title: 'Team Analytics',
      path: '/analytics',
      exact: false,
      public: false,
      roles: ['LEADER', 'ADMIN'],
      componentFqn: 'aot.AnalyticsDashboard@1.0.0',
      args: [
        {
          key: 'userMode',
          value: {
            type: 'string',
            userMode: 'team',
          },
        },
      ],
    },
    {
      key: 'reports',
      title: 'My Analytics',
      path: '/my-analytics/',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'aot.AnalyticsDashboard@1.0.0',
      args: [
        {
          key: 'userMode',
          value: {
            type: 'string',
            userMode: 'user',
          },
        },
      ],
    },
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.TaskList@1.0.0',
    },
    {
      key: 'profile',
      title: 'My Profile',
      path: '/profile',
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      args: [
        {
          key: 'withPeers',
          value: {
            type: 'bool',
            withPeers: true,
          },
        },
        {
          key: 'profileTitle',
          value: {
            type: 'string',
            profileTitle: 'My Custom Title',
          },
        },
      ],
    },
    {
      key: 'admin',
      title: 'admin',
      path: '/admin',
      public: false,
      roles: ['ADMIN', 'LEADER'],
      exact: false,
      componentFqn: 'core.Administration@1.0.0',
    },
  ],
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#464775',
      primary: {
        light: '#90d5f2',
        main: '#5da4bf',
        dark: '#464775', // #0F5d6b
        contrastText: '#FFFFFF',
      },
      secondary: {
        light: '#F3F2F1',
        main: '#4b3659',
        dark: '#221030',
        contrastText: '#fff',
      },
      report: {
        empty: '#F7BFBA',
        fill: '#990033',
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/aot/images/aot_icon.png`,
      logo: `${CDN_ROOT}themes/aot/images/aot_logo.png`,
      favicon: `${CDN_ROOT}themes/aot/images/favicon.ico`,
    },
    content: {
      appTitle: 'Age of Teams',
      login: {
        message: 'igniting digital products',
      },
    },
    navigation: {
      sidebarLeft: false,
      sidebarLeftComponent: null,
    },
  },
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
  ],
  whitelist: [
    'localhost',
    'aot.reactory.net',
    'app.ageofteams.com',
  ],
};
