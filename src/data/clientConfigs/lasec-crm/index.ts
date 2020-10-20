import {
  MenuItems,
} from '../../menus';

import {
  formsroute,
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,
  notfoundroute,
} from '../defaultRoutes';

import theme from './theme';

const {
  CDN_ROOT,
  MODE = 'DEVELOP',
  API_URI_ROOT,
  LASEC_360_URL = 'http://localhost:3001',
  REACTORY_CLIENT_URL = 'http://localhost:3000',
  LASEC360DB_HOST = 'localhost',
  LASEC360DB_USER = 'reactory',
  LASEC360DB_PASSWORD = 'reactory_password',
  LASEC360DB_DATABASE = 'lasec360',
  LASEC360DB_PORT = 3306
} = process.env;

let siteUrl = REACTORY_CLIENT_URL;

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
    path: 'crm/360-sales-orders'
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
  entries: [],
};

const TopRightMenu = {
  name: 'Profile Small',
  key: 'profile-small',
  target: 'top-right',
  roles: ['ANON', 'USER'],
  entries: [
    MenuItems.signin,
    MenuItems.signout,
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
      ],
      roles: ['USER', 'ADMIN'],
    },
    {
      ordinal: 1,
      title: 'Sales',
      link: '/crm/clients/',
      icon: 'attach_money',
      roles: ['USER'],
      items: [
        {
          ordinal: 0,
          title: 'Clients',
          link: '/crm/clients/',
          icon: 'accessible',
          roles: ['USER'],
        },
     
        {
          ordinal: 0,
          title: 'Quotes',
          link: '/crm/quotes/',
          icon: 'add_shopping_cart',
          roles: ['USER'],
        },
   
        {
          ordinal: 3,
          title: 'ISO',
          link: '/crm/sales-orders/',
          icon: 'shopping_cart',
          roles: ['USER'],
        },
 
        {
          ordinal: 3,
          title: 'Invoices',
          link: '/crm/invoices/',
          icon: 'attach_money',
          roles: ['USER'],
        },

    

        {
          ordinal: 3,
          title: 'Sales History',
          link: '/crm/sales-history/',
          icon: 'history',
          roles: ['USER'],
        },

      ]
    },
    {
      ordinal: 2,
      title: 'Product',
      link: '/product-catalogue/product-overview/',
      icon: 'book',
      roles: ['USER'],
      items: [
        {
          ordinal: 0,
          title: 'Catalogue',
          link: '/product-catalogue/product-overview/',
          icon: 'book',
          roles: ['USER'],
        },      
      ]
    },
    {
      ordinal: 17, title: 'Develop', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
      items: [
        {
          ordinal: 8, title: 'Reactory Forms', link: '/reactory/', icon: 'code', roles: ['DEVELOPER', 'ADMIN']
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
        {
          ordinal: 16, title: 'Capture Category Filter', link: '/capture-category-filter/new/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 16, title: 'Update Category Filter', link: '/capture-category-filter/edit/5dbab8773fd27904a91a7b61', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 17, title: 'Category Filter List', link: '/category-filter-list/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 18, title: 'Tabbed Quote List', link: '/tabbed-quote-list/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 19, title: 'Filter Results', link: '/filter-results/', icon: 'reorder', roles: ['USER'],
        },
        {
          ordinal: 19, title: 'Tabbed Product Catelog', link: '/product-catalogue/', icon: 'reorder', roles: ['USER'],
        },
      ]
    },
    {
      orinal: 96, title: 'Admin', link: '/admin/', icon: 'settings_power', roles: ['ADMIN', 'DEVELOPER'],
      items: [
        {
          ordinal: 0,
          title: 'Static Content',
          link: '/admin/content/',
          icon: 'file_copy',
          roles: ['ADMIN', 'DEVELOPER'],
        },
        {
          ordinal: 0,
          title: 'New Static Entry',
          link: '/admin/content/new',
          icon: 'note_add',
          roles: ['ADMIN', 'DEVELOPER'],
        },
        {
          ordinal: 1,
          title: 'Customer',
          link: '/admin/customer/',
          icon: 'business',
          roles: ['ADMIN', 'DEVELOPER'],
        },        
        {
          ordinal: 5,
          title: 'AR Invoices',
          link: '/db/arinvoices'
        },
      ]
    },
    {
      ordinal: 97, title: 'Help', link: '/help', icon: 'help_outline', roles: ['USER', 'ANON'],
      items: [
        {
          ordinal: 90, title: 'What\'s new', link: '/whats-new/', icon: 'schedule', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 91, title: 'About', link: '/about/', icon: 'info', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 92, title: 'How to', link: '/how-to/', icon: 'help_outline', roles: ['USER', 'ANON'],
        },
        {
          ordinal: 93, title: 'Glossary', link: '/glossary/', icon: 'textsms', roles: ['USER', 'ANON'],
        }
      ]
    },

  ]
};

