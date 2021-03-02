import graph from './graphql';

export const uiSchemaTable: any = {
  'ui:grapql': graph.product_detail_table_graph,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      paddingBottom: '8px'
    },

    showSchemaSelectorInToolbar: false,
    showSubmit: false,
    showRefresh: false,
  },
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    container: 'div',
  },
  'ui:grid-layout': [
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0, marginTop: '16px' } }
  ],
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '',
          field: 'onSyspro',
          component: 'lasec-crm.LasecProductAddToQuoteComponent@1.0.0',
          props: {},
          propsMap: {
            'rowData': 'product',
          },
          width: '140px',
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
          width: '180px',
          cellStyle: {
            maxWidth: '180px',
            width: '180px'
          },
          headerStyles: {
            maxWidth: '180px',
            width: '180px'
          },
        },
        {
          title: 'Description',
          field: 'name',
          width: '200px',
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
          title: 'Unit of Measure',
          field: 'unitOfMeasure',
          breakpoint: 'sm',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'Ruler',
                iconType: 'reactory',
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
          breakpoint: 'sm',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
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
          breakpoint: 'sm',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
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
        {
          title: 'Is Hazardous',
          field: 'isHazardous',
          breakpoint: 'sm',
          width: '100px',
          cellStyle: {
            maxWidth: '100px',
            width: '100px'
          },
          headerStyles: {
            maxWidth: '100px',
            width: '100px'
          },
        },
        {
          title: 'Site Evaluation',
          field: 'siteEvaluationRequired',
          breakpoint: 'sm',
          width: '120px',
          cellStyle: {
            maxWidth: '120px',
            width: '120px'
          },
          headerStyles: {
            maxWidth: '120px',
            width: '120px'
          },
        },
        {
          title: 'Product Class',
          field: 'productClass',
          breakpoint: 'sm',
          width: '120px',
          cellStyle: {
            maxWidth: '120px',
            width: '120px'
          },
          headerStyles: {
            maxWidth: '120px',
            width: '120px'
          },
        },
        {
          title: 'Tariff Code',
          field: 'tariffCode',
          breakpoint: 'sm',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          title: 'Lead Time',
          field: 'leadTime',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          title: 'Valid Price Until',
          field: 'validPriceUntil',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${api.utils.moment(rowData.validPriceUntil).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.validPriceUntil': 'value',
          }
        },
        {
          title: 'Last Updated',
          field: 'lastUpdated',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          title: 'Last Updated By',
          field: 'lastUpdatedBy',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          title: 'Last Ordered',
          field: 'lastOrdered',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
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
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'body1',
                format: '${api.utils.moment(rowData.lastReceived).format(\'DD MMM YYYY\')}'
              }
            },
          },
          propsMap: {
            'rowData.lastReceived': 'value',
          }
        },
        {
          title: 'Supplier Currency',
          field: 'supplyCurrency',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
        {
          title: 'List Currency',
          field: 'listCurrency',
          width: '150px',
          cellStyle: {
            maxWidth: '150px',
            width: '150px'
          },
          headerStyles: {
            maxWidth: '150px',
            width: '150px'
          },
        },
      ],
      options: {
        grouping: false,
        search: false,
        showTitle: false,
        toolbar: false,
        searchText: '${formContext.$formData.product}'
      },
      propsMap: {
        'formContext.$formData.product': 'searchText'
      },
      remoteData: true,
      query: 'product_details',
      variables: {
        'query.search': 'product',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize'
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

export const uiSchemaGrid: any = {
  'ui:grapql': graph.product_card_detail_graph,
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
    { products: { sm: 12, md: 12, lg: 12 }, style: { paddingTop: 0 } }
  ],
  products: {
    'ui:widget': 'ProductGrid',
    'ui:options': {
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
      loadingMessage: 'Loading product overview, please wait a moment',
      remoteData: true,

      variables: {
        'formContext.$formData.product': 'product',
        'formContext.$formData.paging': 'paging'
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
    }
  },
  productsOld: {
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
