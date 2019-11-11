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

const {
  CDN_ROOT,
  MODE = 'DEVELOP',
  API_URI_ROOT,
  LASEC_360_URL = 'http://localhost:3001',
  REACTORY_CLIENT_URL = 'http://localhost:3000'
} = process.env;

let siteUrl = REACTORY_CLIENT_URL; // 'http://localhost:3000' : 'https://app.towerstone-global.com/';

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

/**
 * These routes are routes that are proxied via our framed window component
 */
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
    key: '360-invoices',
    title: 'Invoices',
    path: 'crm/invoices'
  },
  {
    key: '360-product-catalogue',
    title: 'Product Catalogue',
    path: 'catalogue/search'
  },
  {
    key: '360-user-admin',
    title: 'User Admin',
    path: 'admin/users'
  },
  {
    key: '360-admin-groups',
    title: 'Groups',
    path: 'admin/groups'
  },
  {
    key: '360-admin-approvals',
    title: 'Approvals',
    path: 'approvals/quote-approval'
  },  
  {
    key: 'CrmSalesHistory',
    title: 'Sales History',
    path: 'crm/sales-history'
  },
];

/**
 * The main menu container
 */
const MainMenu = {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [
   
  ],
};

/**
 * A wrapper object for menus, makes it easier for merging during development and production
 */
const Menus = {
  DEVELOP: [      
  ],
  
  PRODUCTION: [
    {
      ordinal: 0,
      title: 'Dashboard',
      link: '/',
      icon: 'dashboard',
      items: [
        {
          ordinal: 0,
          title: 'Sales Dashboard',
          link: '/',
          icon: 'money',
          roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 1,
          title: 'Product Dashboard',
          link: '/dashboard/product',
          icon: 'bar_chart',
          roles: ['USER', 'ADMIN'],
        },
        {
          ordinal: 2, 
          title: 'Discussion', 
          link: '/discuss/', 
          icon: 'chat', 
          roles: ['USER'],
        },
        {
          ordinal: 3,
          title: 'Approvals',
          link: '/360/approvals/quote-approval',
          icon: 'gavel',
          roles: ['ADMIN', 'QUOTE_APPROVER'],
        },
      ],
      roles: ['USER', 'ADMIN'],
    },    
    {
      ordinal: 1,
      title: 'Sales',
      link: '/360/crm/customer-search',
      icon: 'attach_money',
      roles: ['USER'],
      items: [
        {
          ordinal: 0,
          title: 'Clients',
          link: '/360/crm/customer-search',
          icon: 'accessible',
          roles: ['USER'],
        },
        {
          ordinal: 0,
          title: 'Quotes',
          link: '/360/crm/all-quotes',
          icon: 'add_shopping_cart',
          roles: ['USER'],
        },
        {
          ordinal: 3,
          title: 'ISO',
          link: '/360/catalogue/sales-orders',
          icon: 'shopping_cart',
          roles: ['USER'],
        },
        {
          ordinal: 3,
          title: 'Invoices',
          link: '/360/catalogue/invoices',
          icon: 'attach_money',
          roles: ['USER'],
        },
        {
          ordinal: 3,
          title: 'Sales History',
          link: '/360/catalogue/sales-history',
          icon: 'history',
          roles: ['USER'],
        },
        {
          ordinal: 1,
          title: 'Catalogue',
          link: '/360/catalogue/search',
          icon: 'book',
          roles: ['USER'],
        },                       
        {
          ordinal: 5,
          title: 'Sales Assistant',
          link: '/salesconfig',
          icon: 'speed',
          roles: ['USER'],
        },
      ]
    }, 
    {
      ordinal: 2,
      title: 'Product',
      link: '/360/crm/catalog',
      icon: 'book',
      roles: ['USER'],
      items: [
        {
          ordinal: 0,
          title: 'Catalogue',
          link: '/360/catalogue/search',
          icon: 'book',
          roles: ['USER'],
        },
        {
          ordinal: 0,
          title: 'Approvals',
          link: '/360/approvals/quote-approval',
          icon: 'gavel',
          roles: ['USER'],
        },       
      ]
    },
    {
      ordinal: 17, title: 'Develop', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
      items: [
        {
          ordinal: 8, title: 'Reactory Forms', link: '/reactory/', icon: 'code', roles: ['DEVELOPER',  'ADMIN']
        },
        {
          ordinal: 11, title: 'GraphQL', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
        },
        {
          ordinal: 13, title: 'Product List', link: '/productlist/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 14, title: 'New Quote', link: '/newquote/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 14, title: 'Capture Category', link: '/capturecategory/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 15, title: 'Category List', link: '/categorylist/', icon: 'reorder', roles: ['USER'],
        },
      ]
    },
    {
      orinal: 98, title: 'Admin', link: '/admin/', icon: 'settings_power', roles: ['ADMIN', 'DEVELOPER'],
      items: [
        {
          ordinal: 0,
          title: 'Static Content',
          link: '/admin/content/',
          icon: 'file_copy',
          roles: ['ADMIN'],
        },
        {
          ordinal: 1,
          title: 'Customer',
          link: '/admin/customer/',
          icon: 'business',
          roles: ['ADMIN'],
        },
        {
          ordinal: 3,
          title: 'User Admin',
          link: '/360/admin/users',
          icon: 'account_circle',
          roles: ['ADMIN'],
        },
        {
          ordinal: 4,
          title: 'Groups',
          link: '/360/admin/groups',
          icon: 'account_tree',
          roles: ['ADMIN'],
        },        
      ]
    },
    {
      ordinal: 97, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER'],
      items: [
        {
          ordinal: 90, title: 'What\'s new', link: '/whats-new/', icon: 'verified_user', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 91, title: 'About', link: '/about/', icon: 'verified_user', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 92, title: 'How to', link: '/how-to/', icon: 'verified_user', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 93, title: 'Glossary', link: '/glossary/', icon: 'verified_user', roles: ['USER', 'ANON'],
        }
        
      ]      
    },        
    
  ]
};

