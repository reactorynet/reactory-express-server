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
  }
};

export default graphql;