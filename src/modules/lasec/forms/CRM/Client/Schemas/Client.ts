import { Reactory } from '@reactory/server-core/types/reactory';

const ClientSchema: Reactory.ISchema = {
  type: "object",  
  properties: {
    id: {
      type: "string",
      title: "Client Id"
    },
    clientStatus: {
      type: "string",
      title: "Client Status"
    },
    firstName: {
      type: "string",
      title: "Firstname"
    },
    lastName: {
      type: "string",
      title: "Lastname"
    },
    fullName: {
      type: "string",
      title: "Client Name"
    },
    emailAddress: {
      type: "string",
      title: "Email Address"
    },
    customer: {
      type: "string",
      title: "Customer"
    },
    accountNumber: {
      type: "string",
      title: "Account Number"
    },
    customerStatus: {
      type: "string",
      title: "Customer Status",      
    },
    country: {
      type: "string",
      title: "Country"
    }
  }
};

export default ClientSchema;