
const $toolbar: any = {
  'ui:wrapper': 'Toolbar',
  'ui:widget': 'MaterialToolbar',
  'ui:field': 'GridLayout',
  'ui:grid-layout': [
    {
      product: { md: 3, sm: 6, xs: 6 },
      supplier: { md: 3, sm: 6, xs: 6 },
    }
  ],
  product: {
    title: 'Supplier'
    // 'ui:widget': 'InputWidget',
    // 'ui:options': {
    //   // format: '${formData.targetFormId}',
    //   title: 'Product',
    //   icon: 'money',
    // }
  },
  supplier: {
    title: 'Supplier'
  }
}

const uiSchema: any = {
  submitIcon: 'refresh',
  'ui:field': 'GridLayout',
  'ui:grid-options': {
    // spacing: 4,
  },
  'ui:grid-layout': [
    {
      toolbar: { xs: 12 },
    },
  ],
  toolbar: $toolbar,

};

export default uiSchema;
