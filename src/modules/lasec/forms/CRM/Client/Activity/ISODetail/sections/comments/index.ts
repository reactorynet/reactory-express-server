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
      'data.orderId': 'orderId',
    },
    resultType: 'object',
    resultMap: {
      'orderId': 'orderId',
      'comments': 'comments'
    },
    queryMessage: 'Loading order comments',
    refreshEvents: [
      { name: 'lasec-crm:sales-order-comment-added' }
    ],
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
      name: "LasecAddSaleOrderComment",
      text: `mutation LasecAddSaleOrderComment($orderId: String!, $comment: String!){
        LasecAddSaleOrderComment(orderId: $orderId, comment: $comment) {          
          id
          comment
          who {
            id
            firstName
            lastName
            fullName
            avatar
          }
          when
        }
      }`,
      objectMap: true,
      updateMessage: 'Save order comment',
      variables: {
        'formData.orderId': 'orderId',
        'formData.newComment': 'comment',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Comment has been added to sales order ${formData.orderId}',
        props: {
          type: 'success',
          timeOut: 2500,
          canDismiss: false,
        }
      },
      onSuccessEvent: {
        name: 'lasec-crm:sales-order-comment-added'
      }
    },
    edit: {
      name: "LasecAddSaleOrderComment",
      text: `mutation LasecCRMSaveSaleOrderComment($orderId: String!, $comment: String!){
        LasecCRMSaveSaleOrderComment(orderId: $orderId, comment: $comment) {
          id
          comment
          who {
            id
            firstName
            lastName
            fullName
            avatar
          }
          when
        }
      }`,
      objectMap: true,
      updateMessage: 'Save order comment',
      variables: {
        'formData.orderId': 'orderId',
        'formData.newComment': 'comment',
      },


    }
  }
};

const schema: Reactory.ISchema = {
  type: 'object',
  title: 'COMMENTS',
  properties: {
    orderId: {
      type: 'string',
      title: 'Order Id'
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
    submitIcon: 'chat',
    showSchemaSelectorInToolbar: false,
    showSubmit: true,
    showRefresh: true,
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
          title: "Who", field: "fullName",
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.who.fullName}'
              }
            },
          },
          propsMap: {
            'rowData': 'rowData',
          }
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
        //submitOnEnter: true
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
  eventBubbles: [
    { eventName: "onChange", action: "swallow" }
  ]
};

export default LasecCRMISODetailComments;
