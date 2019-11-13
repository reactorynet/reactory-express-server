export default (title: string): IFormSchema => ({
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