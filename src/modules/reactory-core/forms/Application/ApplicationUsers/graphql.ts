import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    applicationUsers: {
      name: 'ReactoryClientApplicationUsers',
      text: `query ReactoryClientApplicationUsers($clientId: String!, $filter: ReactoryUserFilterInput, $paging: PagingRequest) {
        ReactoryClientApplicationUsers(clientId: $clientId, filter: $filter, paging: $paging) {
          paging {
            page
            pageSize
            total
            hasNext
          }
          users {
            id
            firstName
            lastName
            email
            avatar
            mobileNumber
            memberships {
              id
              roles
              enabled
              lastLogin
              created
            }
            createdAt
            updatedAt
            lastLogin
          }
          totalUsers
        }
      }`,
      variables: {
        'formContext.props.applicationId': 'clientId',
      },
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'users': 'data',
        'totalUsers': 'totalUsers'
      }
    }
  }
}

export default graphql;
