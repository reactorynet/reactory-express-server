import { Reactory } from "@reactory/server-core/types/reactory";

export const table_graph: Reactory.IFormGraphDefinition = {
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
          landedPrice
          wh10CostPrice
          threeMonthAvePrice
          listPrice
          onSyspro
          onSpecial
          currencyCode
          specialPrice
          productPricing {
            cost_price_cents
            max_price_cents
            min_price_cents
            min_non_authorisation_price_cents
            three_month_ave_price_cents
            list_price_cents
            currency_symbol
            currency_code
            currency_description
            special_price_cents
          }
          availableCurrencies
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
            landedPrice
            wh10CostPrice
            threeMonthAvePrice
            listPrice
            onSyspro
            onSpecial
            currencyCode
            specialPrice
            productPricing {
              cost_price_cents
              max_price_cents
              min_price_cents
              min_non_authorisation_price_cents
              three_month_ave_price_cents
              list_price_cents
              currency_symbol
              currency_code
              currency_description
              special_price_cents
            }
            availableCurrencies
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
    }
  }
}

export const cards_graph: Reactory.IFormGraphDefinition = {
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
          landedPrice
          wh10CostPrice
          threeMonthAvePrice
          listPrice
          onSyspro
          onSpecial
          currencyCode
          specialPrice
          productPricing {
            cost_price_cents
            max_price_cents
            min_price_cents
            min_non_authorisation_price_cents
            three_month_ave_price_cents
            list_price_cents
            currency_symbol
            currency_code
            currency_description
            special_price_cents
          }
          availableCurrencies
        }
      }
    }`,
    variables: {
      'formData.product': 'product',
      'formData.paging': 'paging'
      // 'formContext.$formData.product': 'product',
      // 'formContext.$formData.paging': 'paging'
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
};

export default { table_graph, cards_graph };
