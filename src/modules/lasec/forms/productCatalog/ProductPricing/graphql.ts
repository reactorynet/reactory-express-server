export default {
  query: {
    name: 'LasecGetProductList',
    autoQuery: true,
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
        priceAdditionalInfo
        image
        onSyspro
        landedPrice
        wh10CostPrice
        threeMonthAvePrice
        listPrice
      }
    }`,
    variables: {
      'formData.product': 'product',
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
      '[].onSyspro': 'products.[].onSyspro',
      '[].priceAdditionalInfo': 'products.[].priceAdditionalInfo',
      '[].landedPrice': 'products.[].landedPrice',
      '[].wh10CostPrice': 'products.[].wh10CostPrice',
      '[].threeMonthAvePrice': 'products.[].threeMonthAvePrice',
      '[].listPrice': 'products.[].listPrice',
    },
    resultType: 'array',
    edit: false,
    new: false,
  },
};
