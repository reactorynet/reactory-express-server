export default async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
  
  const { i18n, user } = context;
  
  const $schema: Reactory.Schema.ISchema = {
    type: "object",
    title: i18n.t("forms:reactory.applications.title"),
    properties: {
      applications: {
        type: "array",
        title: i18n.t("forms:reactory.applications.available"),
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              title: "ID",
              readonly: true,
            },
            avatar: {
              type: "string",
              title: "Avatar"
            },
            title: {
              type: "string",
              title: i18n.t("forms:reactory.applications.properties.title", { defaultValue: "Application Title" })
            },
            url: {
              type: "string",
              title: i18n.t("forms:reactory.applications.properties.url", { defaultValue: "Application Url" }),
            },
            isAdmin: {
              type: "boolean",
              title: i18n.t("forms:reactory.applications.properties.isAdmin", { defaultValue: "Application Url" }),
              readonly: true
            },          
          }
        }
      }
    }
  }

  return $schema;
}