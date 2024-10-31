export const UserProperties = {
  type: 'object',
  title: 'User',
  description: 'User Object',
  properties: {
    id: {
      type: 'string',
      title: 'User Id',
    },
    firstName: {
      type: 'string',
      title: 'First Name',
    },
    lastName: {
      type: 'string',
      title: 'Last Name',
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
    },
  },
};


export default {
  UserProperties,
};
