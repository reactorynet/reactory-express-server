
const uiSchema: any = {
  locations: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      columns: [
        { title: 'Warehouse', field: 'warehouse' },
        { title: 'Quantity Available', field: 'qtyAvailable' },
        { title: 'Quantity On Hand', field: 'qtyOnHand' },
        { title: 'Quantity On BO', field: 'qtyOnBO' },
        { title: 'Total', field: 'total' },
      ],
      options: {
        grouping: true,
      },
    },
  }

};

export default uiSchema;
