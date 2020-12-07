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
      title: '',
      type: 'string'
    },
    id: {
      type: 'string',
      title: 'Client',
      // description: 'The client reference to use for document uploads'
    },

    upload: {
      type: 'string',
      title: 'File',
      // description: 'This field is used to upload the file'
    },

    uploadContext: {
      type: 'array',
      items: {
        type: 'string',
      }
    },

    $paging: {
      type: "object",
      title: "Document Pging Input",
      properties: {
        page: {
          type: "number",
          title: "Page"
        },
        pageSize: {
          type: "number",
          title: "Page Size"
        }
      }
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
        },
      },
    },
  }
};
