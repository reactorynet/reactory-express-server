import { Reactory } from '@reactory/server-core/types/reactory';
import graphql from './graphql';

const displayUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'bottom',
    submitIcon: 'sms',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      marginTop: '16px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '10px',
    marginBottom: '16px'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      comments: { sm: 12, md: 12, lg: 12, style: { paddingTop: '10px' } },
    },
    {
      newComment: { sm: 12, md: 12, lg: 12, style: { paddingTop: 0 } },
    }
  ],

  comments: {
    'ui:widget': 'ClientCommentGrid',
  },
  
  newComment: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        multiline: true,
        variant: 'outlined',
        submitOnEnter: true,
        fullWidth: true,
      }
    }
  }
};

const commentSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    fullName: {
      type: "string",
      title: "Full Name"
    },
    comment: {
      type: "string",
      title: "comment"
    },
    avatar: {
      type: "string",
      title: "Avatar"
    },
    when: {
      type: "string",
      format: "string",
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
    comments: {
      type: "array",
      items: { ...commentSchema }
    },
    newComment: {
      type: 'string',
      title: 'New Comment'
    }
  }
};

schema.title = "COMMENTS"
const LasecCRMClientComments: Reactory.IReactoryForm = {
  id: 'LasecCRMClientComments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Personal Information',
  tags: ['CRM Personal Information'],
  registerAsComponent: true,
  name: 'LasecCRMClientComments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  graphql,
  uiSchema: displayUiSchema,
  defaultFormValue: {},
  widgetMap: [
    { componentFqn: 'lasec-crm.ClientCommentGrid@1.0.0', widget: 'ClientCommentGrid' },
  ],
};

export default LasecCRMClientComments;
