const GridUISchemaResolver: Reactory.Schema.TServerUISchemaResolver = async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.IFormUISchema> => { 
  const uiSchema: Reactory.Schema.IFormUISchema = {
    "ui:field": "GridLayout",
    "ui:grid-layout": [
      { 
        title: { sm: 12, md: 6, lg: 4 , xl: 3 },
        status: { sm: 12, md: 6, lg: 4, xl: 3 },
        description: { sm: 12, md: 12, lg: 12, xl: 12 },
        createdAt: { sm: 12, md: 6, lg: 4, xl: 3 },
        createdBy: { sm: 12, md: 6, lg: 4, xl: 3 },
        comments: { sm: 12, md: 6, lg: 4, xl: 3 }
      },
    ],
  };
  return uiSchema;
}

export default GridUISchemaResolver;