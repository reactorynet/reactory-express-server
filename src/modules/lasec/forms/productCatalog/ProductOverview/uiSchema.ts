import { table_graph, cards_graph } from './graphql';
const tableUiSchema: any = {
  'ui:graphql': table_graph,
  'ui:options': {
    componentType: "div",
    toolbarPosition: 'none',
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
    },
    schemaSelector: {
      variant: 'icon-button',
      showTitle: false,
      activeColor: 'secondary',
      selectSchemaId: 'grid',
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    },
    style: {
      marginTop: '16px',
    },
    showSchemaSelectorInToolbar: false,
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
    'ui:widget': 'HiddenWidget'
  },
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
          width: '180px',
          cellStyle: {
            maxWidth: '180px',
            width: '180px'
          },
          headerStyles: {
            maxWidth: '180px',
            width: '180px'
          },
          components: [
            {
              component: 'core.SlideOutLauncher@1.0.0',
              props: {
                componentFqn: 'lasec-crm.LasecProductDetails@1.0.0',
                componentProps: {
                  'rowData': 'formData',
                },
                childProps: {
                  style: {
                    maxWidth: '900px',
                    marginTop: '0px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                  }
                },
                slideDirection: 'left',
                buttonVariant: 'button',
                buttonProps: {
                  size: 'small',
                },
                buttonIcon: 'launch',
                windowTitle: '${rowData.code} ${rowData.name}',
                dialogVariant: 'compact'
                // backNavigationConfig: {
                //   showAppBar: false,
                //   backNavigationItems: ['Catalogue', '${rowData.code}'],
                //   containerProps: { PaperProps: { style: { background: '#F6F6F6' } }}
                // }
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
                    bodyProps: {}
                  }
                },
              },
              propsMap: {
                'rowData.code': 'value',
              }
            },
          ],
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
                // icon: 'square_foot',
                icon: 'Ruler',
                iconType: 'reactory',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.unitOfMeasure}'
              }
            },
          },
          propsMap: {
            'rowData.unitOfMeasure': 'value',
          }
        },
        {
          title: 'Qty Available',
          field: 'qtyAvailable',
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
                // icon: 'shopping_basket',
                icon: 'Briefcase',
                iconType: 'reactory',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.qtyAvailable}'
              }
            },
          },
          propsMap: {
            'rowData.qtyAvailable': 'value',
          }
        },
        {
          title: 'Qty on Hand',
          field: 'qtyOnHand',
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
                icon: 'perm_identity',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.qtyOnHand}'
              }
            },
          },
        },
        {
          title: 'Qty on PO',
          field: 'qtyOnOrder',
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
                icon: 'receipt',
                iconPosition: 'left',
                variant: 'p',
                format: '${rowData.qtyOnOrder}'
              }
            },
          },
        },
        {
          title: 'Price',
          field: 'price',
          width: '200px',
          cellStyle: {
            maxWidth: '200px',
            width: '200px'
          },
          headerStyles: {
            maxWidth: '200px',
            width: '200px'
          },
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            displayAdditionalCurrencies: true,
            displayPrimaryCurrency: false,
            // currenciesDisplayed: ['USD', 'EUR', 'GBP', 'ZAR'],
            // currenciesDisplayed: ['USD', 'ZAR'],
            currenciesDisplayed: '${rowData.availableCurrencies}',
            region: 'en-IN',
            uiSchema: {
              'ui:options': {
                prependText: '(ZAR)',
                defaultStyle: {
                  borderBottom: '1px solid #E1E1E4'
                },
                conditionalStyles: [
                  {
                    key: 'ON_SPECIAL',
                    style: {
                      color: '#22B2D4',
                    },
                    tooltip: 'PRICE ON SPECIAL'
                  },
                  {
                    key: 'EXPIRED',
                    style: {
                      color: '#D22D2C',
                    },
                    tooltip: 'PRICE EXPIRED'
                  }
                ]
              }
            },
          },
          propsMap: {
            'rowData.price': ['value', 'formData'],
            'rowData.priceAdditionalInfo': ['condition'],
            'rowData.productPricing': 'currencies',
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
      query: 'products_table',
      variables: {
        'query.search': 'product',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize'
      },
      resultMap: {
        'paging.page': 'page',
        'paging.total': 'totalCount',
        'paging.pageSize': 'pageSize',
        'products': 'data'
      },
    },
  }
};

const gridUiSchemaGrid: any = {
  'ui:graphql': cards_graph,
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
    'ui:widget': 'ProductGrid',
    'ui:options': {
      componentProps: {
        cardContent: {
          fields: [
            {
              label: 'Unit of Measure:',
              value: 'unitOfMeasure',
              unit: '',
              icon: 'straighten'
            },
            {
              label: 'Quantity Available:',
              value: 'qtyAvailable',
              unit: '',
              icon: 'business_center'
            },
            {
              label: 'Quantity on Hand:',
              value: 'qtyOnHand',
              unit: '',
              icon: 'person_outline'
            },
            {
              label: 'Quantity on PO:',
              value: 'qtyOnOrder',
              unit: '',
              icon: 'receipt'
            }
          ],
          currenciesDisplayed: '${data.availableCurrencies}',
          showPricing: true,
          showSpecialPricing: true,
          hasPricingChart: true,
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
        'products.[].planner': 'data.[].planner',
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
        'products.[].productPricing.[]': 'data.[].productPricing',
        'products.[].onSpecial': 'data.[].onSpecial',
        'products.[].currencyCode': 'data.[].currencyCode',
        'products.[].specialPrice': 'data.[].specialPrice',
        'products.[].availableCurrencies.[]': 'data.[].availableCurrencies.[]',
      },
    }
  },
};

const cardUiSchema: any = {
  ...tableUiSchema,
  products: undefined,
}

export { tableUiSchema, gridUiSchemaGrid };
