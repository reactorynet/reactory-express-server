export default {
  query: {
    name: 'LasecGetProductList',
    text: `query LasecGetProductList($product: String, $supplier: String){
      LasecGetProductList(product: $product, supplier: $supplier){
        id
        name
        code
        description
      }
    }`,
    variables: {
      // 'formData.product': 'product',
      // 'formData.supplier': 'supplier',
    },
    resultMap: {
      '[].id': 'products.[].id',
      '[].name': 'products.[].name',
      '[].code': 'products.[].code',
    },
    resultType: 'array',
    edit: false,
    new: false,
  },
};
