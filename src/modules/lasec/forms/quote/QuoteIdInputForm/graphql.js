const graphql = {
  query: {
    name: 'LasecGetQuoteById',
    text: `query LasecGetQuoteById($quote_id: String!){
      LasecGetQuoteById(quote_id: $quote_id){
        id
        statusGroup
        status
        statusName
        allowedStatus
        meta
        customer {
          id
          fullName
        }
        company {
           id
           tradingName
        }                        
        timeline {
          id
          who {
            id
            firstName
            lastName
          }
          what
          when
          notes    
          via      
        }
      }
    }`,
    variables: {
      'formContext.query.quote_id': 'quote_id',
    },    
    edit: false,
    new: true,
  },
  mutation: {
    new: {
      name: 'LasecUpdateQuoteStatus',
      text: `mutation LasecUpdateQuoteStatus($quote_id: String!, $input: LasecQuoteStatusUpdate){
        LasecUpdateQuoteStatus(quote_id: $quote_id, input: $input){
          quote {
            id
          }
          success
          message                                    
        }
      }`,
      objectMap: true,
      updateMessage: 'Updating next actions for quote ${formData.id}',
      variables: {
        'formData.id': 'quote_id',        
        'formData.nextAction': 'input.nextAction',
        'formData.reason': 'input.reason',
        'formData.reminder': 'input.reminder',
        'formData.note': 'input.note'
      },      
      options: {
        refetchQueries: ['LasecGetQuoteById($quote_id: String!)'],
      },
      onSuccessMethod: 'event:UpdateQuoteStatus_onMutationSuccess',
    },
  },
};

export default graphql;