import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphQL = {
  query: {
    name: 'ReactoryGraphQLQuery',
    text: `query ReactoryGraphQLQuery($input: GraphQLQueryInput!){
      ReactoryGraphQLQuery(input: $input){  
        data
        errors
        extensions
        success
        executionTime
      }
    }`,
    variables: {
      'formData.query': 'input.query',
      'formData.variables': 'input.variables',
      'formData.operationName': 'input.operationName',
    },
    resultMap: {
      'data': 'data',
    },
    options: {},
  },
};

export default graphql;
