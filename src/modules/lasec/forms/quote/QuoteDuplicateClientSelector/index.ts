import { Reactory } from '@reactory/server-core/types/reactory'
import { ClientSchema } from '../../CRM/Client/Schemas';

const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    newQuoteId: {
      type: 'string',
      title: 'New Quote Id',
    },
    repCode: {
      type: 'string',
      title: 'Rep Code',
    },
    search: {
      type: 'string',
      title: 'Search',
    },
    filterBy: {
      type: 'string',
      title: 'FilterBy'
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
    clients: {
      type: 'array',
      items: ClientSchema
    },
    selectedClient: {
      ...ClientSchema,
      title: 'Selected Client'
    },
  }
};

const uiSchema: any = {
  'ui:options': {
    toolbarPosition: 'none',
    componentType: "div",
    container: "div",
    showRefresh: false,
    submitIcon: 'check',
    showSubmit: false,
    containerStyles: {
      marginTop: '16px',
      padding: 0,
      boxShadow: 'none',
      border: 'none'
    },
    style: {
      padding: 0,
      margin: 0,
      boxShadow: 'none',
      border: 'none',
    }
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
    containerStyle: {
      padding: 0,
      margin: 0
    }
  },
  'ui:grid-layout': [
    {
      repCode: { lg: 6, md: 6, sm: 6, xs: 12 },
      search: { lg: 6, md: 6, sm: 6, xs: 12 },
    },
    {
      clients: { lg: 12, md: 12, sm: 12, xs: 12 },
    },
    {
      selectedClient: { lg: 12, md: 12, sm: 12, xs: 12 }
    }
  ],

  repCode: {
    'ui:widget': 'RepCodeFilter',
    'ui:options': {
      props: {
        multiple: false
      }
    }
  },
  clientSearchInput: {

  },
  clients: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: 'Client Status', field: 'clientStatus',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'active',
                    icon: 'trip_origin',
                    style: {
                      color: '#5EB848'
                    },
                    tooltip: 'Client Active'
                  },
                  {
                    key: 'unfinished',
                    icon: 'trip_origin',
                    style: {
                      color: '#FF9901'
                    },
                    tooltip: 'Client Unfinished'
                  },
                  {
                    key: 'deactivated',
                    icon: 'trip_origin',
                    style: {
                      color: '#AB1257'
                    },
                    tooltip: 'Client Deactivated'
                  }
                ]
              },
              style: {
                marginRight: '8px',
                marginTop: '8px',
              },
              propsMap: {
                'rowData.clientStatus': 'value',
              },
            }
          ],
          propsMap: {
            'rowData.clientStatus': 'selectedKey'
          },
          breakpoint: 'xs'

        },
        {
          title: 'Client Full Name',
          field: 'fullName',
          component: 'core.SlideOutLauncher@1.0.0',
          props: {
            componentFqn: 'lasec-crm.LasecCRMClientDetail@1.0.0',
            componentProps: {
              'rowData.id': 'formData.id',
              'rowData.salesTeam': 'formData.salesTeam',
            },
            childProps: {
              mode: 'view',
              uiSchemaKey: 'view'
            },
            slideDirection: 'down',
            buttonTitle: '${rowData.fullName}',
            buttonVariant: 'Typography',
            buttonProps: {
              style: {
                'textDecoration': 'underline',
                'cursor': 'pointer',
                'color': 'black'
              }
            },
            windowTitle: 'Client details: ${rowData.fullName}',
          },
          propsMap: {
            'rowData': 'rowData',
          },
        },
        {
          title: 'Customer',
          field: 'customer',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.customer && rowData.customer.tradingName ? rowData.customer.tradingName : "No Trading Name"}'
              }
            },
          },
          propsMap: {
            'rowData': 'value',
          },
          breakpoint: 'md',
        },
        {
          title: 'Sales Team',
          field: 'salesTeam',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${rowData.salesTeam}'
              }
            },
          },
          propsMap: {
            'rowData': 'value',
          },
          breakpoint: 'md',
        },
      ],
      actions: [
        {
          icon: 'check',
          tooltip: 'Click to select client',
          event: {
            via: 'api',
            name: 'onClientSelectedForQuoteDuplicate',
            paramsMap: {
              'selected': 'selectedClient'
            }
          }
        }
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: true,
        selection: false,
        toolbarButtonAlignment: 'left',
        actionsColumnIndex: -1,
        searchText: '${props.formContext.$formData.repCode}',
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.search': 'search',
        'props.formContext.$formData.paging': 'paging',
        'props.formContext.$formData.filterBy': 'filterBy',
        'props.formContext.$formData.filter': 'filter',
        'props.formCOntext.$formData.repCode': 'repCode'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'clients': 'data',
      },
      resultType: 'object',
    },
  },
  selectedClient: {
    'ui:widget': 'HiddenWidget',
  },
};

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientList',
    text: `query LasecGetClientList($search: String!, $paging: PagingRequest, $filterBy: String, $filter: String, $repCode: String){
      LasecGetClientList(search: $search, paging: $paging, filterBy: $filterBy, filter: $filter, repCode: $repCode){
        paging {
          total
          page
          hasNext
          pageSize
        }
        clients {
          id
          clientStatus
          fullName
          emailAddress
          country
          salesTeam
          customer {
            id
            tradingName
            accountNumber
            customerStatus
            country
          }
        }
      }
    }`,
    variables: {
      'formData.search': 'search',
      'formData.paging': 'paging',
      'formData.filterBy': 'filterBy',
      'formData.repCode': 'repCode'
    },
    resultMap: {
      'paging': 'paging',
      'filterBy': 'filterBy',
      'clients': 'clients',
    },

  },
  mutation: {
    new: {
      name: 'LasecCreateNewQuoteForClient',
      text: `mutation LasecCRMDuplicateQuoteForClient ($quoteId: String!, $clientId: String!) {
        LasecCRMDuplicateQuoteForClient (quoteId: $quoteId, clientId: $clientId) {
          success
          message
          quoteId
        }
      }`,
      objectMap: true,
      updateMessage: 'Duplicate quote',

      variables: {
        'formData.code': 'quoteId',
        'formData.selectedClient.id': 'clientId',
      },
      options: {},
      resultMap: {
        'success': 'formData.success',
        'message': 'formData.message',
        'quoteId': 'formData.newQuoteId',
      },
      resultType: "object",
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        type: "success",
        title: 'New quote created ${formData.newQuoteId}',
      }
    },
  },
};

const LasecQuoteDuplicateClientSelectorForm: Reactory.IReactoryForm = {
  id: 'LasecQuoteDuplicateClientSelectorForm',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Quote Duplicate Client Selector',
  tags: ['Quote Duplicate Client Selector'],
  registerAsComponent: true,
  name: 'LasecQuoteDuplicateClientSelectorForm',
  nameSpace: 'lasec-crm',
  version: '1.0.0',
  widgetMap: [
    { componentFqn: 'lasec-crm.RepCodeFilter@1.0.0', widget: 'RepCodeFilter' },
    { componentFqn: 'lasec-crm.ClientFilter@1.0.0', widget: 'ClientFilter' },
    { componentFqn: 'lasec-crm.LasecClientLabel@1.0.0', widget: 'LasecClientLabel' }
  ],
  schema: schema,
  graphql: graphql,
  uiSchema: uiSchema,
  defaultFormValue: {
    paging: {
      page: 1,
      pageSize: 10,
    },
    filterBy: "any_field",
    search: "",
    clients: [],
  }
};

export default LasecQuoteDuplicateClientSelectorForm;
