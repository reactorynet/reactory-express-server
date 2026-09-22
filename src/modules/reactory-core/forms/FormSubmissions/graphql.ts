import Reactory from '@reactorynet/reactory-core';

/**
 * The explorer reads through the generic submission query.
 *
 * The table widget drives the query with `remoteData`, mapping the filter
 * values off `formContext.formData` and supplying `paging` itself from its own
 * page state - which is why the variable map deliberately does not set paging.
 */
const graphql: Reactory.Forms.IFormGraphDefinition = {
  queries: {
    submissions: {
      name: 'ReactoryFormSubmissions',
      text: `query ReactoryFormSubmissions(
        $fqn: String!,
        $filter: ReactoryFormSubmissionFilter,
        $paging: PagingRequest,
        $sort: ReactoryFormSubmissionSortInput
      ) {
        ReactoryFormSubmissions(fqn: $fqn, filter: $filter, paging: $paging, sort: $sort) {
          paging {
            page
            pageSize
            total
            hasNext
          }
          submissions {
            id
            fqn
            userId
            ipAddress
            createdAt
            updatedAt
            formData
            user {
              id
              firstName
              lastName
              email
              avatar
            }
          }
        }
      }`,
      variables: {
        'formContext.formData.fqn': 'fqn',
        'formContext.formData.filter.from': 'filter.from',
        'formContext.formData.filter.to': 'filter.to',
        'formContext.formData.filter.userId': 'filter.userId',
        'formContext.formData.filter.anonymous': 'filter.anonymous',
        'formContext.formData.filter.search': 'filter.search',
        'formContext.formData.filter.query': 'filter.query',
      },
      resultType: 'object',
      resultMap: {
        paging: 'paging',
        submissions: 'data',
      },
    },
  },
};

export default graphql;
