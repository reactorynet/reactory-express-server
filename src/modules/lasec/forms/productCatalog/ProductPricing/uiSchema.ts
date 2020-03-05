
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
  product: {
    'ui:widget': 'HiddenWidget'
  },
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'onSyspro',
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
                      color: '#D22D2C',
                    },
                    tooltip: 'ON HOLD'
                  },
                  {
                    key: 'on_partial_hold',
                    icon: 'error',
                    style: {
                      color: '#f7b425',
                    },
                    tooltip: 'ON PARTIAL HOLD'
                  },
                ]
              },
              style: {
                marginRight: '8px',
              },
              propsMap: {
                'rowData.onSyspro': 'value',
              },
            },
            {
              component: 'core.ImageComponent@1.0.0',
              props: {
                'ui:options': {
                  variant: 'rounded'
                },                
              },
              propsMap: {
                'rowData.image': 'value',
              },
            }
          ], 
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
                format: '${rowData.unitOfMeasure}',
              }
            },
          },          
        },
        {
          title: 'Landed Cost',
          field: 'landedPrice',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {                
                prependText: '',
                conditionalStyles: [
                  {
                    key: 'ON_SPECIAL',
                    style: {
                      color: '#4AC0DC'
                    },
                    tooltip: 'PRICE ON SPECIAL'
                  },
                  {
                    key: 'EXPIRED',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'PRICE EXPIRED'
                  }
                ]
              }
            },
          },
          propsMap: {
            'rowData.landedPrice': ['value', 'formData'],
            'rowData.priceAdditionalInfo' : ['condition'],
          },     
        },
        {
          title: 'WH10 Cost',
          field: 'wh10CostPrice',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {                
                prependText: '',
                conditionalStyles: [
                  {
                    key: 'ON_SPECIAL',
                    style: {
                      color: '#4AC0DC'
                    },
                    tooltip: 'PRICE ON SPECIAL'
                  },
                  {
                    key: 'EXPIRED',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'PRICE EXPIRED'
                  }
                ]
              }
            },
          },
          propsMap: {
            'rowData.wh10CostPrice': ['value', 'formData'],
            'rowData.priceAdditionalInfo' : ['condition'],
          },     
        },
        {
          title: '3 Month Avg.',
          field: 'threeMonthAvePrice',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {                
                prependText: '',
                conditionalStyles: [
                  {
                    key: 'ON_SPECIAL',
                    style: {
                      color: '#4AC0DC'
                    },
                    tooltip: 'PRICE ON SPECIAL'
                  },
                  {
                    key: 'EXPIRED',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'PRICE EXPIRED'
                  }
                ]
              }
            },
          },
          propsMap: {
            'rowData.threeMonthAvePrice': ['value', 'formData'],
            'rowData.priceAdditionalInfo' : ['condition'],
          },     
          
        },
        {
          title: 'List Price',
          field: 'listPrice',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {                
                prependText: '',
                conditionalStyles: [
                  {
                    key: 'ON_SPECIAL',
                    style: {
                      color: '#4AC0DC'
                    },
                    tooltip: 'PRICE ON SPECIAL'
                  },
                  {
                    key: 'EXPIRED',
                    style: {
                      color: '#D22D2C'
                    },
                    tooltip: 'PRICE EXPIRED'
                  }
                ]
              }
            },
          },
          propsMap: {
            'rowData.listPrice': ['value', 'formData'],
            'rowData.priceAdditionalInfo' : ['condition'],
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
      },
    },
  }
};

export default uiSchema;
