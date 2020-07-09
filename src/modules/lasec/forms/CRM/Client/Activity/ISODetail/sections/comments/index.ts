import { Reactory } from '@reactory/server-core/types/reactory'

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetSaleOrderComments',
    text: `query LasecGetSaleOrderComments($orderId: String!){
      LasecGetSaleOrderComments(orderId: $orderId){
        orderId
        comments {
          id
          comment
          when
          who {
            id
            firstName
            lastName
            fullName
            avatar
          }
        }
      }
    }`,
    variables: {
      'formData.orderId': 'orderId',
    },
    resultType: 'object',
    resultMap: {
      'orderId': 'orderId',
      'comments.[].id': 'comments.[].id',
      'comments.[].who.fullName': 'comments.[].fullName',
      'comments.[].who.avatar': 'comments.[].avatar',
      'comments.[].when': 'comments.[].when',
      'comments.[].comment': 'comments.[].comment',
    },
    queryMessage: 'Loading order comments',
    edit: false,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
    // autoQuery: true,
  },
  mutation: {
    new: {
      name: "LasecCRMSaveSaleOrderComment",
      text: `mutation LasecCRMSaveSaleOrderComment($orderId: String!, $comment: String!){
        LasecCRMSaveSaleOrderComment(orderId: $orderId, comment: $comment) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Save order comment',
      variables: {
        'formData.orderId': 'orderId',
        'formData.newComment': 'comment',
      },
      onSuccessMethod: 'refresh'
    },
    edit: {
      name: "LasecCRMSaveSaleOrderComment",
      text: `mutation LasecCRMSaveSaleOrderComment($orderId: String!, $comment: String!){
        LasecCRMSaveSaleOrderComment(orderId: $orderId, comment: $comment) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Save order comment',
      variables: {
        'formData.orderId': 'orderId',
        'formData.newComment': 'comment',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'COMMENTS',
  properties: {
    orderId: {
      type: 'string'
    },
    comments: {
      type: 'array',
      items: {
        type: 'object',
        title: 'Comments',
        properties: {
          comment: {
            type: 'string'
          },
        }
      },
    },
    newComment: {
      type: 'string',
      title: 'Add a Comment'
    }
  }
};

const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    // toolbarPosition: 'bottom',
    containerStyles: {
      padding: 0,
      margin: 0,
    },
    style: {
      padding: 0,
      margin: 0,
    },
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: false,
  },
  'ui:titleStyle': {
    borderBottom: '2px solid #D5D5D5',
    paddingBottom: '8px',
    marginBottom: '20px',
    fontSize: '1.1rem',
    fontWeight: 'bold'
  },
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      comments: { xs: 12 },
    },
    {
      newComment: { sm: 12, md: 12, lg: 12, style: { paddingTop: 0 } },
    },
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
            'rowData.avatar': 'value',
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
      },
      remoteData: false,
    }
  },
  newComment: {
    'ui:options': {
      component: 'TextField',
      componentProps: {
        multiline: true,
        variant: 'outlined',
        submitOnEnter: true
      }
    }
  }
};

const LasecCRMISODetailComments: Reactory.IReactoryForm = {
  id: 'LasecCRMISODetailComments',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'CRM Client ISO Detail',
  tags: ['CRM Client ISO Detail'],
  registerAsComponent: true,
  name: 'LasecCRMISODetailComments',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  schema: schema,
  uiSchema: uiSchema,
  graphql: graphql,
  defaultFormValue: {},
  widgetMap: [],
};

export default LasecCRMISODetailComments;
