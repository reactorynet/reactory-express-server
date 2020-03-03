import { Reactory } from '@reactory/server-core/types/reactory';
const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Client Id'
    },
    tabs: {
      type: 'array',      
      items: {
        type: 'object',
        properties: {
          title: {
            type:'string'
          },          
        }
      }      
    },    
  }
};

export default schema;
