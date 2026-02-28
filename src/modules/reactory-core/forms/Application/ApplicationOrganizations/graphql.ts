import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    pagedOrganizations: {
      name: 'CorePagedOrganizations',
      text: `query CorePagedOrganizations($search: String, $paging: PagingRequest) {
        CorePagedOrganizations(search: $search, paging: $paging) {
          paging {
            page
            pageSize
            total
            hasNext
          }
          organizations {
            id
            name
            code
            tradingName
            logo
            logoURL
            avatar
            avatarURL
            businessUnits {
              id
              name
              description
              members {
                id
                firstName
                lastName
                email
              }
            }
            createdAt
            updatedAt
          }
        }
      }`,
      variables: {
        'query.search': 'search',
        'query.page': 'paging.page',
        'query.pageSize': 'paging.pageSize'
      },
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'organizations': 'data',
        'paging.total': 'totalOrganizations'
      }
    },
    organizationDetails: {
      name: 'CoreOrganization',
      text: `query CoreOrganization($id: String!) {
        CoreOrganization(id: $id) {
          id
          name
          code
          tradingName
          logo
          logoURL
          avatar
          avatarURL
          settings
          businessUnits {
            id
            name
            description
            organization {
              id
              name
            }
            owner {
              id
              firstName
              lastName
              email
            }
            members {
              id
              firstName
              lastName
              email
              avatar
            }
          }
          createdAt
          updatedAt
        }
      }`,
      variables: {},
      resultType: 'object',
      resultMap: {}
    },
    teamsForOrganization: {
      name: 'teamsForOrganization',
      text: `query teamsForOrganization($id: String!) {
        teamsForOrganization(id: $id) {
          id
          name
          title
          description
          avatar
          owner {
            id
            firstName
            lastName
            email
          }
          members {
            id
            firstName
            lastName
            email
            avatar
          }
          createdAt
          updatedAt
        }
      }`,
      variables: {},
      resultType: 'array',
      resultMap: {}
    },
    organizationUsers: {
      name: 'CoreUsersForOrganization',
      text: `query CoreUsersForOrganization($id: String!, $searchString: String, $paging: PagingRequest) {
        CoreUsersForOrganization(id: $id, searchString: $searchString, paging: $paging) {
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
          }
        }
      }`,
      variables: {},
      resultType: 'object',
      resultMap: {}
    }
  },
  mutation: {
    new: {
      name: 'createOrganization',
      text: `mutation createOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          id
          name
          code
          logo
          createdAt
        }
      }`,
      variables: {},
      resultType: 'object',
      resultMap: {}
    },
    edit: {
      name: 'updateOrganization',
      text: `mutation updateOrganization($id: String!, $input: UpdateOrganizationInput!) {
        updateOrganization(id: $id, input: $input) {
          id
          name
          code
          logo
          updatedAt
        }
      }`,
      variables: {},
      resultType: 'object',
      resultMap: {}
    }
  }
}

export default graphql;
