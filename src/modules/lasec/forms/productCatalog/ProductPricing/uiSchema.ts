
const tableUiSchema: any = {
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
  product: {
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
                format: '${rowData.unitOfMeasure}',
              }
            },
          },
        },
        // {
        //   title: 'Special Price', field: 'price',
        //   component: 'core.StyledCurrencyLabel@1.0.0',
        //   props: {
        //     displayAdditionalCurrencies: true,
        //     displayPrimaryCurrency: false,
        //     currenciesDisplayed: ['USD', 'EUR', 'GBP', 'ZAR'],
        //     region: 'en-IN',
        //     uiSchema: {
        //       'ui:options': {
        //         prependText: '(ZAR)',
        //         additionalCurrencyMapField: 'special_price_cents',
        //         showZeroValues: false,
        //         defaultStyle: {
        //           borderBottom: '1px solid #E1E1E4'
        //         },
        //         conditionalStyles: []
        //       }
        //     },
        //   },
        //   propsMap: {
        //     'rowData.price': ['value', 'formData'],
        //     'rowData.priceAdditionalInfo': ['condition'],
        //     'rowData.productPricing': 'currencies',
        //   },
        // },
        {
          title: 'Price',
          field: 'id',
          component: 'core.PricingLineChartComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                currencySymbol: 'R',
                region: 'en-ZA',
                containerStyles: {
                  minWidth: '350px'
                }
              }
            },
          },
          propsMap: {
            'rowData': ['value', 'formData'],
          },
        },
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
        'products.[].productPricing.[]': 'data.[].productPricing.[]',
        'products.[].onSpecial': 'data.[].onSpecial',
      },
    },
  }
};

const gridUiSchema: any = {
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
    { view: { xs: 12, sm: 12, md: 12, lg: 12 } },
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
              label: 'Unit of Measure:',
              value: 'unitOfMeasure',
              unit: '',
              icon: 'straighten'
            }
          ],
          currenciesDisplayed: ['USD', 'EUR', 'GBP', 'ZAR'],
          showSpecialPricing: true,
          hasPricingChart: true,
        },
      },
      loadingMessage: 'Loading product pricing, please wait a moment',
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
      },
    },
  }
};

export { tableUiSchema, gridUiSchema };
