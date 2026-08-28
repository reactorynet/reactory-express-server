import Reactory from '@reactorynet/reactory-core';

const graphql: Reactory.Forms.IFormGraphQL = {
  query: {
    name: 'ReactorySQLQuery',
    text: `query ReactorySQLQuery($input: SQLQuery){
      ReactorySQLQuery(input: $input){  
        paging {
          total
          page
          hasNext
          pageSize
        }
        columns {
          field
          title
          widget
          selected
        }
        filters {
          field
          value            
          operator
        }
        context {
          schema
          table
          commandText
          provider       
          connectionId                 
        }
        data
      }
    }`,
    variables: {
      'formData.connectionId': 'input.context.connectionId',
      'formData.commandText': 'input.context.commandText',
      'formData.paging.page': 'input.paging.page',
      'formData.paging.pageSize': 'input.paging.pageSize',
    },
    resultMap: {
      'data': 'data',
      'paging': 'paging',
      'columns': 'columns',
    },
    options: {},
  },
};

export default graphql;
