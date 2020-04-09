
import { Reactory } from '@reactory/server-core/types/reactory';

export const DocumentSchema: Reactory.ISchema = {
  type: 'object',
  title: 'Document Schema (Override - Title)',
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
    size: {
      type: 'number',
      title: 'Size'
    }
  }
};


