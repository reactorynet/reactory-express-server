import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        clientStatus
        firstName
        lastName
        fullName
        emailAddress
        alternateEmail
        country
        mobileNumber
        officeNumber
        alternateOfficeNumber
        customer {
          id
          tradingName
          accountNumber
          customerStatus
          country
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'emailAddress': 'emailAddress',
      'alternateEmail': 'alternateEmail',
      'officeNumber': 'officeNumber',
      'mobileNumber': 'mobileNumber',
      'alternateNumber': 'alternateNumber',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  },
  mutation: {
    edit: {
      name: "LasecUpdateClientDetails",
      text: `LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
        LasecUpdateClientDetails(clientInfo: $clientInfo) {
          Success
        }`,
      objectMap: true,
      updateMessage: 'Updating Template Content',
      variables: {
        'formData.id': 'clientInfo.clientId',
        'formData.mobileNumber': 'clientInfo.mobileNumber',
        'formData.alternateNumber': 'clientInfo.alternateNumber',
        'formData.emailAddress': 'clientInfo.email',
        'formData.alternateEmail': 'clientInfo.alternateEmail',
      },
      onSuccessMethod: 'refresh'
    }
  }
};

export default graphql;
