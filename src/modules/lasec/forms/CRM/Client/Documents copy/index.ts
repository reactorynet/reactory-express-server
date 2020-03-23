import { Reactory } from './node_modules/@reactory/server-core/types/reactory'
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
          title: "Title", field: "name"
        },
        {
          title: "Link", field: "url"
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
      'ui:widget': 'ReactoryDropZoneWidget',
      'ui:options': {
        //main container styles
        style: {

        },
        //properties for Reactory DropZone
        ReactoryDropZoneProps: {
          text: `Drop files here, or click to select files to upload`,
          accept: ['text/html', 'text/text', 'application/xml', 'application/pdf'],
          uploadOnDrop: true,
          mutation: 'new',
          iconProps: {
            icon: 'upload',
            color: 'secondary'
          },
          labelProps: {
            style: {
              display: 'block',
              paddingTop: '95px',
              height: '200px',
              textAlign: 'center',
            }
          },
          style: {
            minHeight: `200px`,
            outline: '1px dashed #E8E8E8'
          }
        },
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
          title: "Title", field: "name"
        },
        {
          title: "Link", field: "url"
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

const LasecCRMClientDocuments: Reactory.IReactoryForm = {
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
      description: 'View Documents',
      icon: 'list',
      uiSchema: displayUiSchema,
    },
    {
      id: 'edit',
      title: 'EDIT',
      key: 'edit',
      description: 'Manage Documents',
      icon: 'view_module',
      uiSchema: editUiSchema,
    },
    {
      id: 'new',
      title: 'EDIT',
      key: 'new',
      description: 'Manage Documents',
      icon: 'upload',
      uiSchema: editUiSchema,
    },
  ],
  defaultFormValue: {

  },
};

export default LasecCRMClientDocuments;
