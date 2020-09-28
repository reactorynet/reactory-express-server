import { Reactory } from '@reactory/server-core/types/reactory';
import Builder from '@reactory/server-core/schema';
import logger from '@reactory/server-core/logging';

// const schema: Reactory.ISchema = {
const emailAddress: Reactory.IObjectSchema = {
  type: 'object',
  properties: {
    display: { type: 'text',  title: "Name"},
    email: { type: 'text', format: 'email', title: "Email" }
  }
}


const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    code: {
      type: 'string',
      title: 'Quote Code:',
    },
    email_type: {
      type: 'string',
      title: 'Email Type', 
    },
    toList: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          email: {
            type: 'string'
          }
        },
      },
    },
    customerName: {
      type: 'string',
      title: 'Customer Name:',
    },
    customerEmail: {
      type: 'string',
      title: 'Customer Email:',
    },
    subject: {
      type: 'string',
      title: 'Subject:',
    },
    message: {
      type: 'string',
      title: 'Message:',
    },
  }
};

export default schema;
