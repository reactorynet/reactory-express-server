import Reactory from '@reactorynet/reactory-core';

/**
 * Data connection options for the query editor's connection picker.
 *
 * Backed by the `ReactorySQLDataConnections` query, which resolves the
 * connections configured on the active partner's client settings with
 * role-aware filtering — so the dropdown reflects what the signed-in user can
 * actually query instead of a hard-coded list. Only SQL-capable variants are
 * returned (postgres, mysql, mssql, databricks); Mongo and Redis are surfaced
 * through their own editors.
 *
 * `resultMap` reshapes each connection into the `{ key, value }` pair the
 * SelectWithData widget consumes: the connection's setting name becomes both
 * the option key and the bound value, so `formData.connectionId` stays the id
 * the SQL resolvers expect.
 */
const DataConnectionsSelectQuery: Reactory.Forms.IReactoryFormQuery = {
  name: 'ReactorySQLDataConnections',
  text: `query ReactorySQLDataConnections {
    ReactorySQLDataConnections {
      connectionId
      variant
      label
      title
      host
      port
      database
      description
    }
  }`,
  resultMap: {
    '[].connectionId': ['[].key', '[].value'],
    '[].label': '[].label',
    '[].variant': '[].variant',
    '[].database': '[].database',
  },
};

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
    'ui:widget': 'SelectWithDataWidget',
    'ui:graphql': DataConnectionsSelectQuery,
    'ui:options': {
      // `key` is the connection setting name; `value` is the same id, which is
      // what the SQL resolvers bind to `connectionId`.
      labelKey: 'key',
      valueKey: 'value',
      labelFormat: '${option.label}',
      // The connection must be chosen explicitly — an empty option would
      // produce a query with no target connection.
      allowNullSelect: false,
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

      // Server-side paging. `remoteData: true` switches the widget onto its
      // own-fetch path: it runs the form's query itself, injecting
      // `paging: { page, pageSize }` into the variables and re-fetching
      // (network-only) whenever the page changes. Because `ReactorySQLQuery`
      // returns `paging.total`, the widget takes its server-paging branch
      // rather than slicing client-side — so each page is a real
      // LIMIT/OFFSET query and the page count is the true row count.
      //
      // The alternative (data bound into formData) cannot page: the form has no
      // `autoQuery`, so a page change never triggers a re-query, and the widget
      // renders every row it is given.
      remoteData: true,

      // Variable mapping for the widget's fetch. The widget maps from
      // `{ formContext, query, props }`, so paths are rooted at
      // `formContext.formData` — not `formData`.
      //
      // Paging is mapped from the widget's own `query` state. The widget injects
      // `paging` at the TOP LEVEL of the variables, but `ReactorySQLQuery` takes
      // a single `input: SQLQuery` argument, so the page must be nested as
      // `input.paging`. Mapping it explicitly from `query.page`/`query.pageSize`
      // achieves that and keeps the resolver's LIMIT/OFFSET in step with the
      // grid. (The widget's extra top-level `paging` is not declared by the
      // operation, so the server ignores it.)
      variables: {
        'formContext.formData.connectionId': 'input.context.connectionId',
        'formContext.formData.commandText': 'input.context.commandText',
        'query.page': 'input.paging.page',
        'query.pageSize': 'input.paging.pageSize',
      },

      // Do not query on mount: the grid starts empty and the first fetch happens
      // when the user runs the query. Without this the widget fetches before the
      // schema defaults have populated form data, sending a request with no
      // statement — which the resolver rejects, surfacing a pointless error.
      deferInitialLoad: true,

      // The query returns `{ data, paging, columns }`; the widget needs `data`
      // and `paging` projected onto its response shape. Columns are derived from
      // the returned rows (raw SQL cannot declare them ahead of time).
      resultMap: {
        'data': 'data',
        'paging': 'paging',
      },

      // Executing the query is an explicit user action, so the grid must
      // re-fetch when it happens. The widget subscribes to these events and
      // calls its own `refresh()` → `getData()`, re-running the query with the
      // current page. `useDataManager` emits this on submit for query-only
      // forms (see the SQL refresh event name below).
      refreshEvents: [{ name: 'core.SQLQueryForm@1.0.0::refresh' }],
    },
  },
};

export default uiSchema;
