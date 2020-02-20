import { Reactory } from "types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetProductList',
    autoQuery: false,
    text: `query LasecGetProductList($product: String!){
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
    },
    resultType: 'array',
    edit: false,
    new: false,
  }
};

export default graphql; 
