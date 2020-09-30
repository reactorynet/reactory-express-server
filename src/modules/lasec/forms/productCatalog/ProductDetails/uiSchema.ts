// TABLE
export const uiSchemaTable: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
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
  'ui:grid-layout': [
    { view: { sm: 12, md: 12, lg: 12 } },
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
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
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'onSyspro',
          width: '200px',
          components: [
            {
              component: 'core.ConditionalIconComponent@1.0.0',
              props: {
                'ui:options': {},
                conditions: [
                  {
                    key: 'on_syspro',
                    // icon: 'error',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#9AD86E'
                    },
                    tooltip: 'ON SYSPRO'
                  },
                  {
                    key: 'not_on_syspro',
                    // icon: 'error',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'NOT ON SYSPRO'
                  },
                  {
                    key: 'on_hold',
                    // icon: 'error',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'ON HOLD'
                  },
                  {
                    key: 'on_partial_hold',
                    // icon: 'error',
                    icon: 'OnSyspro',
                    iconType: 'reactory',
                    style: {
                      color: '#f7b425'
                    },
                    tooltip: 'ON PARTIAL HOLD'
                  },
                ]
              },
              propsMap: {
                'rowData.onSyspro': 'value',
              },
            },
            {
              component: 'core.ImageComponent@1.0.0',
              props: {
                'ui:options': {
                  variant: 'rounded',
                  style: {
                    marginLeft: '16px'
                  }
                },
              },
              propsMap: {
                'rowData.image': 'value',
              },
            },
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.LasecAddProductToQuote@1.0.0',
                componentProps: {
                  'rowData.code': 'formData.id'
                },
                slideDirection: 'down',
                buttonVariant: 'Fab',
                buttonProps: {
                  color: "#23A06A",
                  size: 'small',
                  style: {
                    marginLeft: '16px',
                    backgroundColor: "#23A06A"
                  }
                },
                buttonIcon: 'add',
                windowTitle: 'Add to quote ${rowData.code}',
              },
            }
          ],
          cellStyle: {
            maxWidth: '200px',
            width: '200px'
          },
          headerStyles: {
            maxWidth: '200px',
            width: '200px'
          }
        },
        {
          title: 'Stock Code',
          field: 'code',
          components: [
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.LasecProductDetails@1.0.0',
                componentProps: {
                  'rowData': 'formData',
                },
                slideDirection: 'left',
                buttonVariant: 'button',
                buttonProps: {
                  size: 'small',
                },
                buttonIcon: 'launch',
                windowTitle: '${rowData.code} ${rowData.name}',
              },
            },
            {
              component: 'core.LabelComponent@1.0.0',
              props: {
                uiSchema: {
                  'ui:options': {
                    variant: 'p',
                    copyToClipboard: true,
                    format: '${rowData.code}',
                    bodyProps: {

                    }
                  }
                },
              },
              propsMap: {
                'rowData.code': 'value',
              }
            },
          ],
        },
        { title: 'Description', field: 'name' },
        {
          title: 'Unit of Measure',
          field: 'unitOfMeasure',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'square_foot',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.unitOfMeasure}'
              }
            },
          },
        },
        {
          title: 'Buyer',
          field: 'buyer',
          components: [
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.ProductInquiryWrapper@1.0.0',
                componentProps: {
                  'rowData': 'formData',
                  'api': 'api',
                },
                childProps: {
                  context: 'buyer'
                },
                slideDirection: 'down',
                buttonTitle: '${rowData.buyer}',
                windowTitle: 'Send email to ${rowData.buyer || "all buyers"} (Buyer) re: ${rowData.code}',
              },
            },
          ],
        },
        {
          title: 'Planner',
          field: 'planner',
          components: [
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.ProductInquiryWrapper@1.0.0',
                componentProps: {
                  'rowData': 'formData',
                  'api': 'api',
                },
                childProps: {
                  context: 'planner'
                },
                slideDirection: 'down',
                buttonTitle: '${rowData.planner}',
                windowTitle: 'Send email to ${rowData.planner || "all planners"} (Planner) re: ${rowData.code}',
              },
            },
          ],
        },
        { title: 'Is Hazardous', field: 'isHazardous' },
        { title: 'Site Evaluation', field: 'siteEvaluationRequired' },
        { title: 'Product Class', field: 'productClass' },
        { title: 'Tariff Code', field: 'tariffCode' },
        { title: 'Lead Time', field: 'leadTime' },
        {
          title: 'Valid Price Until',
          field: 'validPriceUntil',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.validPriceUntil).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.validPriceUntil': 'value',
          }
        },
        { title: 'Last Updated', field: 'lastUpdated' },
        { title: 'Last Updated By', field: 'lastUpdatedBy' },
        {
          title: 'Last Ordered',
          field: 'lastOrdered',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.lastOrdered).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.lastOrdered': 'value',
          }
        },
        {
          title: 'Last Received',
          field: 'lastReceived',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body2',
                format: '${api.utils.moment(rowData.lastReceived).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.lastReceived': 'value',
          }
        },
        { title: 'Supplier Currency', field: 'supplyCurrency' },
        { title: 'List Currency', field: 'listCurrency' },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
      },
      remoteData: true,
      query: 'query',
      variables: {
        'props.formContext.$formData.product': 'product'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'products.[].id': 'data.[].id',
        'products.[].name': 'data.[].name',
        'products.[].code': 'data.[].code',
        'products.[].description': 'data.[].description',
        'products.[].qtyAvailable': 'data.[].qtyAvailable',
        'products.[].qtyOnHand': 'data.[].qtyOnHand',
        'products.[].qtyOnOrder': 'data.[].qtyOnOrder',
        'products.[].unitOfMeasure': 'data.[].unitOfMeasure',
        'products.[].price': 'data.[].price',
        'products.[].image': 'data.[].image',
        'products.[].onSyspro': 'data.[].onSyspro',
        'products.[].priceAdditionalInfo': 'data.[].priceAdditionalInfo',
        'products.[].landedPrice': 'data.[].landedPrice',
        'products.[].wh10CostPrice': 'data.[].wh10CostPrice',
        'products.[].threeMonthAvePrice': 'data.[].threeMonthAvePrice',
        'products.[].listPrice': 'data.[].listPrice',
        'products.[].buyer': 'data.[].buyer',
        'products.[].buyerEmail': 'data.[].buyerEmail',
        'products.[].planner': 'data.[].planner',
        'products.[].plannerEmail': 'data.[].plannerEmail',
        'products.[].isHazardous': 'data.[].isHazardous',
        'products.[].siteEvaluationRequired': 'data.[].siteEvaluationRequired',
        'products.[].packedLength': 'data.[].packedLength',
        'products.[].packedWidth': 'data.[].packedWidth',
        'products.[].packedHeight': 'data.[].packedHeight',
        'products.[].packedVolume': 'data.[].packedVolume',
        'products.[].packedWeight': 'data.[].packedWeight',
        'products.[].numberOfSalesOrders': 'data.[].numberOfSalesOrders',
        'products.[].numberOfPurchaseOrders': 'data.[].numberOfPurchaseOrders',

        'products.[].productClass': 'data.[].productClass',
        'products.[].tariffCode': 'data.[].tariffCode',
        'products.[].leadTime': 'data.[].leadTime',
        'products.[].validPriceUntil': 'data.[].validPriceUntil',
        'products.[].lastUpdated': 'data.[].lastUpdated',
        'products.[].lastUpdatedBy': 'data.[].lastUpdatedBy',
        'products.[].lastOrdered': 'data.[].lastOrdered',
        'products.[].lastReceived': 'data.[].lastReceived',
        'products.[].supplyCurrency': 'data.[].supplyCurrency',
        'products.[].listCurrency': 'data.[].listCurrency',
      },
    },
  }
};

