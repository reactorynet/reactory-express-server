export default {
  queries: {
    products_table: {
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
            exWorksFactor
  
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
      resultType: 'object',
      edit: false,
      new: false,
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    },
  },  
};
