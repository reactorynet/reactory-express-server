const MenuItems = {
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
      ordinal: 0, title: 'Dashboard', link: '/', icon: 'dashboard', roles: ['USER'],
    },
    // {
    //  ordinal: 1, title: 'Inbox', link: '/inbox/', icon: 'email', roles: ['USER'],
    // },
    {
      ordinal: 2, title: 'Surveys', link: '/surveys/', icon: 'check_circle', roles: ['USER'],
    },
    {
      ordinal: 3, title: 'Reports', link: '/reports/', icon: 'bug_report', roles: ['USER'],
    },
    // {
    //  ordinal: 4, title: 'Actions', link: '/tasks/', icon: 'autorenew', roles: ['USER'],
    // },
    {
      ordinal: 5, title: 'Profile', link: '/profile/', icon: 'account_circle', roles: ['USER'],
    },
    {
      ordinal: 6, title: 'Admin', link: '/admin/', icon: 'supervisor_account', roles: ['ADMIN'],
    },
    {
      ordinal: 7, title: 'Forms Admin', link: '/forms/', icon: 'supervisor_account', roles: ['ADMIN'],
    },
  ],
};

export default [
  profileSmall,
  towerStoneMenuDef,
];
