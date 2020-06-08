import { Reactory } from "types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
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
      'products.[].productPricing': 'products.[].productPricing',
    },
    resultType: 'object',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  }
};

export default graphql;
