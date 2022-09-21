

export default {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [
    {
      ordinal: 1, title: "reactory:reactory.menu.myapplications", link: '/', icon: 'dashboard', roles: ['USER', 'ADMIN'],
    },
    {
      ordinal: 2, title: 'Reactory Clients', link: '/reactory-clients/', icon: 'check_circle', roles: ['SYS-ADMIN'],
    },
    {
      ordinal: 3, title: 'About Reactory', link: '/about/', icon: 'info', roles: ['ANON', 'USER'],
    },
    {
      ordinal: 4, title: 'Forms', link: '/forms/', icon: 'pages', roles: ['USER'],
    },
    {
      ordinal: 5, title: 'Profile', link: '/about/', icon: 'badge', roles: ['USER'],
    },
    {
      ordinal: 6, title: 'Develop', link: '/forms/', icon: 'code', roles: ['DEVELOPER', 'ADMIN'],
      items: [        
        {
          ordinal: 1, title: 'GraphQL Queries', link: '/graphiql/', icon: 'offline_bolt', roles: ['DEVELOPER', 'ADMIN'],
        },
      ]
    },
    {
      ordinal: 95, title: 'Support', link: '/support/request', icon: 'support_agent', roles: ['USER'],
    },
    {
      ordinal: 96, title: 'Open Support Requests', link: '/support/open', icon: 'task', roles: ['USER'],
    },
  ],
}