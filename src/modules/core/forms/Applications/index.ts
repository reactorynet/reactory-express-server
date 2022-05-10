

const Applications: Reactory.Forms.IReactoryForm = {
  id: `reactory/my-applications`,
  nameSpace: 'reactory',
  name: 'MyApplications',
  uiFramework: "material",
  title: "My Applications",
  uiSupport: ["material"],
  registerAsComponent: true,
  version: "1.0.0",
  defaultFormValue: [],
  schema: async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
    
    const $schema: Reactory.Schema.IArraySchema = {
      type: "array",
      title: "My Applications",
      items: {
        type: "object",
        properties: {
          avatar: {
            type: "string",
            title: "Avatar"
          },
          title: {
            type: "string",
            title: "Application Title"
          }
        }
      }
    }
        
    return $schema;
  },

}

export default Applications;