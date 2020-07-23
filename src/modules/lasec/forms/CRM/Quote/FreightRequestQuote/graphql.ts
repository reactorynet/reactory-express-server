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
          }
          productDetails {
            code
            description
            unitOfMeasure
            sellingPrice
            qty
            length
            width
            height
            volume
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

      'productDetails': 'productDetails',
      'productDetails[].code': 'productDetails[].code',
      'productDetails[].description': 'productDetails[].description',
      'productDetails[].unitOfMeasure': 'productDetails[].unitOfMeasure',
      'productDetails[].sellingPrice': 'productDetails[].sellingPrice',
      'productDetails[].qty': 'productDetails[].qty',
      'productDetails[].length': 'productDetails[].length',
      'productDetails[].width': 'productDetails[].width',
      'productDetails[].height': 'productDetails[].height',
      'productDetails[].volume': 'productDetails[].volume',
    },
    autoQuery: true,
    queryMessage: 'Retrieving freight request quote details',
    resultType: 'object',
    edit: true,
    new: true,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
  mutation: {
    edit: {
      name: "LasecCRMUpdateFreightRequestDetails",
      text: `mutation LasecCRMUpdateFreightRequestDetails($freightRequestDetailInput: FreightReqestDetailInput!){
        LasecCRMUpdateFreightRequestDetails(freightRequestDetailInput: $freightRequestDetailInput) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating freight request quote',
      variables: {
        'formData.code': 'freightRequestDetailInput.quoteId',
        'formData.email': 'freightRequestDetailInput.email',
        'formData.communicationMethod': 'freightRequestDetailInput.communicationMethod',
        'formData.options': 'freightRequestDetailInput.options',
        'formData.productDetails': 'freightRequestDetailInput.productDetails',
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Freight request quote details successfully updated.',
        props: {
          timeOut: 5000,
          canDismiss: false,
        }
      },
    },
    new: {
      name: "LasecCRMUpdateFreightRequestDetails",
      text: `mutation LasecCRMUpdateFreightRequestDetails($freightRequestDetailInput: FreightReqestDetailInput!){
        LasecCRMUpdateFreightRequestDetails(freightRequestDetailInput: $freightRequestDetailInput) {
          success
          message
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating freight request quote',
      variables: {
        'formData.code': 'freightRequestDetailInput.quoteId',
        'formData.email': 'freightRequestDetailInput.email',
        'formData.communicationMethod': 'freightRequestDetailInput.communicationMethod',
        'formData.options': 'freightRequestDetailInput.options',
        'formData.productDetails': 'freightRequestDetailInput.productDetails',
      },
      onError: {
        componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
        method: 'onGraphQLQueryError',
      },
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Freight request quote details successfully updated.',
        props: {
          timeOut: 5000,
          canDismiss: false,
        }
      },
    },
  },
};

export default graphql;
