export default {
  type: "object",
  title: "Who",
  propeterties: {
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
      title: "Fullname",
      format: "email"
    }
  }
};