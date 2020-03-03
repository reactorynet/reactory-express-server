import { Reactory } from "@reactory/server-core/types/reactory";
import { ClientSchema } from "../Schemas"
let schema: Reactory.ISchema = { ...ClientSchema };

//modifications
schema.title = ""
schema.properties.currency = {
  type: 'string',
  title: 'Currency'
},

schema.properties.availableBalance = {
  type: 'number',
  title: 'Available Balance',  
};

schema.properties.creditLimit = {
  type: 'number',
  title: 'Credit Limit',
};

export default schema;