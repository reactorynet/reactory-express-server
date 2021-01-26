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
        product
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
    variables: {
      'formData.product': 'product',
      'formData.paging': 'paging'
    },
    resultMap: {
      'paging': 'paging',
      'product': 'product',
      'products[].id': 'products[].id',
      'products[].name': 'products[].name',
      'products[].code': 'products[].code',
      'products[].description': 'products[].description',
      'products[].qtyAvailable': 'products[].qtyAvailable',
      'products[].qtyOnHand': 'products[].qtyOnHand',
      'products[].qtyOnOrder': 'products[].qtyOnOrder',
      'products[].unitOfMeasure': 'products[].unitOfMeasure',
      'products[].price': 'products[].price',
      'products[].image': 'products[].image',
      'products[].onSyspro': 'products[].onSyspro',
      'products[].priceAdditionalInfo': 'products[].priceAdditionalInfo',
      'products[].landedPrice': 'products[].landedPrice',
      'products[].wh10CostPrice': 'products[].wh10CostPrice',
      'products[].threeMonthAvePrice': 'products[].threeMonthAvePrice',
      'products[].listPrice': 'products[].listPrice',
      'products[].productPricing': 'products[].productPricing',
      'products[].onSpecial': 'products[].onSpecial',
      'products[].currencyCode': 'products[].currencyCode',
      'products[].specialPrice': 'products[].specialPrice',
      'products[].availableCurrencies': 'products[].availableCurrencies',
    },
    resultType: 'object',
    edit: false,
    new: false,
    refreshEvents: [
      { name: 'lasec-crm::product-search' }
    ],
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
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
          product
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
      resultMap: {
        'paging': 'paging',
        'product': 'product',
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
        'products.[].productPricing': 'products.[].productPricing',
        'products.[].onSpecial': 'products.[].onSpecial',
        'products.[].currencyCode': 'products.[].currencyCode',
        'products.[].specialPrice': 'products.[].specialPrice',
        'products.[].availableCurrencies': 'products.[].availableCurrencies',
      },
      resultType: 'object',
      edit: false,
      new: false,
      refreshEvents: [
        { name: 'lasec-crm::product-search' }
      ],
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
    },
  },
};
