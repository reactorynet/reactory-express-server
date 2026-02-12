import Reactory from '@reactory/reactory-core';

const MaterialTableUIOptions: Reactory.Client.Components.IMaterialTableWidgetOptions = {
  showLabel: false,
  allowAdd: false,
  allowDelete: false,
  search: false, // Using custom toolbar search
  selection: true,
  paging: true,
  pageSize: 10,
  pageSizeOptions: [10, 25, 50, 100],
  remoteData: true,
  query: 'applicationUsers',
  resultMap: {
    'paging': 'paging',
    'users': 'data',
    'totalUsers': 'totalUsers'
  },
  variables: {
    'formContext.props.applicationId': 'clientId',
    'query.search': 'filter.searchString',
    'query.page': 'paging.page',
    'query.pageSize': 'paging.pageSize'
  },
  componentMap: {
    Toolbar: 'core.ApplicationUsersToolbar@1.0.0'
  },
  columns: [
    // User Avatar & Name
    {
      title: 'User',
      field: 'fullName',
      width: 250,
      component: 'UserAvatarWidget',
      propsMap: {
        'rowData': 'user'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'avatar-with-name',
            size: 'medium',
            showEmail: false,
            nameFormat: '${user.firstName} ${user.lastName}'
          }
        }
      },
      cellStyle: {
        paddingTop: 8,
        paddingBottom: 8
      }
    },

    // Email
    {
      title: 'Email',
      field: 'email',
      width: 250,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.email}',
            copyToClipboard: true,
            style: {
              color: '#1976d2',
              cursor: 'pointer'
            }
          }
        }
      }
    },

    // Mobile Number
    {
      title: 'Mobile',
      field: 'mobileNumber',
      width: 150,
      component: 'core.LabelComponent@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'body2',
            format: '${rowData.mobileNumber || "N/A"}',
            style: {
              fontFamily: 'monospace'
            }
          }
        }
      }
    },

    // Roles
    {
      title: 'Roles',
      field: 'memberships.0.roles',
      width: 200,
      component: 'core.ChipLabel@1.0.0',
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'outlined',
            size: 'small',
            color: 'primary'            
          }
        }
      }
    },

    // Status (Enabled/Disabled)
    {
      title: 'Status',
      field: 'memberships[0].enabled',
      width: 120,
      component: 'StatusBadgeWidget',
      propsMap: {
        'rowData.memberships': 'memberships'
      },
      props: {
        uiSchema: {
          'ui:options': {
            variant: 'filled',
            size: 'small',
            labelFormat: '${formData === true ? "Active" : "Inactive"}',
            colorMap: {
              'true': '#4caf50',
              'false': '#f44336'
            },
            iconMap: {
              'true': 'check_circle',
              'false': 'cancel'
            }
          }
        }
      }
    },

    // Last Login
    {
      title: 'Last Login',
      field: 'lastLogin',
      width: 180,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.memberships': 'memberships'
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
      }
    },

    // Created Date
    {
      title: 'Created',
      field: 'createdAt',
      width: 180,
      component: 'RelativeTimeWidget',
      propsMap: {
        'rowData.memberships': 'memberships'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'date',
            fallback: 'Unknown',
            tooltip: true,
            tooltipFormat: 'YYYY-MM-DD HH:mm:ss'
          }
        }
      },
      type: 'datetime'
    }
  ],

  onRowClick: (event: any, rowData: any) => {
    // Navigate to user detail view
    console.log('User clicked:', rowData);
  },

  detailPanel: [
    {
      tooltip: 'Show Details',
      render: (rowData: any) => {
        return {
          component: 'core.UserDetailPanel@1.0.0',
          props: {
            user: rowData,
            showMemberships: true,
            showActivity: true
          }
        };
      }
    }
  ],

  actions: [
    {
      key: 'edit',
      icon: 'edit',
      tooltip: 'Edit User'      
    },    
  ],

  options: {
    actionsColumnIndex: -1,
    showTitle: false,
    toolbar: true,
    searchFieldAlignment: 'left',
    searchFieldVariant: 'outlined',
    padding: 'default',
    headerStyle: {
      backgroundColor: '#f5f5f5',
      fontWeight: 600,
      fontSize: '0.875rem'
    },
    rowStyle: {
      fontSize: '0.875rem'
    }
  }
};

const usersTableUISchema: Reactory.Schema.IUISchema = {
  'ui:widget': 'MaterialTableWidget',
  'ui:title': null,
  'ui:options': MaterialTableUIOptions as Reactory.Schema.IUISchemaOptions
};

const BaseUISchema: Reactory.Schema.IFormUISchema = {
  'ui:form': {
    componentType: 'div',
    showSubmit: false,
    showRefresh: false,
    toolbarPosition: 'none', // We're using the custom toolbar in MaterialTable
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
  data: usersTableUISchema
};

export default GridUISchema;
