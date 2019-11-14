import { IObjectSchema } from "@reactory/server-modules/core/schema/index";

export default (title: string): IObjectSchema => ({
  type: 'object',
  title: title,
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            title: 'value',            
          },
          name: {
            type: 'string',
            title: 'name'
          },
          fill: {
            type: 'string',
            title: 'fillcolor'
          }
        }
      }            
    }
  }  
});