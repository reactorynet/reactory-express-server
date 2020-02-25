
const uiSchema: any = {
  'ui:options': {
    showSubmit: false,
    showRefresh: false,
    showHelp: false,
    componentType: 'div',
    container: 'div',
    containerStyles: {
      padding: '0px',
      margin: '0px'
    }
  },
  id: {
    
  },
  stock: {
    'ui:widget': 'MaterialTableWidget',
    'ui:options': {
      options: {
        toolbar: false,
        draggable: false,
        grouping: false,
        paging: false
      },
      columns: [
        { title: 'Warehouse', field: 'name' },
        { title: 'Quantity Available', field: 'qtyAvailable' },
        { title: 'Quantity On Hand', field: 'qtyOnHand' },
        { title: 'Quantity On BO', field: 'qtyOnBO' },
      ],
      lastRowFooter: true,
    },
  },
};

export default uiSchema;
