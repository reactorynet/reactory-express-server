
      //perform customzation of the schema here to avoid overwrites on main file.
      export default {
        type: 'object',
        title: 'Reactory Forms',
        properties: {
          recent: {
            type: 'array',
            title: 'Recent',            
            items: {
              properties: {
                id: {
                  type: 'string',
                  title: 'Recent'
                },                
              }
            }
          },
          forms: {
            type: 'array',
            title: 'Reactory Forms',            
            items: {
              properties: {
                id: {
                  type: 'string',
                  title: 'Form Id'
                },
                name: {
                  type: 'string',
                  title: 'Form Name',
                },            
                nameSpace: {
                  type: 'string',
                  title: 'Version Name',
                },
                version: {
                  type: 'string',
                  title: 'Version'
                }
              }
            }
          }
        }       
      };
      