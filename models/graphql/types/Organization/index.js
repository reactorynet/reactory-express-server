import { ObjectId } from 'mongodb';
import moment from 'moment';
import { Users } from '../../../../database/legacy';

const organizationResolver = {
  Tennant: {

  },
  Organization: {
    id(obj, args, context, info) {
      return obj.id;
    },
    username(obj, args, context, info) {
      return obj.username;
    },
  },
  Query: {
    allOrganizations: () => {

    },
  },
  Mutation: {
    createUser(obj, arg, context, info) {
      console.log('Create user mutation called', {obj, arg, context, info});
      const created = { id: ObjectId(), ...arg.input, createdAt: moment() };
      data.push(created);
      return created;
    },
  },
};

// module.exports = userResolvers;
