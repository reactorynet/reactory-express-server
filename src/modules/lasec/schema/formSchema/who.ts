export { ISchema, IObjectSchema, IArraySchema } from '@reactory/server-core/schema';

const whoSchema: IObjectSchema = {
  type: "object",
  title: "Who",
  properties: {
    id: {
      type: "string",
      title: "Id"
    },
    firstName: {
      type:"string",
      title: "First Name",
    },
    lastName: {
      type: "string",
      title: "Last Name"
    },
    fullName: {
      type: "string",
      title: "Fullname"
    },
    email: {
      type: "string",
      title: "Email",
      format: "email"
    }
  }
};

export default whoSchema;