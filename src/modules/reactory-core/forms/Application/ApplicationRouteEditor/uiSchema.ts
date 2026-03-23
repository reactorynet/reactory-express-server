import Reactory from '@reactorynet/reactory-core';

const uiSchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    showSubmit: true,
    showHelp: false,
    showRefresh: false,
    submitText: 'Save Route',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { key: { xs: 12, sm: 6 }, path: { xs: 12, sm: 6 } },
    { title: { xs: 12, sm: 6 }, componentFqn: { xs: 12, sm: 6 } },
    { exact: { xs: 6, sm: 3 }, public: { xs: 6, sm: 3 }, redirect: { xs: 12, sm: 6 } },
    { roles: { xs: 12 } },
    { componentProps: { xs: 12 } },
  ],
  id: {
    'ui:widget': 'hidden',
  },
  key: {
    'ui:placeholder': 'e.g. dashboard',
    'ui:options': {
      helperText: 'Unique identifier for the route',
    },
  },
  path: {
    'ui:placeholder': 'e.g. /dashboard or /users/:id',
    'ui:options': {
      helperText: 'Route path pattern',
    },
  },
  title: {
    'ui:placeholder': 'e.g. Dashboard',
    'ui:options': {
      helperText: 'Display title for the route',
    },
  },
  componentFqn: {
    'ui:placeholder': 'e.g. namespace.ComponentName@1.0.0',
    'ui:options': {
      helperText: 'Fully qualified component name',
    },
  },
  roles: {
    'ui:widget': 'TagsWidget',
    'ui:options': {
      helperText: 'Roles required to access this route',
      placeholder: 'Add a role...',
    },
  },
  redirect: {
    'ui:placeholder': 'e.g. /new-path',
    'ui:options': {
      helperText: 'Redirect path if the component is no longer available',
    },
  },
  componentProps: {
    'ui:widget': 'JSONEditorWidget',
    'ui:options': {
      helperText: 'JSON properties to pass to the component',
    },
  },
};

export default uiSchema;
