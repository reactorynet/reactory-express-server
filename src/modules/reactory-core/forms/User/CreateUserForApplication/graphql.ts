import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    new: {
      name: 'ReactoryCoreCreateUserForApplication',
      text: `mutation ReactoryCoreCreateUserForApplication(
        $input: CreateUserInput!,
        $clientId: String!,
        $password: String,
        $roles: [String]
      ) {
        ReactoryCoreCreateUserForApplication(
          input: $input,
          clientId: $clientId,
          password: $password,
          roles: $roles
        ) {
          id
          firstName
          lastName
          email
          mobileNumber
        }
      }`,
      variables: {
        'formData.firstName': 'input.firstName',
        'formData.lastName': 'input.lastName',
        'formData.email': 'input.email',
        'formData.mobileNumber': 'input.mobileNumber',
        'formContext.props.applicationId': 'clientId',
        'formData.password': 'password',
        'formData.roles': 'roles',
      },
      resultMap: {
        'id': 'id',
        'firstName': 'firstName',
        'lastName': 'lastName',
        'email': 'email',
        'mobileNumber': 'mobileNumber',
      },
      resultType: 'object',
      onSuccessMethod: ['notification'],
      notification: {
        inAppNotification: true,
        title: 'User created successfully',
        props: {
          timeOut: 3000,
          canDismiss: true,
        },
      },
    },
  },
};

export default graphql;
