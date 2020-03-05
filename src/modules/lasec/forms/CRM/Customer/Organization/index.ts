import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from "../Schemas"
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'bottom',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit'
    },
    style:{
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { md: 12 },      
    },
    {
      comments: { md: 12 },
      newComment: { md: 12 },                
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'relative'
      },
    }
  },  
  comments: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: "Who", field: "fullName"
        },
        {
          title: "When", field: "filename"
        },
        {
          title: "Comment", field: "size"
        },        
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      }
    }
  },
  newComment: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [      
      {
        comment: { md: 12, sm: 12 },        
      },      
    ],
    comment: {
      'ui:options': {
        component: 'TextField',
        componentProps: {
          multiline: true,
          variant: 'outlined'
        }
      }      
    }
  },
};

const editUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { md: 12 },      
    },
    {
      comments: { md: 12 },
      newComment: { md: 12 },                
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        top: '10px',
        right: '10px',
        position: 'relative'
      },
    },
  },  
  comments: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      title: 'Client Comments',
      columns: [
        {
          title: "Who", field: "fullName"
        },
        {
          title: "When", field: "filename"
        },
        {
          title: "Comment", field: "size"
        },        
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      }
    },
  },
  newComment: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [      
      {
        comment: { md: 12, sm: 12 },        
      },      
    ],
    comment: {
      'ui:options': {
        component: 'TextField',
        componentProps: {
          multiline: true,
          variant: 'outlined'
        }
      }
    }
  },
};


const commentSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    comment: {
      type: "string",
      title: "comment"
    },
    fullName: {
      type: "string",
      title: "userName"
    },
    avatar: {
      type: "string",
      title: "Avatar"
    },
    when: {
      type: "string",
      format: "date",
      title: "when"
    },    
  }
}; 

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      title: "Client ID"
    },    
  }
};

schema.title = "ORGANIZATION DETAILS";

const LasecCRMCustomerOrganizationDetails: Reactory.IReactoryForm = {
  id: 'LasecCRMCustomerOrganizationDetails',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMCustomerOrganizationDetails',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  uiSchema: displayUiSchema,
  uiSchemas: [
    {
      id: 'display',
      title: 'VIEW',
      key: 'display',
      description: 'View Contact Details',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Edit Contact Details',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
  ],
  defaultFormValue: {
    
  },

};

export default LasecCRMCustomerOrganizationDetails;
