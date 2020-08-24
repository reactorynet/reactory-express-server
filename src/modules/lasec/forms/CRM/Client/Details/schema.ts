import { Reactory } from '@reactory/server-core/types/reactory';
import { ClientSchema } from "../Schemas"
let clientSchema: Reactory.ISchema = { ...ClientSchema };

//modifications
clientSchema.title = ""
clientSchema.properties.currency = {
  type: 'string',
  title: 'Currency'
},

clientSchema.properties.currentBalance = {
  type: 'number',
  title: 'Available Balance',  
};

clientSchema.properties.creditLimit = {
  type: 'number',
  title: 'Credit Limit',
};

const schema: Reactory.ISchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    client: clientSchema,    
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
