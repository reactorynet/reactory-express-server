import { Reactory } from '@reactory/server-core/types/reactory';
import logger from 'logging';
import { getLoggedIn360User } from 'modules/lasec/resolvers/Helpers';

let is_international = false;

// try {
//   let current_logged_in = await getLoggedIn360User();
//   if (current_logged_in.user_type === "lasec_international") is_international = true;
// } catch (error) {
//   logger.debug("No logged in user available", error);
// }



/**
 * Represents the client schema object.  This references a human with additional
 * organisational attributes and contact details
 */
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
    title: {
      type: "string",
      title: "Client Title",
      minLength: 1,
    },
    titleLabel: {
      type: "string",
      title: "Client Title",
    },
    clientTitle: {
      type: "string",
      title: "Client Title",
      minLength: 1,
    },
    firstName: {
      type: "string",
      title: "First name",
      minLength: 2
    },
    lastName: {
      type: "string",
      title: "Last name",
      minLength: 2
    },
    fullName: {
      type: "string",
      title: "Client Name"
    },
    // customer: {
    //   type: "object",
    //   properties: {
    //     id: {
    //       title: '',
    //       type: 'string'
    //     },
    //     accountNumber: {
    //       title: '',
    //       type: 'string'
    //     },
    //     tradingName: {
    //       title: '',
    //       type: 'string'
    //     },
    //     salesTeam: {
    //       title: '',
    //       type: 'string'
    //     },
    //   }
    // },
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
      title: `Country / Province`
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
