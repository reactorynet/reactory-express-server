export const DefaultUiSchema = {
  id: {
    'ui:widget': 'HiddenWidget',
  },
  createdAt: {
    'ui:widget': 'DateSelectorWidget',
    'ui:options': {
      widget: 'DateSelectorWidget',
      readOnly: true,
    },
  },
  updatedAt: {
    'ui:widget': 'DateSelectorWidget',
    'ui:options': {
      widget: 'DateSelectorWidget',
      readOnly: true,
    },
  },
  logo: {
    'ui:widget': 'CompanyLogoWidget',
    'ui:options': {
      readOnly: false,
      noLookup: true,
      mapping: {
        'formContext.formData.id': 'id',
        'formContext.formData.logo': 'logo',
      },
      style: {
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '8px',
        marginBottom: '8px',
      },
    },
  },
};

export const DetailedUiSchema = {
  ...DefaultUiSchema,
  id: {
    'ui:widget': 'HiddenWidget',
  },
};

export const OrganizationLoginFormSchema = {
  ...DefaultUiSchema,
  id: {
    'ui:widget': '',
  },
};

export default DefaultUiSchema;
