export default {
  query: {
    name: 'LasecGetProductList',
    autoQuery: false,
    text: `query LasecGetProductList($product: String!, $paging: PagingRequest){
      LasecGetProductList(product: $product, paging: $paging){
        paging {
          total
          page
          hasNext
          pageSize
        }
        products {
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

          supplier
          model
          shipmentSize
          exWorker
        }
      }
    }`,
    variables: {
      'formData.product': 'product',
      'formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'products.[].id': 'products.[].id',
      'products.[].name': 'products.[].name',
      'products.[].code': 'products.[].code',
      'products.[].description': 'products.[].description',
      'products.[].qtyAvailable': 'products.[].qtyAvailable',
      'products.[].qtyOnHand': 'products.[].qtyOnHand',
      'products.[].qtyOnOrder': 'products.[].qtyOnOrder',
      'products.[].unitOfMeasure': 'products.[].unitOfMeasure',
      'products.[].price': 'products.[].price',
      'products.[].image': 'products.[].image',
      'products.[].onSyspro': 'products.[].onSyspro',
      'products.[].priceAdditionalInfo': 'products.[].priceAdditionalInfo',
      'products.[].landedPrice': 'products.[].landedPrice',
      'products.[].wh10CostPrice': 'products.[].wh10CostPrice',
      'products.[].threeMonthAvePrice': 'products.[].threeMonthAvePrice',
      'products.[].listPrice': 'products.[].listPrice',
      'products.[].buyer': 'products.[].buyer',
      'products.[].planner': 'products.[].planner',
      'products.[].isHazardous': 'products.[].isHazardous',
      'products.[].siteEvaluationRequired': 'products.[].siteEvaluationRequired',
      'products.[].packedLength': 'products.[].packedLength',
      'products.[].packedWidth': 'products.[].packedWidth',
      'products.[].packedHeight': 'products.[].packedHeight',
      'products.[].packedVolume': 'products.[].packedVolume',
      'products.[].packedWeight': 'products.[].packedWeight',
      'products.[].numberOfSalesOrders': 'products.[].numberOfSalesOrders',
      'products.[].numberOfPurchaseOrders': 'products.[].numberOfPurchaseOrders',
      'products.[].supplier': 'products.[].supplier',
      'products.[].model': 'products.[].model',
      'products.[].shipmentSize': 'products.[].shipmentSize',
      'products.[].exWorker': 'products.[].exWorker',
    },
    resultType: 'object',
    edit: false,
    new: false,
  },
};
