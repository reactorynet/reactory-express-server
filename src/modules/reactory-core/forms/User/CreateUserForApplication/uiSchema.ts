const uiSchema = {
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      firstName: { xs: 12, sm: 6 },
      lastName: { xs: 12, sm: 6 },
    },
    {
      email: { xs: 12, sm: 6 },
      mobileNumber: { xs: 12, sm: 6 },
    },
    {
      password: { xs: 12, sm: 6 },
      roles: { xs: 12, sm: 6 },
    },
  ],
  firstName: {
    'ui:placeholder': 'Enter first name',
  },
  lastName: {
    'ui:placeholder': 'Enter last name',
  },
  email: {
    'ui:placeholder': 'Enter email address',
  },
  mobileNumber: {
    'ui:placeholder': 'Enter mobile number',
  },
  password: {
    'ui:widget': 'password',
    'ui:placeholder': 'Leave blank to auto-generate',
  },
  roles: {
    'ui:widget': 'CheckboxesWidget',
  },
};

export default uiSchema;
