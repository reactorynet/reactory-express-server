import { Reactory } from "@reactory/server-core/types/reactory";

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'LasecGetClientDetail',
    text: `query LasecGetClientDetail($id: String!){
      LasecGetClientDetail(id: $id){
        id
        customer {
          id
          specialRequirements
        }
      }
    }`,
    variables: {
      'formData.id': 'id',
    },
    resultMap: {
      'id': 'id',
      'customer.id': 'companyId',
      'customer.specialRequirements': 'specialRequirements',
    },
    autoQuery: true,
    queryMessage: 'Loading customer details',
    resultType: 'object',
    edit: false,
    new: false,
  }
};

export default graphql;