const staticContentMappings = [
  {
    key: 'about',
    title: 'About 360',
    path: '/about',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'about-us',
        }
      }
    ]
  }, 
  {
    key: 'product-dashboard',
    title: 'Product Dashboard',
    path: '/dashboard/product*',
    public: false,
    exact: false,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'product-dashboard',
        }
      }
    ]
  },

];

const LASEC_CONFIG = {
  key,
  name: '360 App',
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
    'EXEC',
    'CONTENT_EDITOR'
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
    formsroute,    
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
      key: 'content-capture',
      title: 'Content Capture',
      path: '/admin/content/edit/:slug/*',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
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
      key: 'help-index',
      title: 'Help List',
      path: '/help/',
      public: false,
      exact: true,
      roles: ['USER', 'ADMIN'],
      componentFqn: 'static.ContentList@1.0.0',
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'view',
          }
        },
        {
          key: 'categories',
          value: {
            type: 'string',
            categories: 'help',
          }
        },
        {
          key: 'uiSchema',
          value: {
            type: 'string',
            uiSchema: 'HelpListUiSchema',
          }
        },
      ]
    },
    {
      key: 'help-item',
      title: 'Help Item',
      path: '/help/:slug',
      public: false,
      exact: true,
      roles: ['USER', 'ADMIN'],
      componentFqn: 'static.StaticContent@1.0.0',
      args: [
        {
          key: 'slugSourceProps',
          value: {
            type: 'object',
            slugSourceProps: {
              paramId: 'slug',
            },
          },
        },
        {
          key: 'slugSource',
          value: {
            type: 'string',
            slugSource: 'router'
          },
        },        
      ],
    },    
    {
      key: 'content-capture-new',
      title: 'Content Capture',
      path: '/admin/content/new',
      public: false,
      exact: true,
      roles: ['ADMIN', 'CONTENT_EDITOR'],
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
      path: '/admin/content',
      exact: true,
      public: false,
      roles: ['ADMIN'],
      componentFqn: 'static.ContentList@1.0.0',
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'edit',
          }
        },        
      ],
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
      key: 'salesconfig',
      title: 'Sales Configurator',
      path: '/salesconfig',
      exact: false,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.TabbedQuotesList@1.0.0`,
    },
    {
      key: 'productlist',
      title: 'Product List',
      path: '/productlist/**',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.ProductList@1.0.0`,
    },
    {
      key: 'newquote',
      title: 'New Quote',
      path: '/newquote/**',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.NewQuote@1.0.0`,
    },
    {
      key: 'categorylist',
      title: 'Category List',
      path: '/categorylist/**',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.CategoryList@1.0.0`,
    },
    {
      key: 'capturecategory',
      title: 'Capture Category',
      path: '/capturecategory/new',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.CaptureCategory@1.0.0`,
    },
    {
      key: 'capturecategory',
      title: 'Capture Category',
      path: '/capturecategory/edit/:id/',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.CaptureCategory@1.0.0`,
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

staticContentMappings.forEach((mapping) => {
  LASEC_CONFIG.routes.push({
    ...mapping,
    componentFqn: 'core.StaticContent@1.0.0'
  });
});


proxiedRoutes.forEach((props) => {
  LASEC_CONFIG.routes.push({
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
  });
});

if( MODE === 'DEVELOP' ) {
  MainMenu.entries = [ ...Menus.PRODUCTION, ...Menus.DEVELOP ];
} else {
  MainMenu.entries = [ ...Menus.PRODUCTION ];
}

LASEC_CONFIG.menus = [ profileSmall, MainMenu ];

export default LASEC_CONFIG;
