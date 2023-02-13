
const MainMenu: Reactory.UX.IReactoryMenuConfig = {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [
    {
      ordinal: 1,
      title: "reactory:reactory.menu.myapplications", 
      link: '/', 
      icon: 'dashboard', 
      roles: ['USER', 'ADMIN'],
    },    
    {
      ordinal: 2, 
      title: "reactory:reactory.menu.about-reactory", 
      link: '/about/', 
      icon: 'article', 
      roles: ['ANON', 'USER'],
    },
    {
      ordinal: 3, 
      title: 'reactory:reactory.menu.documentation', 
      link: '/docs/', 
      icon: 'local_library', 
      roles: ['USER'],
      items: [
        {
          ordinal: 1, 
          title: 'reactory:reactory.menu.documentation-development-fundamentals', 
          link: '/docs/development-fundamentals', 
          icon: 'code', 
          roles: ['DEVELOPER'],
        },
        {
          ordinal: 2, 
          title: 'reactory:reactory.menu.documentation-development-server', 
          link: '/docs/development-server', 
          icon: 'dns', 
          roles: ['DEVELOPER', 'DEVELOPER-BACKEND'],
        },
        {
          ordinal: 3, 
          title: 'reactory:reactory.menu.documentation-development-client', 
          link: '/docs/development-client', 
          icon: 'widgets', 
          roles: ['DEVELOPER', 'DEVELOPER-CLIENT'],
        },
        {
          ordinal: 4, 
          title: 'reactory:reactory.menu.documentation-styling', 
          link: '/docs/development-styling', 
          icon: 'style', 
          roles: ['DEVELOPER', 'DEVELOPER-STYLING'],
        }
      ]
    },
    {
      ordinal: 4, 
      title: 'reactory:reactory.menu.forms', 
      link: '/forms/', 
      icon: 'pages', 
      roles: ['USER'],
    },
    {
      ordinal: 5, 
      title: 'reactory:reactory.menu.profile', 
      link: '/profile/', 
      icon: 'badge', 
      roles: ['USER'],
    },
    {
      ordinal: 6,
      title: 'reactory:reactory.menu.forms', 
      link: '/forms/', 
      icon: 'code', 
      roles: ['DEVELOPER', 'ADMIN'],
      items: [        
        {
          ordinal: 1, 
          title: 'reactory:reactory.menu.graphiql', 
          link: '/graphiql/', 
          icon: 'offline_bolt', 
          roles: ['DEVELOPER', 'ADMIN'],
        },
      ]
    },
    {
      ordinal: 94, 
      title: 'reactory:reactory.menu.support', 
      link: '/support/', 
      icon: 'help', 
      roles: ['USER'],
      items: [
        {
          ordinal: 95, 
          title: 'reactory:reactory.menu.support-request', 
          link: '/support/request', 
          icon: 'support_agent', 
          roles: ['USER'],
        },
        {
          ordinal: 96, 
          title: 'reactory:reactory.menu.my-support-requests', 
          link: '/support/open', 
          icon: 'task', 
          roles: ['USER'],
        },
      ],
    },
  ],
}

export default MainMenu;