import { Scale } from '../../../models';
import { max } from 'moment';

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
    min(scale) {
      if (scale.entries.length > 0) {
        return scale.entries[0].rating;
      }
      return 0;
    },
    max(scale) {
      if (scale.entries.length > 0) {
        return scale.entries[scale.entries.length - 1].rating;
      }
      return 5;
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
