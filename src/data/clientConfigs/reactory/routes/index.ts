import Reactory from '@reactory/reactory-core';
import {  
  loginroute,
  logoutroute,
  resetpasswordroute,
  forgotpasswordroute,  
} from '@reactory/server-core/data/clientConfigs/helpers/defaultRoutes';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

/**
 * Static Content Mappings
 */
const staticContentMappings: Partial<Reactory.Routing.IReactoryRoute>[] = [
 
];


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
          magicLink: false
        }
      },
      {
        key: 'authlist',
        value: {
          type: 'array',
          authlist: [
            'local',
            { 
              provider: 'google', 
              component: 'core.GoogleLoginButton@1.0.0', 
              props: { 
                url: `${ENVIRONMENT.API_URI_ROOT}auth/google/start?x-client-key=\${reactory.CLIENT_KEY}&x-client-pwd=\${encodeURIComponent(reactory.CLIENT_PWD)}` 
              }
            },
            { 
              provider: 'microsoft', 
              component: 'microsoft.MicrosoftLogin@1.0.0',
              props: { 
                url: `${ENVIRONMENT.API_URI_ROOT}auth/microsoft/start?x-client-key=\${reactory.CLIENT_KEY}&x-client-pwd=\${encodeURIComponent(reactory.CLIENT_PWD)}` 
              }
            },
            { 
              provider: 'github', 
              component: 'core.GitHubLoginButton@1.0.0', 
              props: { 
                url: `${ENVIRONMENT.API_URI_ROOT}auth/github/start?x-client-key=\${reactory.CLIENT_KEY}&x-client-pwd=\${encodeURIComponent(reactory.CLIENT_PWD)}` 
              }
            },
            { 
              provider: 'okta', 
              component: 'core.OktaLoginButton@1.0.0', 
              props: { 
                url: `${ENVIRONMENT.API_URI_ROOT}auth/okta/start??x-client-key=\${reactory.CLIENT_KEY}&x-client-pwd=\${encodeURIComponent(reactory.CLIENT_PWD)}` 
              }
            },                        
          ],
        },
      },
    ],
  },
  {
    key: 'about',
    title: 'About Reactory',
    path: '/about/*',
    public: true,
    exact: true,
    roles: ['USER', 'ANON'],
    componentFqn: 'core.StaticContent@1.0.0',
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'about-reactory-platform',
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
    componentFqn: 'core.StaticContent@1.0.0',
    roles: ['USER'],
    args: [
      {
        key: 'slug',
        value: {
          type: 'string',
          slug: 'whats-new-reactory-platform',
        }
      }
    ]
  },
  {
    key: 'blog',
    title: 'Blog Path',
    public: true,
    exact: false,
    componentFqn: 'core.StaticContent@1.0.0',
    path: '/blog/:blog_slug',
    roles: ['ANON', 'USER'],
    componentProps: {
      slugSource: 'route',
      slugSourceProps: {
        paramId: 'blog_slug'
      }
    },
  },
  {
    key: 'support-home',
    title: 'Support Home',
    path: '/support/',
    public: true,
    exact: true,
    roles: ['USER'],
    componentFqn: 'core.StaticContent@1.0.0',
    componentProps: {
      slug: 'support-home'
    },
  },

  {
    key: 'reactory-docs-root',
    title: 'Docs List',
    path: '/docs/',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: 'core.StaticContent@1.0.0',
    componentProps: {
      slug: 'reactory-docs-root'
    }
  },

  {
    key: 'reactory-docs-slug',
    title: 'Docs List',
    path: '/docs/:slug',
    public: false,
    exact: false,
    roles: ['USER'],
    componentFqn: 'core.StaticContent@1.0.0',
    componentProps: {
      slugSource: 'route',
      slugSourceProps: {
        paramId: 'slug',
        slugPrefix: 'reactory-docs-'
      }
    }
  },
  logoutroute,
  forgotpasswordroute,
  resetpasswordroute,
  {
    key: 'home_authenticated',
    title: 'Home (Authenticated)',
    path: '/',
    public: false,
    exact: true,
    roles: ['USER'],
    componentFqn: 'reactory.MyApplications@1.0.0',
  },
  {
    key: 'home_guest',
    title: 'Home (Guest)',
    path: '/',
    public: true,
    exact: true,
    roles: ['ANON'],
    componentFqn: 'core.StaticContent@1.0.0',
    componentProps: {
      slug: 'reactory-home-guest'
    }
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
    // componentFqn: 'core.UserProfile@1.0.0',
    // componentProps: {
    //   withPeers: true,
    //   withMemberships: true, 
    // },
    componentFqn: 'core.UserProfile@1.0.0',
    componentProps: {
      withPeers: true,
      withMemberships: true,
      withOrganigram: true,
      components: [ 
      ]
    }
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
    key: 'organizations',
    title: 'Organizations List',
    path: '/organizations/',
    exact: true,
    public: true,
    roles: ['ADMIN'],
    componentFqn: 'core.ReactoryOrganizationSelector@1.0.0'
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


// staticContentMappings.forEach((mapping) => {
//   routes.push({
//     ...mapping,
//     componentFqn: 'core.StaticContent@1.0.0'
//   });
// });

export default routes;