import { Reactory } from '@reactory/server-core/types/reactory';

const graphql: Reactory.IFormGraphDefinition = {
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
      text: `query ReactorySupportTickets($paging: RagingRequest, $filter: ReactorySupportTicketFilter) {
        ReactorySupportTickets(paging: $paging, filter: $filter) {
          paging {
            page
            pageSize
            hasNext
            total
          }
          tickets {
            id
            request
            reference
            status
            requestType
            createdDate
            createBy {
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
          }
        }
      }`,
      resultType: 'object',
      resultMap: {
        'paging': 'paging',
        'tickets': 'data'
      }
    }
  }
}

export default graphql;