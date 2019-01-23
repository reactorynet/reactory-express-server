export const DefaultUiSchema = {
  id: {
    'ui:widget': 'HiddenWidget',
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
