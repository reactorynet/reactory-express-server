import { Reactory } from '@reactory/server-core/types/reactory';

const ClientSchema: Reactory.ISchema = {
  type: "object",
  title: "${formData.firstName} ${formData.lastName}",
  properties: {
    clientStatus: {
      type: "string",
      title: "Client Status"
    },
    fullName: {
      type: "string",
      title: "Client Full Name"
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