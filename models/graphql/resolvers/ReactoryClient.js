import { getReactoryClientWithKey } from '../../../application/admin/System.js';

const resolver = {
  Query: {
    clientWithId(obj, arg, context, info) {
      return getReactoryClientWithKey(arg.key);
    },
  },
};


export default resolver;
