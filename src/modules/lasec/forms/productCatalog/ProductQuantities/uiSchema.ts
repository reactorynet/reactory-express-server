
const uiSchema: any = {
  'ui:options': {
    showSubmit: false,
    showHelp: false,
    componentType: 'div',
    container: 'div',
  },
  locations: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      options: {
        toolbar: false,
        draggable: false,
        grouping: false,
      },
      columns: [
        { title: 'Warehouse', field: 'name' },
        { title: 'Quantity Available', field: 'qtyAvailable' },
        { title: 'Quantity On Hand', field: 'qtyOnHand' },
        { title: 'Quantity On BO', field: 'qtyOnBO' },
      ],
    },
  }

};

export default uiSchema;
