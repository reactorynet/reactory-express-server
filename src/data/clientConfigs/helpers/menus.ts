

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

export default [
  profileSmall,
];

