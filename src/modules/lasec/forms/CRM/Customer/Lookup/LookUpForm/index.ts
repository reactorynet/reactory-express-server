import { Reactory } from '@reactory/server-core/types/reactory'
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
    componentType: 'div',
    submitIcon: 'search',
    showSubmit: true,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    { search: { xs: 12, sm: 12, md: 6, lg: 4 } },
    { customers: { xs: 12, sm: 12, md: 12, lg: 12 } },
  ],
  search: {
    'ui:options': {
      showLabel: false,
      icon: 'search',
      component: "TextField",
      componentProps: {        
        variant: "outlined",
        type: 'search',
        style: {
          minWidth: '180px'
        }
      }
    }
  },
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  customers: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: "Name", field: "registeredName" },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        //selection: true,
        //multiSelect: false,
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
          mutation: 'onSelectCustomer',
          variables: {            
            'selected': 'newClient.customer',
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
        'customers': 'data',
      },      
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
    customers: {
      type: 'array',
      items: {
        id: {
          type: "string",
          title: "Customer Id"
        },
        registeredName: {
          type: "string",
          title: "Registered Name"
        },        
      },
    }
  }
};

const LasecCRMCustomerLookupForm: Reactory.IReactoryForm = {
  id: 'LasecCRMCustomerLookupTable',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Customer Lookup Table',
  tags: ['CRM Customer Lookup Table'],
  registerAsComponent: true,
  name: 'LasecCRMCustomerLookupTable',
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
      icon: 'view',
      uiSchema: uiSchema,
      title: 'New',
      description: ''
    },
  ],
  graphql: $graphql,  
  widgetMap: [],
  defaultFormValue: {
    paging: { page: 1, pageSize: 10 },
    search: "",
    customers: []
  }
};

export default LasecCRMCustomerLookupForm;
