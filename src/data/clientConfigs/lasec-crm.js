import * as dotenv from 'dotenv';
import {
  profileSmall,
} from '../menus';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from './defaultRoutes';

dotenv.config();

const { CDN_ROOT, MODE, API_URI_ROOT, LASEC_360_URL = 'http://localhost:3001' } = process.env;

let siteUrl = '';// 'http://localhost:3000' : 'https://app.towerstone-global.com/';

switch (MODE) {
  case 'QA': {
    siteUrl = 'https://bapp.lasec.co.za';
    break;
  }
  case 'PRODUCTION': {
    siteUrl = 'https://app.lasec.co.za';
    break;
  }
  case 'DEVELOP':
  default: {
    siteUrl = 'http://localhost:3000';
    break;
  }
}

const key = 'lasec-crm';

const proxiedRoutes = [
  {  
    key: 'CrmClientsRoot',
    title: 'Clients',
    path: 'crm/customer-search'
  },
  {  
    key: 'CrmQuotesRoot',
    title: 'Quotes',
    path: 'crm/all-quotes',
  },
  {  
    key: 'CrmQuotesRoot',
    title: 'Quotes',
    path: 'crm/customer/**',
  },
  {
    key: 'CrmSalesOrders',
    title: 'Sales Orders',
    path: 'crm/sales-orders'
  },
  {
    key: 'CrmInvoices',
    title: 'Invoices',
    path: 'crm/invoices'
  },
  {
    key: 'CrmSalesHistory',
    title: 'Sales History',
    path: 'crm/sales-history'
  },
];

