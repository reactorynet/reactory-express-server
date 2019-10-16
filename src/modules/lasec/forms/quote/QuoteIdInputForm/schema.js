


const schema = {
  type: 'object',    
  required: [
    'quote_id',
  ],
  properties: {
    quote_id: {
      type: 'string',
      title: 'Quote Id',
      description: 'Quote Id',
    },
  }    
};


export default schema;