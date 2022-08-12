export default async (form: Reactory.Forms.IReactoryForm, args: any, context: Reactory.Server.IReactoryContext, info: any): Promise<Reactory.Schema.AnySchema> => {
  
  const { il8n, user } = context;

  const $schema: Reactory.Schema.ISchema = {
    type: "object",
    //title: il8n.translate("reactory.my-applications.title", null),
    title: `${user.firstName}'s applications`,
    properties: {
      message: {
        type: "string",
        title: "",
      },
      applications: {
        type: "array",
        title: "Applications",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              title: "ID"
            },
            avatar: {
              type: "string",
              title: "Avatar"
            },
            title: {
              type: "string",
              title: "Application Title"
            },
            url: {
              type: "string",
              title: "Application URL",
            },
            isAdmin: {
              type: "boolean",
              title: "User is admin",
              readonly: true
            },
            userCount: {
              type: "number",
              title: "Active Number of Users"
            },
          }
        }
      }
    }
  }

  return $schema;
};