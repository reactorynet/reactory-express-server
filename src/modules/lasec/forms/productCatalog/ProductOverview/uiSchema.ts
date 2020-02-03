
const uiSchema: any = {
  product: {},
  supplier: {},
  products: {
    'ui:widget': 'MaterialListWidget',
    'ui:options': {
      primaryText: '${item.name}',
      secondaryText: 'Just some test data',
      showAvatar: false,
      icon: 'history'
    }
  }

};

export default uiSchema;
