import { ObjectId } from 'mongodb';
import moment from 'moment';
import { isNil } from 'lodash';
import Admin from '../../../application/admin';

const userResolvers = {
  User: {
    id(obj, args, context, info) {
      return obj._id;
    },
    username(obj, args, context, info) {
      return obj.username;
    },
    businessUnit(obj, args, context, info) {
      // debugger; //eslint-disable-line
      console.log('resolving business unit', { args, context, info, obj });      
      if (obj.memberships) {
        return obj.memberships[0].businessUnit || 'NOT SET';
      }
      return 'NO MEMBERSHIPS';
    },
  },
  Query: {
    allUsers(obj, args, context, info) {
      return Admin.User.listAll().then();
    },
    userWithId(obj, args, context, info) {
      return Admin.User.User.findById(args.id).then()
    },
    authenticatedUser(obj, args, context, info) {
      //console.log('Authenticated user query', { obj, args, context, info });
      return Admin.User.User.findOne({ email: 'werner.weber@gmail.com' }).then();
    },
  },
  Mutation: {
    createUser(obj, arg, context, info) {      
      const { input, organizationId, password } = arg;
      const user = {
        ...input,
        id: ObjectId(),
        providerId: input.providerId || 'LOCAL',
        createdAt: moment().valueOf(),
        updatedAt: moment().valueOf(),
      };
      console.log(`Create user mutation called ${input.email}`);
      if (isNil(organizationId) === false && isNil(input) === false) {
        return new Promise((resolve, reject) => {
          Admin.Organization.findById(organizationId).then((organization) => {            
            const createResult = Admin.User.createUserForOrganization(user, password || 'Password123!', organization);
            resolve(createResult.user);
          }).catch((organizationError) => {
            reject(organizationError);
          });
        });
      }
      throw new Error('Organization Id is required');
    },
  },
};

module.exports = userResolvers;
