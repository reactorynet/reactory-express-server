export default {
  query: {
    name: 'LasecGetWarehouseStock',
    text: `query LasecGetWarehouseStock {
      LasecGetWarehouseStock {
        stock {
          name
          qtyAvailable
          qtyOnHand
          qtyOnBO
        }
        totals {
          field
          qty
        }
      }
    }`,
    variables: {
      // 'formData.product': 'product',
    },
    resultMap: {
      'stock': 'stock',
      'totals': 'totals',
    },
    // resultType: 'array',
    edit: false,
    new: false,
  },
};
