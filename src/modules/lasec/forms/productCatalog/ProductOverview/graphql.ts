export default {
  query: {
    name: 'LasecGetProductList',
    text: `query LasecGetProductList($product: String){
      LasecGetProductList(product: $product){
        id
        name
        code
        description
        qtyAvailable
        qtyOnHand
        qtyOnOrder
        unitOfMeasure
        price
        image
      }
    }`,
    variables: {
      // 'formData.product': 'product',
    },
    resultMap: {
      '[].id': 'products.[].id',
      '[].name': 'products.[].name',
      '[].code': 'products.[].code',
      '[].description': 'products.[].description',
      '[].qtyAvailable': 'products.[].qtyAvailable',
      '[].qtyOnHand': 'products.[].qtyOnHand',
      '[].qtyOnOrder': 'products.[].qtyOnOrder',
      '[].unitOfMeasure': 'products.[].unitOfMeasure',
      '[].price': 'products.[].price',
      '[].image': 'products.[].image',
    },
    resultType: 'array',
    edit: false,
    new: false,
  },
};
