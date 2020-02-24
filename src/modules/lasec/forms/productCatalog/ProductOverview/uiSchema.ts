
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
          width: '40px',
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
            onSyspro: 'value',
          },
          cellStyle: {
            maxWidth: '40px',
            width: '40px'
          },
          headerStyles: {
            maxWidth: '40px',
            width: '40px'
          }
        },
        {
          title: '', field: 'image',
          width: '80px',
          component: 'core.ImageComponent@1.0.0',
          props: {
            'ui:options': {
              variant: 'rounded'
            },
          },
          propsMap: {
            image: 'value',
          },
          cellStyle: {
            maxWidth: 40,
            width: 40
          },
          headerStyles: {
            maxWidth: 40,
            width: 40
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
                variant: 'p'
              }
            },
          },
          propsMap: {
            unitOfMeasure: 'value',
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
                variant: 'p'
              }
            },
          },
          propsMap: {
            qtyAvailable: 'value',
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
                variant: 'p'
              }
            },
          },
          propsMap: {
            qtyOnHand: 'value',
          }
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
                variant: 'p'
              }
            },
          },
          propsMap: {
            qtyOnOrder: 'value',
          }
        },
        {
          title: 'Price', field: 'price',
          component: 'core.StyledCurrencyLabel@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                prependText: 'From: ',
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
            price: 'value',
            priceAdditionalInfo: 'condition',
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
        'state.formData.product': 'product'
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
      },
    },
  }
};

const cardUiSchema: any = {
  ...uiSchema,
  products: undefined,  
}

export default uiSchema;
