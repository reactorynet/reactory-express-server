export default async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
  
  const { i18n, user } = context;

  const applicationSchema: Reactory.Schema.ISchema = {
    type: "object",
    properties: {
      id: {
        type: "string",
        title: "ID",
        readonly: true,
      },
      avatar: {
        type: "string",
        title: "Avatar",
        description: "The avatar or application icon"
      },
      logo: {
        type: "string",
        title: "Logo",
        description: "Logo for your application"
      },
      title: {
        type: "string",
        title: i18n.t("forms:reactory.applications.properties.title", { defaultValue: "Application Title" })
      },
      url: {
        type: "string",
        title: i18n.t("forms:reactory.applications.properties.url", { defaultValue: "Application Url" }),
      }          
    }
  }

  const applicationsArraySchema: Reactory.Schema.IArraySchema = {
    type: "array",
    title: i18n.t("forms:reactory.applications.available"),
    readonly: true,
    items: applicationSchema
  };
  
  const $schema: Reactory.Schema.ISchema = {
    type: "object",
    title: i18n.t("forms:reactory.applications.title"),    
    properties: {
      greeting: {
        type: "string",
        title: "Greeting"
      },
      applications: applicationsArraySchema
    }
  }

  return $schema;
}