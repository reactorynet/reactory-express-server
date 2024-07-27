const GridUISchemaResolver: Reactory.Schema.TServerUISchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.IFormUISchema> => { 
  
  const { schema } = form;
  context.debug(`$$$ Schema is of type ${typeof schema}`)
  
  const uiSchema: Reactory.Schema.IFormUISchema = {
    "ui:field": "GridLayout",
    "ui:grid-layout": [
      { 
        request: { sm: 12, md: 12, lg: 6 , xl: 6 },
        status: { sm: 12, md: 12, lg: 6, xl: 6 },
        description: { sm: 12, md: 12, lg: 12, xl: 12 },
        createdAt: { sm: 12, md: 12, lg: 6, xl: 6 },
        createdBy: { sm: 12, md: 12, lg: 6, xl: 6 },
        assignedTo: { sm: 12, md: 12, lg: 6, xl: 6 },
        comments: { sm: 12, md: 12, lg: 6, xl: 6 },
        documents: { sm: 12, md: 12, lg: 6, xl: 6 },
      },
    ],
  };
  return uiSchema;
}

export default GridUISchemaResolver;