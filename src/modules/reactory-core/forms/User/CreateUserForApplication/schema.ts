import Reactory from '@reactory/reactory-core';

const schema: Reactory.IObjectSchema = {
  type: 'object',
  title: 'Create User for Application',
  description: 'Create a new user and assign them to this application.',
  required: ['firstName', 'lastName', 'email'],
  properties: {
    firstName: {
      type: 'string',
      title: 'First Name',
      description: "The user's first name",
    },
    lastName: {
      type: 'string',
      title: 'Last Name',
      description: "The user's last name",
    },
    email: {
      type: 'string',
      title: 'Email',
      description: "The user's email address",
      format: 'email',
    },
    mobileNumber: {
      type: 'string',
      title: 'Mobile Number',
      description: "The user's mobile number",
    },
    password: {
      type: 'string',
      title: 'Password',
      description: 'Set an initial password for the user. If left blank, a random password will be generated.',
    },
    roles: {
      type: 'array',
      title: 'Roles',
      description: 'Roles to assign to the user for this application.',
      items: {
        type: 'string',
        enum: ['USER', 'ADMIN', 'DEVELOPER'],
      },
      default: ['USER'],
      uniqueItems: true,
    },
  },
};

export default schema;
