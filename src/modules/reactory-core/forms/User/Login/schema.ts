import Reactory from '@reactory/reactory-core';
import { UserLogin } from "../../schema/User";

const schema: Reactory.Schema.ISchema = {
  type: "object",
  title: "Login",
  properties: {
    header: {
      type: "string",
      title: "Header"
    },
    user: { ...UserLogin },
    oauth: {
      type: 'array',
      title: 'OAuth',
      items: {
        type: 'object',
        title: 'Auth Enabled',
        properties: {
          id: { type: 'string' },
          url: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' }
        }
      },      
    }
  }
}

export default schema;