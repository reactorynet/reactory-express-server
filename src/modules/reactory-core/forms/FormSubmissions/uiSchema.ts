import Reactory from '@reactorynet/reactory-core';

/**
 * The submissions table.
 *
 * Columns are deliberately generic - the shape of `formData` differs per form,
 * so the table shows the submission envelope (who, when, from where) and hands
 * the document itself to the detail panel, which renders it against the target
 * form's own schema.
 */
const tableOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false,
  remoteData: true,
  query: 'submissions',
  columns: [
    {
      title: 'Received',
      field: 'createdAt',
      width: 170,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.createdAt': 'date',
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss',
          },
        },
      },
      type: 'datetime',
      defaultSort: 'desc',
    },
    {
      title: 'Submitted by',
      field: 'user',
      width: 220,
      component: 'UserAvatarWidget',
      propsMap: {
        'rowData.user': 'user',
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'chip',
            size: 'small',
            showEmail: true,
            unassignedText: 'Anonymous',
            unassignedIcon: 'person_outline',
          },
        },
      },
    },
    {
      title: 'IP address',
      field: 'ipAddress',
      width: 150,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.ipAddress || "—"}',
            copyToClipboard: true,
            style: {
              fontFamily: 'monospace',
            },
          },
        },
      },
    },
    {
      title: 'Data',
      field: 'formData',
      component: 'core.ReactoryFormSubmissionSummary@1.0.0',
      propsMap: {
        'rowData.formData': 'formData',
      },
    },
    {
      title: 'Id',
      field: 'id',
      width: 120,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'caption',
            format: '${(rowData.id || "").substring(0, 8)}',
            copyToClipboard: true,
            style: {
              fontFamily: 'monospace',
            },
          },
        },
      },
    },
  ],
  componentMap: {
    DetailsPanel: 'core.ReactoryFormSubmissionDetail@1.0.0',
  },
  detailPanelPropsMap: {
    'props.rowData': 'submission',
    'formContext.formData.fqn': 'fqn',
  },
  options: {
    pageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
    grouping: false,
    sorting: true,
    toolbar: true,
  },
};

const uiSchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: true,
    toolbarPosition: 'top',
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      filter: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
    {
      submissions: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 },
    },
  ],
  fqn: {
    'ui:widget': 'HiddenWidget',
  },
  filter: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        from: { xs: 12, sm: 6, md: 3 },
        to: { xs: 12, sm: 6, md: 3 },
        userId: { xs: 12, sm: 6, md: 3 },
        anonymous: { xs: 12, sm: 6, md: 3 },
      },
      {
        search: { xs: 12, md: 4 },
        query: { xs: 12, md: 8 },
      },
    ],
    from: {
      'ui:widget': 'DateSelectorWidget',
    },
    to: {
      'ui:widget': 'DateSelectorWidget',
    },
    userId: {
      'ui:options': {
        placeholder: 'User id',
      },
    },
    search: {
      'ui:options': {
        placeholder: 'Search inside the submitted data',
      },
    },
    query: {
      'ui:widget': 'core.ReactoryFormSubmissionQueryBuilder@1.0.0',
    },
  },
  submissions: {
    'ui:widget': 'MaterialTableWidget',
    'ui:title': null,
    'ui:options': tableOptions as unknown as Reactory.Schema.IUISchemaOptions,
  },
};

export default uiSchema;
