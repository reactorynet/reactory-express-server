const graphql = {
  query: {
    name: 'LasecGetQuoteById',
    text: `query LasecGetQuoteById($quote_id: String!){
      LasecGetQuoteById(quote_id: $quote_id){
        id
        code
        statusName
        note
        customer {
          id
          fullName
        }
        company {
           id
           tradingName
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
        'formData.code': 'quote_id',
        'formData.nextAction': 'input.nextAction',
        'formData.reason': 'input.reason',
        'formData.reminder': 'input.reminder',
        'formData.note': 'input.note'
      },
      options: {
        // refetchQueries: ['LasecGetQuoteById($quote_id: String!)'],
      }, 
      onSuccessEvent: {
        name: 'lasec-crm::QuoteStatusUpdated'
      },     
      onSuccessMethod: 'notification',
      notification: {
        inAppNotification: true,
        title: 'Quote status updated.',
        props: {
          timeOut: 10000,
          canDismiss: true,
          typeKey: 'success',          
          components: [
            {
              componentFqn: 'core.ConditionalIconComponent@1.0.0',
              componentProps: {
                conditions: [
                  {
                    key: 'false',
                    icon: 'trip_origin',
                    style: {
                      color: 'red'
                    },
                    tooltip: 'Confirm that your action has been saved to your task'
                  },
                  {
                    key: 'true',
                    icon: 'trip_origin',
                    style: {
                      color: '#fff'
                    },
                    tooltip: 'A task should be in your outlook calendar'
                  }

                ]
              },
              style: {
                marginRight: '8px',
                marginTop: '8px',
              },
              propsMap: {
                'formData.success': 'value',
              },
            }
          ]
        }
      },                
    },    
  },
};

export default graphql;
