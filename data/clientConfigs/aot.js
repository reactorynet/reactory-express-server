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
  avatar: `${CDN_ROOT}themes/aot/images/avatar.jpg`,
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
    towerStoneMenuDef,
  ],
  routes: [
    ...systemRoutes,
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
      title: 'Reports',
      path: '/reports',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'aot.ReportComponent@1.0.0',
    },
    {
      key: 'tasks',
      title: 'Tasks',
      path: '/tasks',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.TaskList@1.0.0',
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
  whitelist: [
    'localhost',
    'aot.reactory.net',
    'app.ageofteams.com',
  ],
};
