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
    style: {
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
      comments: { sm: 12, md: 12, lg: 12 },
      newComment: { sm: 12, md: 12, lg: 12 },
    }
  ],
  comments: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'avatar',
          component: 'core.ImageComponent@1.0.0',
          props: {
            'ui:options': {
              variant: 'rounded'
            },
          },
          propsMap: {
            avatar: 'value',
          },
        },
        {
          title: "Who", field: "fullName"
        },
        {
          title: 'When',
          field: 'when',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.when).format(\'DD MMM YYYY HH:mm\')}'
              }
            },
          },
          propsMap: {
            'rowData.date': 'value',
          }
        },
        {
          title: "Comment", field: "comment"
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        fixedColumns: { left: 5, },
        tableLayout: 'fixed',
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.id': 'clientId',
      },
      resultMap: {
        '[].id': 'data.[].id',
        '[].who.fullName': 'data.[].fullName',
        '[].who.avatar': 'data.[].avatar',
        '[].when': 'data.[].when',
        '[].comment': 'data.[].comment',
      },
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

const commentSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    firstName: {
      type: "string",
      title: "First Name"
    },
    lastName: {
      type: "string",
      title: "Last Name"
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
    newComment: { ...commentSchema }
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
};

export default LasecCRMClientComments;

// NOT IN USE
/*
const editUiSchema: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    style: {
      marginTop: '16px',
    },
    schemaSelector: {
      variant: 'button',
      buttonTitle: 'CANCEL',
      activeColor: 'secondary',
      buttonVariant: "contained",
      selectSchemaId: 'display',
      style: {
        position: 'absolute',
        top: '-20px',
        right: 0,
      }
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      view: { sm: 12, md: 12, lg: 12 },
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
*/
