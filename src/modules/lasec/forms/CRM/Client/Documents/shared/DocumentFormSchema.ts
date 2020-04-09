import { Reactory } from '@reactory/server-core/types/reactory';


const commentSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    id: {
      type: 'string',
      title: 'ID'
    },
    filename: {
      type: 'string',
      title: 'Filename'
    },
    link: {
      type: 'string',
      title: 'Link'
    },
  }
}; 

export const DocumentFormSchema: Reactory.ISchema = {
  type: 'object',
  title: 'Client Documents Form (Override)',
  properties: {
    view: {
      type: 'string',
      title: 'View Mode',
      description: 'View mode for the form, use this field to toggle the editing mode where supported.'
    },
    id: {
      type: 'string',
      title: 'Client',
      description: 'The client reference to use for document uploads'
    },   

    upload: {
      type: 'string',
      title: 'File',
      description: 'This field is used to upload the file'
    },    
    
    uploadedDocuments: {
      type: 'array',      
      items: { 
        type: 'object',
        properties: {
          id: {
            type: 'string',
            title: 'ID'
          },
          filename: {
            type: 'string',
            title: 'Filename'
          },
          link: {
            type: 'string',
            title: 'Link'
          },
        }  
      }
    },    
  }
};