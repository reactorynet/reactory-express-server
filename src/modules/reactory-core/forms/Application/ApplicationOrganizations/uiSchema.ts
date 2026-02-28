import Reactory from '@reactorynet/reactory-core';

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false, // Using custom toolbar search
  selection: false,
  paging: true,
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  remoteData: true,
  query: 'pagedOrganizations',
  resultMap: {
    'paging': 'paging',
    'organizations': 'data',
    'paging.total': 'totalOrganizations'
  },
  variables: {
    'query.search': 'search',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize'
  },
  componentMap: {
    Toolbar: 'core.ApplicationOrganizationsToolbar@1.0.0',
    DetailsPanel: 'core.OrganizationDetailsPanel@1.0.0'
  },
  columns: [
    // Organization Avatar & Name
    {
      title: 'Organization',
      field: 'name',
      width: 280,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body1',
            format: '${rowData.name}',
            style: {
              fontWeight: 600
            }
          }
        }
      },
      cellStyle: {
        paddingTop: 8,
        paddingBottom: 8
      }
    },

    // Code
    {
      title: 'Code',
      field: 'code',
      width: 120,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.code || "N/A"}',
            copyToClipboard: true,
            style: {
              fontFamily: 'monospace',
              color: '#1976d2'
            }
          }
        }
      }
    },

    // Trading Name
    {
      title: 'Trading Name',
      field: 'tradingName',
      width: 220,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.tradingName || "—"}',
            style: {
              color: '#555'
            }
          }
        }
      }
    },

    // Business Units Count
    {
      title: 'Business Units',
      field: 'businessUnits',
      width: 140,
      align: 'center' as const,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${(rowData.businessUnits || []).length}',
            style: {
              fontWeight: 500
            }
          }
        }
      },
      type: 'numeric'
    },

    // Created Date
    {
      title: 'Created',
      field: 'createdAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.createdAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            fallback: 'Unknown',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss'
          }
        }
      },
      type: 'datetime'
    },

    // Updated Date
    {
      title: 'Updated',
      field: 'updatedAt',
      width: 150,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.updatedAt': 'date'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative',
            fallback: 'Never',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss'
          }
        }
      },
      type: 'datetime'
    }
  ],

  // Detail panel configuration - uses OrganizationDetailsPanel
  detailPanel: [
    {
      tooltip: 'Show Details',
      render: (rowData: any) => {
        return {
          component: 'core.OrganizationDetailsPanel@1.0.0',
          props: {
            organization: rowData,
          }
        };
      }
    }
  ],

  detailPanelProps: {
    useCase: 'grid'
  },

  detailPanelPropsMap: {
    'props.rowData': 'organization',
  },

  actions: [
    {
      key: 'view',
      icon: 'visibility',
      tooltip: 'View Details'
    },
    {
      key: 'edit',
      icon: 'edit',
      tooltip: 'Edit Organization'
    },
  ],

  options: {
    actionsColumnIndex: -1,
    showTitle: false,
    toolbar: true,
    searchFieldAlignment: 'left',
    searchFieldVariant: 'outlined',
    padding: 'default',
    detailPanelType: 'single',
    showDetailPanelIcon: true,
    detailPanelColumnAlignment: 'left',
    headerStyle: {
      backgroundColor: '#f5f5f5',
      fontWeight: 600,
      fontSize: '0.875rem'
    },
    rowStyle: {
      fontSize: '0.875rem'
    }
  },

  refreshEvents: [
    { name: 'core.OrganizationCreatedEvent' },
    { name: 'core.OrganizationUpdatedEvent' }
  ]
};

const organizationsTableUISchema: Reactory.Schema.IUISchema = {
  'ui:widget': 'MaterialTableWidget',
  'ui:title': null,
  'ui:options': MaterialTableUIOptions as Reactory.Schema.IUISchemaOptions
};

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'none',
    style: {
      padding: 0
    },
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      data: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ]
};

export const GridUISchema: Reactory.Schema.IUISchema = {
  'ui:title': null,
  ...BaseUISchema,
  data: organizationsTableUISchema
};

export default GridUISchema;
