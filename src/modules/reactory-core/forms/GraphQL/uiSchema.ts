import Reactory from '@reactorynet/reactory-core';

const uiSchema: Reactory.Schema.IReactoryUISchema = {
  'ui:options': {
    title: 'GraphQL Query Editor',
    description: 'Execute GraphQL queries and mutations against the Reactory GraphQL API',
    showSubmit: true,
    submitIcon: 'play_arrow',
    submitText: 'Execute Query',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      operationName: { xs: 12, sm: 12, md: 6, lg: 4 },
    },
    {
      query: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      variables: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      data: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
  ],
  operationName: {
    'ui:widget': 'TextWidget',
    'ui:options': {
      placeholder: 'e.g. ApiStatus',
    },
  },
  query: {
    'ui:widget': 'RichEditorWidget',
    'ui:options': {
      format: 'graphql',
      rows: 10,
      placeholder: 'query ApiStatus {\n  apiStatus {\n    status\n  }\n}',
    },
  },
  variables: {
    'ui:widget': 'RichEditorWidget',
    'ui:options': {
      format: 'json',
      rows: 4,
      placeholder: '{\n  "key": "value"\n}',
    },
  },
  data: {
    'ui:widget': 'RichEditorWidget',
    'ui:options': {
      format: 'json',
      readOnly: true,
      rows: 12,
      placeholder: 'Query results will appear here...',
    },
  },
};

export default uiSchema;
