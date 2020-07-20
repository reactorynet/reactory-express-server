import { Reactory } from "@reactory/server-core/types/reactory";
import { fileAsString } from "@reactory/server-core/utils/io";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetFreightRequestQuoteDetail',
    text: `query LasecGetFreightRequestQuoteDetail($quoteId: String!) {
        LasecGetFreightRequestQuoteDetail(quoteId: $quoteId) {
          email
          communicationMethod
          options {
            transportMode
            incoTerm
            namedPlace
            vatExempt
            fromSA
            totalValue
            companyName
            streetAddress
            suburb
            city
            province
            country
            freightFor
            offloadRequired
            hazardous
            refrigerationRequired
            containsLithium
            sample
            additionalDetails
            productDetails
          }
      }
    }`,
    variables: {
      'formData.code': 'quoteId',
    },
    resultMap: {
      'email': 'email',
      'communicationMethod': 'communicationMethod',
      'options[].transportMode': 'options[].transportMode',
      'options[].incoTerm': 'options[].incoTerm',
      'options[].namedPlace': 'options[].namedPlace',
      'options[].vatExempt': 'options[].vatExempt',
      'options[].fromSA': 'options[].fromSA',
      'options[].totalValue': 'options[].totalValue',
      'options[].companyName': 'options[].companyName',
      'options[].streetAddress': 'options[].streetAddress',
      'options[].suburb': 'options[].suburb',
      'options[].city': 'options[].city',
      'options[].province': 'options[].province',
      'options[].country': 'options[].country',
      'options[].freightFor': 'options[].freightFor',
      'options[].offloadRequired': 'options[].offloadRequired',
      'options[].hazardous': 'options[].hazardous',
      'options[].refrigerationRequired': 'options[].refrigerationRequired',
      'options[].containsLithium': 'options[].containsLithium',
      'options[].sample': 'options[].sample',
      'options[].additionalDetails': 'options[].additionalDetails',
      'options[].productDetails': 'options[].productDetails',
    },
    autoQuery: true,
    queryMessage: 'Retrieving freight request quote details',
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
