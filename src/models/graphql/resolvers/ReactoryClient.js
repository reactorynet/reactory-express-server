import { getReactoryClientWithKey } from '../../../application/admin/System.js';

const resolver = {
  ReactoryClient: {
    id({ _id }) {
      return _id.toString();
    },
  },
  Query: {
    clientWithId(obj, arg, context, info) {
      return getReactoryClientWithKey(arg.key);
    },
  },
};


export default resolver;
