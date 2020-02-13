export default {
  query: {
    name: 'LasecGetWarehouseStockLevels',
    text: `query LasecGetWarehouseStockLevels {
      LasecGetWarehouseStockLevels {
        stock {
          name
          qtyAvailable
          qtyOnHand
          qtyOnBO
        }
        totals {
          qtyAvailable
          qtyOnHand
          qtyOnBO
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
