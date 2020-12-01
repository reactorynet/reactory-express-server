import { Reactory } from '@reactory/server-core/types/reactory';
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'bottom',
    containerStyles: {
      padding: '24px',
      margin: '0px',
      paddingBottom: '8px'
    },
    // schemaSelector: {
    //   variant: 'button',
    //   buttonTitle: 'Edit',
    //   activeColor: 'primary',
    //   selectSchemaId: 'edit'
    // },
    style: {
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '24px'
  },
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    // {
    //   view: { lg: 12, sm: 12, md: 12 },
    // },
    {
      specialRequirements: { sm: 12 },
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
  specialRequirements: {
    'ui:widget': 'ClientSpecialRequirements',
    'ui:options': {}
  }
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

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      title: "Client ID"
    },
    specialRequirements: {
      type: 'string',
      title: 'Special Requirements'
    }
  }
};

schema.title = "SPECIAL REQUIREMENTS"
const LasecCRMSpecialRequirements: Reactory.IReactoryForm = {
  id: 'LasecCRMSpecialRequirements',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMSpecialRequirements',
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
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'lasec-crm.ClientSpecialRequirement@1.0.0', widget: 'ClientSpecialRequirements' },
    { componentFqn: 'lasec-crm.ClientCommentGrid@1.0.0', widget: 'ClientCommentGrid' },
  ],


};

export default LasecCRMSpecialRequirements;
