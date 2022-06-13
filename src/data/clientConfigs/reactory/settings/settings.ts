
export default [
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
];