const staticContentMappings = [
  {
    key: 'about',
    title: 'About 360',
    path: '/about/*',
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
    path: '/how-to/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'how-to',
        }
      }
    ]
  },
  {
    key: 'glossary',
    title: 'Glossary',
    path: '/glossary/*',
    public: true,
    exact: true,
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'glossary',
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
    'PRODUCT_MANAGER',
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
  components: [],
  menus: [],
  routes: [
    {
      key: 'product-query',
      title: 'Product Query',
      path: '/product-query',
      public: true,
      exact: true,
      roles: ['USER'],
      componentFqn: `${key}.ProductQuery@1.0.0`,
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'new'
          }
        }
      ],
    },


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
              'microsoft',
            ],
          },
        },
      ],
    },
    {
      key: 'login_alt',
      title: 'Login Alt',
      path: '/login_alt',
      public: true,
      exact: true,
      roles: ['ANON'],
      componentFqn: 'core.Login@1.0.0',
      background: {
        image: 'default',
      },
      args: [
        {
          key: 'magicLink',
          value: {
            type: 'bool',
            magicLink: true,
          },
        },
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
      key: 'product-dashboard',
      title: 'Product Dashboard',
      path: '/dashboard/product',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: `${key}.ProductDashboard@1.0.0`,
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
      key: 'new-client',
      title: 'New Client',
      path: '/newClient',
      public: false,
      exact: true,
      roles: ['USER'],
      componentFqn: `${key}.LasecCRMNewClient@1.0.0`,
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'new'
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
      key: 'quote-email',
      title: 'Quote Email',
      path: '/quote-email',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.LasecQuoteEmail@1.0.0`,
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
      key: 'quote-edit',
      title: 'Edit Quote Route',
      path: '/crm/quote/edit/:quote_id/*',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: 'lasec-crm.QuoteForm@1.0.0',
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
      key: 'content-capture',
      title: 'Content Capture',
      path: '/static-content/edit/:slug/*',
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
      key: 'ar-invoices',
      title: 'AR Invoices - Table Access',
      path: '/db/arinvoices',
      public: false,
      exact: true,
      roles: ['ADMIN'],
      componentFqn: 'core-generated.ReactoryConnectedTableList_mysql_default_arinvoice@1.0.0'
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
      key: 'product-catalog',
      title: 'Product Catelog',
      path: '/product-catalogue/:tab/**',
      exact: true,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.LasecCMSProductCatalog@1.0.0`,
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'view'
          }
        }
      ],
    },
    
    {
      key: 'crm-client',
      title: 'Lasec CRM',
      path: '/crm/:tab/**',
      exact: false,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.LasecCRMComponent@1.0.0`,
      args: [
        {
          key: 'defaultTab',
          value: {
            type: 'string',
            defaultTab: 'clients'
          }
        }
      ],
    },


    // PERSONAL DETAILS
    {
      key: 'crm-client-details',
      title: 'Lasec CRM',
      path: '/crm/personal-details',
      exact: true,
      public: false,
      roles: ['USER'],
      componentFqn: `${key}.LasecCRMPersonalInformation@1.0.0`,
      args: [],
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
      key: 'capture-category-filter',
      title: 'Capture Category Filter',
      path: '/capture-category-filter/new',
      exact: true,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.CreateCategoryFilter@1.0.0`,
    },
    {
      key: 'capture-category-filter',
      title: 'Edit Category Filter',
      path: '/capture-category-filter/edit/:id/',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.CreateCategoryFilter@1.0.0`,
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
      key: 'category-filter-list',
      title: 'Category Filter List',
      path: '/category-filter-list/**',
      exact: true,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.LasecCategoryFilterList@1.0.0`,
    },
    {
      key: 'tabbed-quote-list',
      title: 'Tabbed Quote List',
      path: '/tabbed-quote-list/**',
      exact: true,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.TabbedQuotesList@1.0.0`,
    },
    {
      key: 'filter-results',
      title: 'Filter Results',
      path: '/filter-results/**',
      exact: true,
      public: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: `${key}.FilterResults@1.0.0`,
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
      key: 'quote-note',
      title: 'Quote Note',
      path: '/quotenote/',
      public: false,
      exact: false,
      roles: ['USER', 'ADMIN'],
      componentFqn: 'lasec-crm.LasecQuoteNoteDetail@1.0.0',
      args: [
        {
          key: 'mode',
          value: {
            type: 'string',
            mode: 'view',
          }
        }
      ]
    },
  ],
  theme: key,
  themeOptions: theme,
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
          /*
          {
            id: 'generators.MySQLFormGenerator',
            connectionId: 'mysql.default',
            props: {
              database: ['reactory'],
              tables: ['*']
            }
          },
          */
          {
            id: 'generators.MySQLFormGenerator',
            connectionId: 'mysql.lasec360',
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
        provider: 'mysql',
        host: LASEC360DB_HOST || 'localhost',
        user: LASEC360DB_USER || 'reactory',
        password: LASEC360DB_PASSWORD || 'reactory_password',
        database: 'reactory',
        port: 3306
      },
    },
    {
      name: 'mysql.lasec360',
      data: {
        provider: 'mysql',
        host: LASEC360DB_HOST || 'localhost',
        user: LASEC360DB_USER || 'reactory',
        password: LASEC360DB_PASSWORD || 'reactory_password',
        database: LASEC360DB_DATABASE || 'lasec360',
        port: LASEC360DB_PORT || 3306
      },
    },
    {
      name: 'navigation_components/DEVELOP',
      data: [
        {
          componentFqn: "lasec-crm.LasecUserProfileWidget@1.0.0",
          componentProps: {
            target: 'self',
          },
          componentPropertyMap: {},
          componentKey: "LasecUserProfileWidget",          
          contextType: "DEFAULT_HEADER_AVATAR",
        },        
      ],      
    },
    {
      name: 'navigation_components/QA',
      data: [
        {
          componentFqn: "lasec-crm.LasecUserProfileWidget@1.0.0",
          componentProps: {
            target: 'self',
          },
          componentPropertyMap: {},
          componentKey: "LasecUserProfileWidget",          
          contextType: "DEFAULT_HEADER_AVATAR",
        },        
      ],      
    },
    {
      name: 'navigation_components/PRODUCTION',
      data: [
        {
          componentFqn: "lasec-crm.LasecUserProfileWidget@1.0.0",
          componentProps: {
            target: 'self',
          },
          componentPropertyMap: {},
          componentKey: "LasecUserProfileWidget",          
          contextType: "DEFAULT_HEADER_AVATAR",
        },        
      ],      
    },
    {
      name: 'navigation_components/PRODUCTION',
      data: [],
      componentFqn: 'core.NavigationComponentEditor@1.0.0'
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
        key: 'containerProps',
        value: {
          type: 'object',
          containerProps: {
            style: {
              top: '48px',
              bottom: '0px',
              position: 'absolute',
              width: '100%'
            }
          }
        }
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

if (MODE !== 'PRODUCTION') {
  MainMenu.entries = [...Menus.PRODUCTION, ...Menus.DEVELOP];
} else {
  MainMenu.entries = [...Menus.PRODUCTION];
}

LASEC_CONFIG.menus = [TopRightMenu, MainMenu];

export default LASEC_CONFIG;
