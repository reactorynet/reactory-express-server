
import { Reactory } from '@reactory/server-core/types/reactory';

export const DocumentSchema: Reactory.ISchema = {
  type: 'object',
  title: 'Document Schema (Override - Title)',
  properties: {
    view: {
      title: '',
      type: 'string'
    },
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
    size: {
      type: 'number',
      title: 'Size'
    },
    upload: {
      type: 'string',
      title: 'File',
    },
    documents: {
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


