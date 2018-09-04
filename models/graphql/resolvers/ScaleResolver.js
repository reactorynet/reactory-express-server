import { Scale } from '../../../models';

export default {
  Scale: {
    id(scale) {
      return scale._id; //eslint-disable-line
    },
    key(scale) {
      return scale.key;
    },
    title(scale) {
      return scale.title;
    },
    entries(scale) {
      return scale.entries;
    },
  },
  Query: {
    
  },
  Mutation: {

  },
};
