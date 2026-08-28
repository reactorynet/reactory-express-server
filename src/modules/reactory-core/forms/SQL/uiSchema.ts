import Reactory from '@reactorynet/reactory-core';

const uiSchema: Reactory.Schema.IReactoryUISchema = {
  'ui:options': {
    title: 'SQL Query Editor',
    description: 'Execute SQL queries across connected relational databases',
    showSubmit: true,
    submitIcon: 'play_arrow',
    submitText: 'Execute Query',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      connectionId: { xs: 12, sm: 12, md: 6, lg: 4 },
      'paging.pageSize': { xs: 12, sm: 6, md: 3, lg: 2 },
      'paging.page': { xs: 12, sm: 6, md: 3, lg: 2 },
    },
    {
      commandText: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
    {
      data: { xs: 12, sm: 12, md: 12, lg: 12 },
    },
  ],
  connectionId: {
    'ui:widget': 'SelectWidget',
    'ui:options': {
      selectOptions: [
        { key: 'reactory.postgres.connection', value: 'reactory.postgres.connection', label: 'PostgreSQL (Default)' },
        { key: 'reactory.mysql.connection', value: 'reactory.mysql.connection', label: 'MySQL (Default)' },
        { key: 'reactory.mssql.connection', value: 'reactory.mssql.connection', label: 'MS SQL Server (Default)' },
      ],
    },
  },
  commandText: {
    'ui:widget': 'RichEditorWidget',
    'ui:options': {
      format: 'sql',
      rows: 8,
      placeholder: 'SELECT * FROM ...',
    },
  },
  paging: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        page: { xs: 6, sm: 6 },
        pageSize: { xs: 6, sm: 6 },
      },
    ],
    page: {
      'ui:widget': 'updown',
    },
    pageSize: {
      'ui:widget': 'updown',
    },
    total: {
      'ui:widget': 'hidden',
    },
  },
  data: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      title: 'Results',
      search: true,
      export: true,
      paging: true,
    },
  },
};

export default uiSchema;
