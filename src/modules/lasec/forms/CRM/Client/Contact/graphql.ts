import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        emailAddress
        alternateEmail        
        mobileNumber
        officeNumber
        alternateOfficeNumber        
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
      'alternateOfficeNumber': 'alternateNumber',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: true,
    new: false,
  },
  mutation: {
    edit: {
      name: "LasecUpdateClientDetails",
      text: `mutation LasecUpdateClientDetails($clientInfo: ClientUpdateInput!){
        LasecUpdateClientDetails(clientInfo: $clientInfo) {
          Success
        }
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