export default {
  key,
  name: 'Lasec 360 CRM',
  username: 'lasec',
  email: 'werner.weber+lasec-crm-admin@gmail.com',
  salt: 'generate',
  password: 'i5xJOVXIeZHB1NnAkh6fffHkJcV7HJDI',
  siteUrl,
  emailSendVia: 'sendgrid',
  emailApiKey: process.env.SENDGRID_API_KEY,
  resetEmailRoute: '/reset-password',
  avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
  applicationRoles: [
    'USER', 
    'ADMIN', 
    'ANON', 
    'DEVELOPER', 
    'CUSTOMER', 
    'SALES',
    'WAREHOUSE',
    'EXEC'
  ],
  billingType: 'partner',
  organization: [
    {
      name: 'Lasec (Pty) Ltd.', key: 'lasec',
    },
  ],
  users: [],
  components: [
    {
      nameSpace: key,
      name: 'Dashboard',
      version: '1.0.0',
      title: 'Dashboard',
      author: 'werner.weber+reactory-sysadmin@gmail.com',
      labels: [],
      uri: 'embed',
      roles: ['ADMIN', 'USER'],
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
          ordinal: 0, title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER', 'ADMIN'],
        },         
        {
          ordinal: 1, title: 'Sales', link: '/360/crm/sales-orders', icon: 'speaker', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, title: 'Customers', link: '/360/crm/customer-search', icon: 'supervisor_account', roles: ['USER', 'ADMIN'],
        },               
        {
          ordinal: 4, title: 'Quotes', link: '/360/crm/all-quotes', icon: 'shopping_cart', roles: ['USER', 'ADMIN'],
        },
        /*
        {
          ordinal: 5, title: 'Analytics', link: '/analytics', icon: 'bar_chart', roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 6, title: 'Settings', link: '/settings', icon: 'settings', roles: ['USER', 'ADMIN'],
        },
        */
        {
          ordinal: 7, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER'],
        },        
        {
          ordinal: 7, title: 'Reactory Forms', link: '/reactory/', icon: 'code', roles: ['USER'],
        },
        {
          ordinal: 9, title: 'Discussion', link: '/discuss/', icon: 'chat', roles: ['USER'],
        },
        {
          ordinal: 10, title: 'Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
        },
        {
          ordinal: 11, title: 'GraphQL', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
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
    formsroute,
    //Dashboard
    {
      key: 'home',
      title: 'Home',
      path: '/',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: `${key}.Dashboard@1.0.0`,
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'edit'
          }
        }
      ],
    },
    ...proxiedRoutes.map((props) => {
      return {
        key: props.key,
        title: props.title,
        path: '/360/' + props.path,
        exact: false,
        public: false,
        roles: ['USER'],
        componentFqn: 'core.FramedWindow@1.0.0',
        args: [
          {
            key: 'proxyRoot',
            value: {
              type: 'string',
              proxyRoot: `$ref://settings/lasec_360_root/${MODE}`,
            },
          },
          {
            key: 'frameProps',
            value: {
              type: 'object',
              frameProps: {
                url: MODE === 'PRODUCTION' ? 'https://l360.lasec.co.za/' + props.path : LASEC_360_URL + '/' + props.path,
                height: '100%',
                width: '100%',
                styles: {
                  border: 'none',
                  height: '100%',
                  width: '100%',
                },
              },
            },
          },
          {
            key: 'messageHandlers',
            value: {
              type: 'array',
              messageHandlers: [{
                name: 'lasechandlers',
                id: 'lasec360messagehandlers',
                type: 'script',
                uri: `${CDN_ROOT}plugins/core.framedwindow.messagehandlers/lasec360/lib/lasec360.handler.js`,
                component: 'lasec-crm.360MessageBroker@1.0.0',
              }],
            },
          },
        ],
      }
    }),
    //360 Root Application    
    {
      key: 'quote-detail',
      title: 'Quote Detail',
      path: '/quote/**details',
      public: false,
      exact: false,
      roles: ['USER'],
      componentFqn: `${key}.QuoteDetail@1.0.0`,
    },
    {
      key: 'inbox',
      title: 'Discuss',
      path: '/discuss/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.InboxComponent@1.0.0',
      args: [
        {
          key: 'via',
          value: {
            type: 'string',
            via: 'microsoft',
          },
        },
      ],
    },
    {
      key: 'profile',
      title: 'Profile',
      path: '/profile**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: 'core.Profile@1.0.0',
      componentProps: {
        withPeers: false,
      },
      args: [
        {
          key: 'withPeers',
          value: {
            type: 'boolean',
            withPeers: false,
          },
        },
      ],
    },    
    {
      key: 'reactoryrouter',
      title: 'Reactory Forms',
      path: '/reactory/**',
      exact: false, 
      public: false,
      roles: ['ADMIN'],
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
      componentFqn: `${key}.Administration@1.0.0`,
    },
    {
      key: 'sales',
      title: 'Sales',
      path: '/sales/**',
      exact: true,
      public: false,
      roles: ['ADMIN'],
      componentFqn: `${key}.Sales@1.0.0`,
    },
    {
      key: 'graphiql',
      title: 'GraphiQL',
      path: '/graphiql/**',
      exact: true,
      public: false,
      roles: ['ADMIN', 'DEVELOPER'],
      componentFqn: 'core.ReactoryGraphiQLExplorer@1.0.0'
    }
  ],
  theme: key,
  themeOptions: {
    typography: {
      useNextVariants: true,
    },
    type: 'material',
    palette: {
      primary1Color: '#5fb848',
      primary: {
        light: '#92eb77',
        main: '#5fb848',
        dark: '#298717',
        contrastText: '#492002',
      },
      secondary: {
        light: '#62b4b8',
        main: '#2d8488',
        dark: '#00575b',
        contrastText: '#000000',
      },
      report: {
        empty: '#89ee8e',
        fill: '#ff8c63',
      },
    },
    provider: {
      material: {
        typography: {
          useNextVariants: true,
        },
        type: 'material',
        palette: {
          primary1Color: '#369907',
          primary: {
            light: '#6dcb43',
            main: '#6EB84A',
            dark: '#006a00',
            contrastText: '#000000',
          },
          secondary: {
            light: '#62b4b8',
            main: '#2d8488',
            dark: '#00575b',
            contrastText: '#000000',
          },
          report: {
            empty: '#89ee8e',
            fill: '#ff8c63',
          },
        },
      },
      bootstrap: {

      },
      blueprint: {

      },
      mockly: {

      },
    },
    core: {
      images: [
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1280x1024.jpg`,
          aspect: '16:9', // 16:9
          orientation: 'landscape',
          size: {
            width: 1280,
            height: 1024,
          },
        },
        {
          src: `${CDN_ROOT}themes/${key}/images/wallpaper/default/1024x1280.jpg`,
          aspect: '9:16', // 16:9
          orientation: 'portrait',
          size: {
            width: 1024,
            height: 1280,
          },
        },
      ],
      background: {
        color: '',
        image: '',
        alpha: 0.4,
      },
    },
    assets: {
      featureImage: `${CDN_ROOT}themes/${key}/images/featured.jpg`,
      logo: `${CDN_ROOT}themes/${key}/images/logo.png`,
      emailLogo: `${CDN_ROOT}themes/${key}/images/logo_small.png`,
      favicon: `${CDN_ROOT}themes/${key}/images/favicon.png`,
      avatar: `${CDN_ROOT}themes/${key}/images/avatar.png`,
      icons: {
        Icon512: `${CDN_ROOT}themes/${key}/images/icons-512.png`,
        Icon192: `${CDN_ROOT}themes/${key}/images/icons-192.png`,
        Icon144: `${CDN_ROOT}themes/${key}/images/icons-144.png`,
      },
    },
    content: {
      appTitle: 'Lasec CRM',
      login: {
        message: `${key} powered by reactory.net`,
      },
    },
  },
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
        email: 'werner.weber+lasecredirect@gmail.com',
        enabled: true,
      },
    },
    {
      name: 'lasec_360_root/DEVELOP',
      data: {
        url: 'http://localhost:3001/',
      },
    },
    {
      name: 'lasec_360_root/PRODUCTION',
      data: {
        url: 'https://l360.lasec.co.za/',
      },
    },
    {
      name: 'reactory.forms.generation',
      title: 'Reactory Forms Generation Settings',
      description: '',
      data: {
        enabled: false,
        generators: [
          {
            id: 'generators.MySQLFormGenerator',
            connectionId: 'mysql.default',
            props: {
              database: ['reactory'],              
              tables: ['*']
            } 
          },
          {
            id: 'generators.MySQLFormGenerator',
            connectionId: 'mysql.lasec360.development',
            props: {
              database: [
                {
                  name: 'lasec360',
                  tables: ['address'],
                }
              ],              
              
            }
          },
        ]
      }
    },
    {
      name: 'mysql.default',
      data: {
        host: 'localhost',
        user: 'reactory',
        password: 'reactory_password',
        database: 'reactory',
        port:3306    
      },       
    },
    {
      name: 'mysql.lasec360.development',
      data: {
        host: 'localhost',
        user: 'reactory',
        password: 'reactory_password',
        database: 'lasec360',
        port:3306
      },       
    },   
  ],
  allowCustomTheme: true,
  auth_config: [
    {
      provider: 'LOCAL',
      enabled: true,
    },
    {
      provider: 'microsoft',
      enabled: true,
      /**
        OAUTH_APP_ID=ac149de8-0529-48ac-9b4d-a950a73dfbab
        OAUTH_APP_PASSWORD=<OAUTH PASSWORD>
        OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
        OAUTH_SCOPES='profile offline_access user.read calendars.read'
        OAUTH_AUTHORITY=https://login.microsoftonline.com/common
        OAUTH_ID_METADATA=/v2.0/.well-known/openid-configuration
        OAUTH_AUTHORIZE_ENDPOINT=/oauth2/v2.0/authorize
        OAUTH_TOKEN_ENDPOINT=/oauth2/v2.0/token
       */
      options: {
        identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
        clientID: 'ac149de8-0529-48ac-9b4d-a950a73dfbab',
        responseType: 'code id_token',
        responseMode: 'form_post',
        redirectUrl: `${API_URI_ROOT}/auth/microsoft/done`,
        allowHttpForRedirectUrl: true,
        clientSecret: '<OAUTH PASSWORD>',
        validateIssuer: false,
        passReqToCallback: false,
        scope: 'profile offline_access user.read calendars.read'.split(' '),
      },
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
    'app.lasec.coza',
    'bapp.lasec.co.za',
    'aapp.lasec.co.za'
  ],
};

