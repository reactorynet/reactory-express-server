

export const MenuItems = {
  profile: {
    link: '/profile', title: 'Profile', icon: 'account_circle', roles: ['USER'], ordinal: 0,
  },
  signin: {
    link: '/login', title: 'Login', icon: 'security', roles: ['ANON'], ordinal: 1,
  },
  signout: {
    link: '/logout', title: 'Logout', icon: 'exit_to_app', roles: ['USER'], ordinal: 2,
  },
};

export const profileSmall = {
  name: 'Profile Small',
  key: 'profile-small',
  target: 'top-right',
  roles: ['ANON', 'USER'],
  entries: [
    MenuItems.profile,
    MenuItems.signin,
    MenuItems.signout,
  ],
};

export const towerStoneMenuDef = {
  name: 'Main',
  key: 'left-nav',
  target: 'left-nav',
  roles: ['USER'],
  entries: [
    {
      ordinal: 0, title: 'Home', link: '/', icon: 'dashboard', roles: ['USER'],
    },
    {
      ordinal: 5, title: 'Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
    },
    {
      ordinal: 6, title: 'Admin', link: '/admin/', icon: 'supervisor_account', roles: ['ADMIN'],
      items: [
        {
          ordinal: 0, title: 'Static Content', link: '/static-content/', icon: 'pencil', roles: ['DEVELOPER', 'ADMIN']
        },
      ],
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
      ]
    },
  ],
};

export default [
  profileSmall,
  towerStoneMenuDef,
];
