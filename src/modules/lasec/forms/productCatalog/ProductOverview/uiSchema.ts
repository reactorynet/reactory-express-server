
const uiSchema: any = {
  'ui:options': {
    componentType: "div",
    showSubmit: false,
    showRefresh: false,
    container: "div",
    containerStyles: {
      padding: '0px',
      margin: '0px'
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
                    icon: 'error',
                    style: {
                      color: '#9AD86E'
                    },
                    tooltip: 'ON SYSPRO'
                  },
                  {
                    key: 'not_on_syspro',
                    icon: 'error',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'NOT ON SYSPRO'
                  },
                  {
                    key: 'on_hold',
                    icon: 'error',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'ON HOLD'
                  },
                  {
                    key: 'on_partial_hold',
                    icon: 'error',
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
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                icon: 'shopping_basket',
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
          title: 'Price', field: 'price',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            displayAdditionalCurrencies: true,
            displayPrimaryCurrency: false,
            currenciesDisplayed: ['USD', 'EUR', 'GBP', 'ZAR'],
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
        fixedColumns: {
          left: 5,
        },
        tableLayout: 'fixed',
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
        'products.[].productPricing.[]': 'data.[].productPricing.[]',
      },
    },
  }
};

const cardUiSchema: any = {
  ...uiSchema,
  products: undefined,
}

export default uiSchema;
