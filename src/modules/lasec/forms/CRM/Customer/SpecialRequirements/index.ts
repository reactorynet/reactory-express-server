import { Reactory } from '@reactory/server-core/types/reactory';
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:graphql': graphql,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'Edit',
      activeColor: 'primary',
      selectSchemaId: 'edit',
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px'
  },
  'ui:grid-options': {
    containerStyles: {
      padding: '24px 24px'
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { lg: 12, sm: 12, md: 12 },
    },
    {
      specialRequirements: { sm: 12 },
      style: { padding: '50px 32px 32px' }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  specialRequirements: {
    'ui:widget': 'LabelWidget',
    'ui:options': {
      readOnly: true,
      format: '${formData}',
      variant: 'subtitle1',
      title: 'Special Requirements',
      titleProps: {
        style: {
          display: 'content',
          minWidth: '150px',
          color: "#9A9A9A",
        }
      },
      bodyProps: {
        style: {
          display: 'flex',
          justifyContent: 'flex-end'
        }
      }
    }
  },
  // specialRequirements: {
  //   'ui:widget': 'ClientSpecialRequirements',
  //   'ui:options': {}
  // }
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
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      selectSchemaId: 'display',
      style: {
        position: 'absolute',
        right: '10px',
        top: '-3px'
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    containerStyles: {
      padding: '24px'
    }
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '10px'
  },
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
    },
    {
      specialRequirements: { sm: 12 },
      style: { padding: '40px 32px 32px' }
    }
  ],
  view: {
    'ui:widget': 'SchemaSelectorWidget',
    'ui:options': {
      style: {
        width: '100%',
        float: "right"
      },
    }
  },
  specialRequirements: {
    'ui:widget': 'ClientSpecialRequirements',
    'ui:options': {}
  }
};

const schema: Reactory.ISchema = {
  type: "object",
  properties: {
    view: {
      title: '',
      type: 'string'
    },
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
  // graphql,
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
