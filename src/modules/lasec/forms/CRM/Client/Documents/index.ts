import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from "../Schemas"
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
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
    showSubmit: false,
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
      documents: { md: 12 },
      inputDocument: { md: 12 },
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
  documents: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: "Title", field: "title"
        },
        {
          title: "Filename", field: "filename"
        },
        {
          title: "Size", field: "size"
        },
        {
          title: "Link", field: "link"
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      }
    }
  },
  inputDocument: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [      
      {
        title: { md: 6, sm: 12 },
        filename: { md: 6, sm: 12 },        
      },
      {
        link: {md: 12}
      }
    ],
    filename: {
      readOnly: true,
    },
    link: {
      'ui:widget': 'DropZoneWidget',
      'ui:options': {
        accept: ['text/html', 'text/text', 'application/xml'],
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
      documents: { md: 12 },
      inputDocument: { md: 12 },           
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
  documents: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: "Title", field: "title"
        },
        {
          title: "Filename", field: "filename"
        },
        {
          title: "Size", field: "size"
        },
        {
          title: "Link", field: "link"
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      }
    }
  },
  inputDocument: {

  },  
};

const documentSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      title: "Title"
    },
    filename: {
      type: "string",
      title: "Filename"
    },
    size: {
      type: "number",
      title: "Size"
    },
    link: {
      type: "string",
      title: "Link"
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
    documents: {
      type: "array",
      items: { ...documentSchema }
    },
    inputDocument: { ...documentSchema }
  }
};
schema.title = "DOCUMENTS"

const LasecCRMPersonalInformationForm: Reactory.IReactoryForm = {
  id: 'LasecCRMClientDocuments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client Documents',
  tags: ['CRM Client Documents'],
  registerAsComponent: true,
  name: 'LasecCRMClientDocuments',
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

export default LasecCRMPersonalInformationForm;
