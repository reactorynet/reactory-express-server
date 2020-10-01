
const uiSchema: any = {
  'ui:options': {
    showSubmit: false,
    showRefresh: false,
    showHelp: false,
    toolbarPosition: 'none',
    componentType: 'div',
    container: 'div',
    containerStyles: {
      padding: '0px',
      margin: '0px',
      //position: 'relative',
      //top: '-78px',
      //zIndex: 'auto',
    }
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
        {
          title: 'Warehouse',
          field: 'name',
          component: 'core.LabelComponent@1.0.0',
          props: {
            uiSchema: {
              'ui:options': {
                variant: 'p',
                format: '${rowData.name} (${rowData.warehouseId})',
              }
            },
          },
        },
        { title: 'Quantity Available', field: 'qtyAvailable' },
        { title: 'Quantity On Hand', field: 'qtyOnHand' },
        { title: 'Quantity On BO', field: 'qtyOnBO' },
      ],
      lastRowFooter: true,
    },
  },

  id: {
    class: 'none',
    'ui:widget': 'HiddenWidget',
    'ui:options': {
      containerStyles: {
        'display': 'none'
      }
    }
  },
};

export default uiSchema;
