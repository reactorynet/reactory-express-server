

export default {
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
      ordinal: 95, title: 'Support', link: '/support/request', icon: 'support_agent', roles: ['USER'],
    },
    {
      ordinal: 96, title: 'Open Support Requests', link: '/support/open', icon: 'task', roles: ['USER'],
    },
  ],
}