// GRID LAYOUT
export const uiSchemaGrid: any = {
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
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
  'ui:grid-layout': [
    { view: { sm: 12, md: 12, lg: 12 } },
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
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
  paging: {
    'ui:widget': 'HiddenWidget'
  },
  product: {
    hidden: true,
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'GridLayoutWidget',
    'ui:options': {
      component: 'lasec.ProductCardComponent@1.0.0',
      componentProps: {
        cardContent: {
          fields: [
            {
              label: 'Buyer:',
              value: 'buyer',
              unit: '',
              icon: ''
            },
            {
              label: 'Planner:',
              value: 'planner',
              unit: '',
              icon: ''
            },
            {
              label: 'Hazardous:',
              value: 'isHazardous',
              unit: '',
              icon: ''
            },
            {
              label: 'Site Evaluation:',
              value: 'siteEvaluationRequired',
              unit: '',
              icon: ''
            },
            {
              label: 'Product Class:',
              value: 'productClass',
              unit: '',
              icon: ''
            },
            {
              label: 'Tariff Code:',
              value: 'tariffCode',
              unit: '',
              icon: ''
            },
            {
              label: 'Lead Time:',
              value: 'leadTime',
              unit: '',
              icon: ''
            },
            {
              label: 'Valid Price Until:',
              value: 'validPriceUntil',
              unit: '',
              icon: ''
            },
            {
              label: 'Last Updated:',
              value: 'lastUpdated',
              unit: '',
              icon: ''
            },
            {
              label: 'Last Updated by:',
              value: 'lastUpdatedBy',
              unit: '',
              icon: ''
            },
            {
              label: 'Last Ordered:',
              value: 'lastOrdered',
              unit: '',
              icon: ''
            },
            {
              label: 'Last Received:',
              value: 'lastReceived',
              unit: '',
              icon: ''
            },
            {
              label: 'Supplier Currency:',
              value: 'supplyCurrency',
              unit: '',
              icon: ''
            },
            {
              label: 'List Currency:',
              value: 'listCurrency',
              unit: '',
              icon: ''
            },
          ],
          hasPricingChart: false
        },
      },
      loadingMessage: 'Loading product details, please wait a moment',
      remoteData: true,

      variables: {
        'props.formContext.$formData.product': 'product',
        'props.formContext.$formData.paging': 'paging'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'products.[].id': 'data.[].id',
        'products.[].name': 'data.[].name',
        'products.[].code': 'data.[].code',
        'products.[].description': 'data.[].description',
        'products.[].qtyAvailable': 'data.[].qtyAvailable',
        'products.[].qtyOnHand': 'data.[].qtyOnHand',
        'products.[].qtyOnOrder': 'data.[].qtyOnOrder',
        'products.[].unitOfMeasure': 'data.[].unitOfMeasure',
        'products.[].price': 'data.[].price',
        'products.[].image': 'data.[].image',
        'products.[].onSyspro': 'data.[].onSyspro',
        'products.[].priceAdditionalInfo': 'data.[].priceAdditionalInfo',
        'products.[].landedPrice': 'data.[].landedPrice',
        'products.[].wh10CostPrice': 'data.[].wh10CostPrice',
        'products.[].threeMonthAvePrice': 'data.[].threeMonthAvePrice',
        'products.[].listPrice': 'data.[].listPrice',
        'products.[].buyer': 'data.[].buyer',
        'products.[].buyerEmail': 'data.[].buyerEmail',
        'products.[].planner': 'data.[].planner',
        'products.[].plannerEmail': 'data.[].plannerEmail',
        'products.[].isHazardous': 'data.[].isHazardous',
        'products.[].siteEvaluationRequired': 'data.[].siteEvaluationRequired',
        'products.[].packedLength': 'data.[].packedLength',
        'products.[].packedWidth': 'data.[].packedWidth',
        'products.[].packedHeight': 'data.[].packedHeight',
        'products.[].packedVolume': 'data.[].packedVolume',
        'products.[].packedWeight': 'data.[].packedWeight',
        'products.[].numberOfSalesOrders': 'data.[].numberOfSalesOrders',
        'products.[].numberOfPurchaseOrders': 'data.[].numberOfPurchaseOrders',
        'products.[].supplier': 'data.[].supplier',
        'products.[].model': 'data.[].model',
        'products.[].shipmentSize': 'data.[].shipmentSize',
        'products.[].exWorksFactor': 'data.[].exWorksFactor',

        'products.[].productClass': 'data.[].productClass',
        'products.[].tariffCode': 'data.[].tariffCode',
        'products.[].leadTime': 'data.[].leadTime',
        'products.[].validPriceUntil': 'data.[].validPriceUntil',
        'products.[].lastUpdated': 'data.[].lastUpdated',
        'products.[].lastUpdatedBy': 'data.[].lastUpdatedBy',
        'products.[].lastOrdered': 'data.[].lastOrdered',
        'products.[].lastReceived': 'data.[].lastReceived',
        'products.[].supplyCurrency': 'data.[].supplyCurrency',
        'products.[].listCurrency': 'data.[].listCurrency',

      },
    },
  }
};

// PURCHASE ORDERS
// NOT IN USE AT THE MOMENT
const uiSchemaPurOrders: any = {
  'ui:options': {
    componentType: "div",
  },
  product: {},
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'onSyspro',
          component: 'core.ConditionalIconComponent@1.0.0',
          props: {
            'ui:options': {},
            conditions: [
              {
                key: 'on_syspro',
                // icon: 'error',
                icon: 'OnSyspro',
                iconType: 'reactory',
                style: {
                  color: '#9AD86E'
                },
                tooltip: 'ON SYSPRO'
              },
              {
                key: 'not_on_syspro',
                // icon: 'error',
                icon: 'OnSyspro',
                iconType: 'reactory',
                style: {
                  color: '#D22D2C'
                },
                tooltip: 'NOT ON SYSPRO'
              },
              {
                key: 'on_hold',
                // icon: 'error',
                icon: 'OnSyspro',
                iconType: 'reactory',
                style: {
                  color: '#D22D2C'
                },
                tooltip: 'ON HOLD'
              },
              {
                key: 'on_partial_hold',
                // icon: 'error',
                icon: 'OnSyspro',
                iconType: 'reactory',
                style: {
                  color: '#f7b425'
                },
                tooltip: 'ON PARTIAL HOLD'
              },
            ]
          },
          propsMap: {
            onSyspro: 'value',
          },
        },
        {
          title: '', field: 'image',
          component: 'core.ImageComponent@1.0.0',
          props: {
            'ui:options': {
              variant: 'rounded'
            },
          },
          propsMap: {
            image: 'value',
          },
        },
        { title: 'Stock Code', field: 'code' },
        { title: 'Description', field: 'name' },
        {
          title: 'Unit of Measure',
          field: 'unitOfMeasure',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'square_foot',
                iconPosition: 'left',
                variant: 'p'
              }
            },
          },
          propsMap: {
            unitOfMeasure: 'value',
          }
        },
        { title: 'No. of Purchase Orders', field: 'numberOfPurchaseOrders' },
        {
          title: '',
          field: 'id',
          component: 'core.Link@1.0.0',
          props: {
            link: '/reactory\/${id}\/',
            uiSchema: {
              'ui:options': {
                format: '/reactory\/${id}\/',
                title: 'View Purchase Orders',
                userouter: false,
              },
            },
          },
        },
      ],
      options: {
        grouping: true,
      },
    },
  }
};
