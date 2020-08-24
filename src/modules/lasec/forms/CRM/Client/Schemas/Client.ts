import { Reactory } from '@reactory/server-core/types/reactory';

const ClientSchema: Reactory.ISchema = {
  type: "object",
  properties: {
    view: {
      title: '',
      type: 'string'
    },
    id: {
      type: "string",
      title: "Client Id"
    },
    salesTeam: {
      type: "string",
      title: "Sales Team"
    },
    clientStatus: {
      type: "string",
      title: "Client Status"
    },
    clientTitle: {
      type: "string",
      title: "Client Title",
      minLength: 1,
    },
    firstName: {
      type: "string",
      title: "Firstname",
      minLength: 2
    },
    lastName: {
      type: "string",
      title: "Lastname",
      minLength: 2
    },
    fullName: {
      type: "string",
      title: "Client Name"
    },
    customer: {
      type: "string",
      title: "Customer"
    },
    accountNumber: {
      type: "string",
      title: "Account Number"
    },
    accountType: {
      type: "string",
      title: "Account Type"
    },
    customerStatus: {
      type: "string",
      title: "Customer Status",
    },
    country: {
      type: "string",
      title: "Country"
    },
    repCode: {
      type: "string",
      title: "Rep Code"
    },
    isNameDuplicate: {
      type: "boolean",
      title: "Duplicate Name"
    },
    isEmailDuplicate: {
      type: "boolean",
      title: "Duplicate Email"
    },
  }
};

export default ClientSchema;
