/**
 *  FormSchema that represent the data for a piechart in recharts
 */
export default (title: string): Reactory.Schema.IObjectSchema => ({
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
