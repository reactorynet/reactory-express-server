const TemplateListSchema: Reactory.IObjectSchema = {
  type: 'object',
  properties: {    
    results: {
      type: 'array',
      items: {
        type: 'object',
        title: 'Template',
        properties: {
          id: {
            type: 'string',
            name: 'Template Id',
          },
          name: {
            type: 'string',
            name: 'Name'
          },
          description: {
            type: 'string',
            name: 'Description'
          },
          view: {
            type: 'string',
            name: 'View',
          },
          format: {
            type: 'string',
            name: 'Template Format',
          },
        },
      },
    },
  },
};

export default TemplateListSchema;