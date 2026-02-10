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
    'filter.searchString': 'filter.searchString',
    'paging.page': 'paging.page',
    'paging.pageSize': 'paging.pageSize'
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
      field: 'memberships',
      width: 200,
      component: 'core.TagListComponent@1.0.0',
      propsMap: {
        'rowData.memberships': 'memberships'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: '${memberships && memberships[0] ? memberships[0].roles.join(", ") : "No roles"}',
            variant: 'chip',
            size: 'small',
            color: 'primary'
          }
        }
      },
      render: (rowData: any) => {
        const membership = rowData?.memberships?.[0];
        if (!membership?.roles || membership.roles.length === 0) {
          return 'No roles';
        }
        return membership.roles.join(', ');
      }
    },

    // Status (Enabled/Disabled)
    {
      title: 'Status',
      field: 'enabled',
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
            format: '${memberships && memberships[0] && memberships[0].enabled ? "Active" : "Inactive"}',
            colorMap: {
              'Active': '#4caf50',
              'Inactive': '#f44336'
            },
            iconMap: {
              'Active': 'check_circle',
              'Inactive': 'cancel'
            }
          }
        }
      },
      render: (rowData: any) => {
        const membership = rowData?.memberships?.[0];
        return membership?.enabled ? 'Active' : 'Inactive';
      }
    },

    // Last Login
    {
      title: 'Last Login',
      field: 'lastLogin',
      width: 180,
      component: 'core.DateTimeComponent@1.0.0',
      propsMap: {
        'rowData.lastLogin': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'relative', // e.g., "2 days ago"
            fallback: 'Never',
            variant: 'body2'
          }
        }
      },
      type: 'datetime',
      defaultSort: 'desc'
    },

    // Created Date
    {
      title: 'Created',
      field: 'createdAt',
      width: 180,
      component: 'core.DateTimeComponent@1.0.0',
      propsMap: {
        'rowData.createdAt': 'value'
      },
      props: {
        uiSchema: {
          'ui:options': {
            format: 'date', // e.g., "Jan 15, 2024"
            variant: 'body2'
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
      icon: 'edit',
      tooltip: 'Edit User',
      onClick: (event: any, rowData: any) => {
        console.log('Edit user:', rowData);
      }
    },
    {
      icon: 'person_off',
      tooltip: 'Disable User',
      onClick: (event: any, rowData: any) => {
        console.log('Disable user:', rowData);
      },
      hidden: (rowData: any) => {
        const membership = rowData?.memberships?.[0];
        return !membership?.enabled;
      }
    },
    {
      icon: 'person',
      tooltip: 'Enable User',
      onClick: (event: any, rowData: any) => {
        console.log('Enable user:', rowData);
      },
      hidden: (rowData: any) => {
        const membership = rowData?.memberships?.[0];
        return membership?.enabled !== false;
      }
    }
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
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      data: { xs: 12, sm: 12, md: 12, lg: 12, xl: 12 }
    }
  ]
};

export const GridUISchema: Reactory.Schema.IUISchema = {
  ...BaseUISchema,
  data: usersTableUISchema
};

export default GridUISchema;
