import { Reactory } from '@reactory/server-core/types/reactory';
import $graphql, { newClientGraphQL } from './graphql';

const uiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },    
    submitIcon: 'search',
    componentType: "div",
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      search: { sm: 12, md: 6 },
      addNew: { sm: 12, md: 6 },
    },
    { organisations: { sm: 12 } },
  ],
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  addNew: {
    'ui:widget': 'SlideOutLauncher',
    'ui:options': {
      props: {
        componentFqn: 'lasec-crm.LasecCRMNewOrganisation@1.0.0',
        componentProps: {},
        slideDirection: 'down',
        buttonVariant: 'Typography',
        buttonTitle: 'Add New Organisation',
        buttonProps: {
          color: 'primary',
          style: {
            fontWeight: 'bold',
            fontSize: '16px'
          }
        },
        windowTitle: 'Add New Organisation',
      },
      propertyMap: {},
      fullWidth:false
    }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  organisations: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: "Organisation Name", field: "name" },
        { title: "Organisation Number", field: "id" },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        //selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      actions: [
        {
          icon: 'done_outline',
          tooltip: 'Select Organization',          
          iconProps: {
            color: 'success'
          },
          mutation: 'onSelectOrganization',
          successMessage: 'Organization ${selected.name} selected',
          errorMessage: 'Could not set ${selected.name} organization',
          variables: {            
            'selected': 'newClient.organization',
          },                                 
        },   
      ],
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'organisations': 'data',
      },
      resultType: 'object',
    }
  },
};

const newUiSchema: any = {
  'ui:graphql': newClientGraphQL,
  'ui:options': {
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '16px'
    },
    style: {
      marginTop: '0',
    },    
    submitIcon: 'search',
    componentType: "div",
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      search: { xs: 12, sm: 12, md: 6, lg: 6 },
      addNew: { sm: 12, md: 6 },
    },
    { organisations: { sm: 12 } },
  ],
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {
        placeholder: 'Search',
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  addNew: {
    'ui:widget': 'SlideOutLauncher',
    'ui:options': {
      props: {
        componentFqn: 'lasec-crm.LasecCRMNewOrganisation@1.0.0',
        componentProps: {},
        slideDirection: 'down',
        buttonVariant: 'Typography',
        buttonTitle: 'Add New Organisation',
        buttonProps: {
          color: 'primary',
          style: {
            fontWeight: 'bold',
            fontSize: '16px'
          }
        },
        windowTitle: 'Add New Organisation',
      },
      propertyMap: {},
      fullWidth:false
    }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  organisations: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: "Organisation Name", field: "name" },
        { title: "Organisation Number", field: "id" },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        //selection: true,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1
      },
      actions: [
        {
          icon: 'done_outline',
          tooltip: 'Select Organization',          
          iconProps: {
            color: 'success'
          },
          mutation: 'onSelectOrganization',
          variables: {            
            'selected': 'newClient.organization',
          },                                 
        },   
      ],
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'organisations': 'data',
      },
      resultType: 'object',
    }
  },
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: "",
  properties: {
    search: {
      type: 'string',
      title: 'Search'
    },
    addNew: {
      type: 'string',
      title: 'Add New Organisation'
    },
    paging: {
      type: 'object',
      title: 'Paging',
      properties: {
        total: {
          type: 'number'
        },
        page: {
          type: 'number'
        },
        pageSize: {
          type: 'number'
        },
        hasNext: {
          type: 'boolean'
        }
      }
    },
    organisations: {
      type: 'array',
      items: {
        id: {
          type: "string",
          title: "Organisation Number"
        },
        name: {
          type: "string",
          title: "Organisation Name"
        },
      },
    }
  }
};

const LasecCRMOrganisationLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMOrganisationLookupTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Organisation Lookup Table',
  tags: ['CRM Organisation Lookup Table'],
  registerAsComponent: true,
  name: 'LasecCRMOrganisationLookupTable',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  uiSchemas: [
    {
      id: 'display',
      key: 'display',
      icon: 'view',
      uiSchema: uiSchema,
      title: 'View',
      description: ''
    },
    {
      id: 'new',
      key: 'new',
      icon: 'add',
      uiSchema: newUiSchema,
      title: 'New',
      description: 'New Ui Schema'
    },
  ],
  graphql: $graphql,
  widgetMap: [
    {
      componentFqn: 'core.SlideOutLauncher@1.0.0',
      widget: 'SlideOutLauncher'
    },
  ],
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    organisations: []
  }
};

export default LasecCRMOrganisationLookupForm;
