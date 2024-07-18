import Reactory from '@reactory/reactory-core';

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'ReactoryLogin',
    text: `query ReactoryLogin($userName: String, $password: String){
      id
      username
      email
      firstName
      lastName
    }`,
    autoQuery: false,
    onSuccessEvent: {
      name: 'onReactoryLogin',
      dataMap: {
        'id': 'id',
        'firstName': 'firstName',
        'lastName': 'lastName',
        'email': 'email',
      }
    },
    onSuccessMethod: "route",
    onSuccessUrl: "/"
  }
}

export default graphql;