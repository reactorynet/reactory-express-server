import { Reactory } from '@reactory/server-core/types/reactory';
import Builder from '@reactory/server-core/schema';
import logger from '@reactory/server-core/logging';

// const schema: Reactory.ISchema = {
const emailAddress: Reactory.IObjectSchema = {
  type: 'object',
  properties: {
    display: { type: 'string',  title: "Name"},
    email: { type: 'string', format: 'email', title: "Email" }
  }
}

const emailAddressList: Reactory.ISchema = {
  type: 'array',
  items: { ...emailAddress }
}


const emailAttachment: Reactory.IObjectSchema = {
  type: 'object',
  title: 'Attachment',
  properties: {
    id: { type: 'string',  title: "id"},
    url: { type: 'string',  title: "Url"},
    name: { type: 'string',  title: "Filename"},
    mimetype: { type: 'string',  title: "Type"},
  }
};

const emailAttachments: Reactory.ISchema = {
  type: 'array',
  items: { ...emailAttachment }
};


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
      description: 'Use the selector to select a new template'
    },
    to: { ...emailAddressList },
    cc: { ...emailAddressList },
    bcc: { ...emailAddressList },
    attachments: { ...emailAttachments },    
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
