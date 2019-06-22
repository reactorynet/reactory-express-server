export const DefaultUiSchema = {
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
        width: '512px',
        height: '192px',
        marginRight: 'auto',
        marginLeft: 'auto',
        marginTop: '16px',
        marginBottom: '16px',
      },
    },
  },
  name: {

  },
  code: {

  },
};

export const DetailedUiSchema = {
  ...DefaultUiSchema,
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
};

export const OrganizationLoginFormSchema = {
  ...DefaultUiSchema,
  id: {
    'ui:widget': '',
  },
};

export default DefaultUiSchema;
