export default {
  query: {
    name: 'LasecGetWarehouseStockLevels',
    text: `query LasecGetWarehouseStockLevels($productId: String) {
      LasecGetWarehouseStockLevels(productId: $productId) {
        id
        stock {
          name
          warehouseId
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
      'id': 'id',
      'stock': 'stock',
      'totals': 'totals',
    },
    // resultType: 'array',
    edit: false,
    new: false,
  },
};
