
import Builder from '@reactory/server-core/utils/schema';

export default {
  type: 'object',
  title: 'Form Editor',
  properties: {
     diagram: {
       type: 'object',
       title: 'Visual Diagram',
       properties: {
        nodes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string'
              }
            }
          }
        }
      }
    } 
  }
};
