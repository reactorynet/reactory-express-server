
const uiSchema: any = {
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
          component: 'core.CurrencyLabel@1.0.0',
          propsMap: {
            price: 'value',
          },
        },
      ],
      options: {
        grouping: true,
      },
    },
  }

};

export default uiSchema;
