

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
      ordinal: 4, title: 'Add Content', link: '/content-capture/new', icon: 'create', roles: ['ADMIN', 'USER'],
    },
    {
      ordinal: 4, title: 'List Content', link: '/content-list/', icon: 'list', roles: ['ADMIN', 'USER'],
    },
  ],
}