import { ObjectId } from 'mongodb';
import moment from 'moment';
import { isNil } from 'lodash';
import Admin from '../../../application/admin';
import { EmailQueue, User, Survey } from '../../index';
import ApiError from '../../../exceptions';
import AuthConfig from '../../../authentication';

const userResolvers = {
  Email: {
    id(email) {
      if (email._id) return email._id;
      return 'no-id';
    },
    user(obj) {
      try {
        if (obj.user) return User.findById(obj.user);
        return null;
      } catch (findErr) {
        console.error('Error loading user');
        throw findErr;
      }
    },
    survey(obj) {
      try {
        if (obj.survey) return Survey.findById(obj.survey);
        return null;
      } catch (surveyError) {
        console.error('Error loading survey');
        throw surveyError;
      }
    },
  },
  User: {
    id(obj) {
      return obj._id;
    },
    username(obj) {
      return obj.username;
    },
    businessUnit(obj, args, context, info) {
      // debugger; //eslint-disable-line
      console.log('resolving business unit', {
        args, context, info, obj,
      });
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
      return Admin.User.User.findById(args.id).then();
    },
    authenticatedUser(obj, args, context, info) {
      // console.log('Authenticated user query', { obj, args, context, info });
      // return Admin.User.User.findOne({ email: 'werner.weber@gmail.com' }).then();
    },
    userInbox(obj, { id, sort }, context, info) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        if (isNil(user)) reject(new ApiError('Not Authorized'));
        const userId = isNil(id) ? user._id : ObjectId(id);
        console.log(`Finding emails for userId ${userId}`);
        EmailQueue.find({ user: userId }).then((results) => {
          console.log(`Found ${results.length} emails`, results);
          try {
            resolve(results);
          } catch (err) {
            console.error('Error resolving', err);
            reject(err);
          }
        }).catch((findError) => {
          console.error(`Could not find emails for this user ${userId}`);
          reject(findError);
        });
      });
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
    updateUser(obj, { id, profileData }) {
      console.log('Update user mutation called', { id, profileData });
      return Admin.User.updateProfile(id, profileData);
    },
    setPassword(obj, { input: { password, confirmPassword, authToken } }) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        if (typeof password !== 'string') reject(new ApiError('password expects string input'));
        if (password === confirmPassword && user) {
          console.log(`Setting user password ${user.email}, ${authToken}`);
          user.setPassword(password);
          user.save().then(updateUser => resolve(updateUser));
        } else {
          reject(new ApiError('Passwords do not match'));
        }
      });
    },
  },
};

module.exports = userResolvers;
