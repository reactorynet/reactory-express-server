export default {
  query: {
    name: 'LasecGetWarehouseStockLevels',
    text: `query LasecGetWarehouseStockLevels($productId: String) {
      LasecGetWarehouseStockLevels(productId: $productId) {
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
      'formData.id': 'productId',
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
