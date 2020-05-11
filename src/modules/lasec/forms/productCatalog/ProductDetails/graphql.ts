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

          productClass
          tariffCode
          leadTime
          validPriceUntil
          lastUpdated
          lastUpdatedBy
          lastOrdered
          lastReceived
          supplyCurrency
          listCurrency

          freightFactor
          clearingFactor
          actualCostwh10
          actualCostwh20
          actualCostwh21
          actualCostwh31
          supplierUnitPrice
          percDiscount
          discountPrice
          freightPrice
          exWorksPrice
          craftingFOC
          netFOB
          percDuty
          percDuty
          clearance
          landedCost
          markup
          sellingPrice
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

      'products.[].productClass': 'products.[].productClass',
      'products.[].tariffCode': 'products.[].tariffCode',
      'products.[].leadTime': 'products.[].leadTime',
      'products.[].validPriceUntil': 'products.[].validPriceUntil',
      'products.[].lastUpdated': 'products.[].lastUpdated',
      'products.[].lastUpdatedBy': 'products.[].lastUpdatedBy',
      'products.[].lastOrdered': 'products.[].lastOrdered',
      'products.[].lastReceived': 'products.[].lastReceived',
      'products.[].supplyCurrency': 'products.[].supplyCurrency',
      'products.[].listCurrency': 'products.[].listCurrency',

      'products.[].freightFactor': 'products.[].freightFactor',
      'products.[].clearingFactor': 'products.[].clearingFactor',
      'products.[].actualCostwh10': 'products.[].actualCostwh10',
      'products.[].actualCostwh20': 'products.[].actualCostwh20',
      'products.[].actualCostwh21': 'products.[].actualCostwh21',
      'products.[].actualCostwh31': 'products.[].actualCostwh31',
      'products.[].supplierUnitPrice': 'products.[].supplierUnitPrice',
      'products.[].percDiscount': 'products.[].percDiscount',
      'products.[].discountPrice': 'products.[].discountPrice',
      'products.[].freightPrice': 'products.[].freightPrice',
      'products.[].exWorksPrice': 'products.[].exWorksPrice',
      'products.[].craftingFOC': 'products.[].craftingFOC',
      'products.[].netFOB': 'products.[].netFOB',
      'products.[].percDuty': 'products.[].percDuty',
      'products.[].clearance': 'products.[].clearance',
      'products.[].landedCost': 'products.[].landedCost',
      'products.[].markup': 'products.[].markup',
      'products.[].sellingPrice': 'products.[].sellingPrice',
    },
    resultType: 'object',
    edit: false,
    new: false,
  },
};
