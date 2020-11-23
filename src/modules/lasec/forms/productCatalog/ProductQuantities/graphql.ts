export default {
  query: {
    name: 'LasecGetWarehouseStockLevels',
    text: `query LasecGetWarehouseStockLevels($productId: String) {
      LasecGetWarehouseStockLevels(productId: $productId) {
        id
        stock {
          name
          warehouseId
          stockCode
          qtyOnHand
          qtyAllocated
          qtyOnOrder
          qtyOnBO
          qtyInTransit
          qtyAvailable
          qtyOnSalesOrder
        }
        totals {
          qtyOnHand
          qtyAllocated
          qtyOnOrder
          qtyOnBO
          qtyInTransit
          qtyAvailable
          qtyOnSalesOrder
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
