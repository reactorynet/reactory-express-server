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
    filename: { type: 'string',  title: "Filename"},
    mimetype: { type: 'string',  title: "Type"},
  }
};

const emailAttachments: Reactory.ISchema = {
  type: 'array',
  title: 'Attachments',
  items: { ...emailAttachment }
};


const schema: Reactory.IObjectSchema = {
  title: '',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      title: 'Email Id',
    },
    quote_id: {
      type: 'string',
      title: 'Quote #',
    },
    email_type: {
      type: 'string',
      title: 'Email Type',       
    },
    from: { ...emailAddress },
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
