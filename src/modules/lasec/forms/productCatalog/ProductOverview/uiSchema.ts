
const uiSchema: any = {
  product: {},
  supplier: {},
  products: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        {
          title: '', field: 'image',
          component: 'core.ImageComponent@1.0.0',
          props: {
            'ui:options': {
              size: 'medium',
              variant: 'square'
            },
          },
          propsMap: {
            image: 'value',
          },
        },
        { title: 'Stock Code', field: 'code' },
        { title: 'Description', field: 'description' },
        { title: 'Unit of Measure', field: 'unitOfMeasure' },
        { title: 'Qty Available', field: 'qtyAvailable' },
        { title: 'Qty on Hand', field: 'qtyOnHand' },
        { title: 'Qty on PO', field: 'qtyOnOrder' },
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
