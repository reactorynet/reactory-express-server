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
        priceAdditionalInfo
        image
        onSyspro
        landedPrice
        wh10CostPrice
        threeMonthAvePrice
        listPrice
        buyer
        planner
        isHazardous
        siteEvaluationRequired
        packedLength
        packedWidth
        packedHeight
        packedVolume
        packedWeight
        numberOfSalesOrders
        numberOfPurchaseOrders
      }
    }`,
    variables: {},
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
      '[].buyer': 'products.[].buyer',
      '[].planner': 'products.[].planner',
      '[].isHazardous': 'products.[].isHazardous',
      '[].siteEvaluationRequired': 'products.[].siteEvaluationRequired',
      '[].packedLength': 'products.[].packedLength',
      '[].packedWidth': 'products.[].packedWidth',
      '[].packedHeight': 'products.[].packedHeight',
      '[].packedVolume': 'products.[].packedVolume',
      '[].packedWeight': 'products.[].packedWeight',
      '[].numberOfSalesOrders': 'products.[].numberOfSalesOrders',
      '[].numberOfPurchaseOrders': 'products.[].numberOfPurchaseOrders',
    },
    resultType: 'array',
    edit: false,
    new: false,
  },
};
