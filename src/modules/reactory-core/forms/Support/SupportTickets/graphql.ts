import Reactory from '@reactory/reactory-core';

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    new: {
      name: 'ReactoryCreateSupportTicket',
      text: `mutation ReactoryCreateSupportTicket($request: String, description: String, requestType: String) {
        ReactoryCreateSupportTicket(request: $request, description: $description) {
          id
          request
          description
          status
          reference
        }
      }`,
      variables: {
        'formData.request': 'request',
        'formData.description': 'description'
      },
      resultMap: {
        'id': 'id',
        'request': 'request',
        'description': 'description',
        'status': 'status',
        'reference': 'reference'
      }
    },

    edit: {
      name: 'ReactoryUpdateSupportTicket',
      text: `mutation ReactoryUpdateSupportTicket($ticket_id: String, $status: String, $assignedTo: String, $comment: String) {
        ReactoryUpdateSupportTicket(ticket_id: $ticket_id, status: $status, assignedTo: $assignedTo, comment: $comment) {
          id
          request
          description
          status
          reference
          comments {
            id
            text
            who {
              id
              firstName
              lastName
              email
              avatar              
            }
            when
            upvotes
            downvotes
            favorites            
          }
        }
      }`,
      variables: {
        'formData.request': 'request',
        'formData.description': 'description'
      },
      resultMap: {
        'id': 'id',
        'request': 'request',
        'description': 'description',
        'status': 'status',
        'reference': 'reference'
      }
    }
  },
  
  queries: {
    openTickets: {
      name: 'ReactorySupportTickets',
      text: `query ReactoryMySupportTickets($filter: ReactorySupportTicketFilter, $paging: PagingRequest) {
        ReactorySupportTickets(filter: $filter, paging: $paging) {
          paging {
            page
            pageSize
            hasNext
            total
          }
          tickets {
            id
            request
            description
            reference
            status
            requestType
            priority
            createdDate
            updatedDate
            createdBy {
              id
              firstName
              lastName
              avatar
              email
            }
            assignedTo {
              id
              firstName
              lastName
              avatar
              email
            }
            comments {
              id
              text
              when
              who {
                id
                firstName
                lastName
                avatar
                email
              }
            }
            documents {
              id
            }
            tags
            slaDeadline
            isOverdue
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'tickets': 'data'
      }
    },
    users: {
      name: 'ReactoryUsers',
      text: `query ReactoryUsers($filter: ReactoryUserFilterInput, $paging: PagingRequest) {
        ReactoryUsers(filter: $filter, paging: $paging) {
          ... on PagedUserResults {
            paging {
              page
              pageSize
              hasNext
              total
            }
            users {
              id
              firstName
              lastName
              email
              avatar
              roles
              createdAt
              updatedAt
            }
          }
          ... on ReactoryUserQueryFailed {
            message
            code
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'users': 'data'
      }
    }
  }
}

export default graphql;