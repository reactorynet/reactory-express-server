import { ObjectId } from 'mongodb';
import co from 'co';
import moment from 'moment';
import lodash, { isNil, find } from 'lodash';
import Admin from '../../../application/admin';
import {
  Organization,
  EmailQueue,
  User,
  Survey,
  Assessment,
  LeadershipBrand,
  Organigram,
  Task,
  ReactoryClient,
  BusinessUnit,
} from '../../index';
import { organigramEmails } from '../../../emails';
import ApiError, { RecordNotFoundError } from '../../../exceptions';
import AuthConfig from '../../../authentication';
import logger from '../../../logging';
import iz from '../../../utils/validators';
import TaskModel from '../../schema/Task';

const uuid = require('uuid');

const userAssessments = async (id) => {
  const { user } = global;
  const findUser = isNil(id) === true ? await User.findById(id).then() : user;
  if (findUser && findUser._id) {
    return Assessment.find({ assessor: findUser._id })
      .populate('assessor')
      .populate('delegate')
      .populate('survey')
      .then();
  }
  throw new RecordNotFoundError('No user matching id');
};


const userResolvers = {
  Task: {
    id(task) {
      return task._id;
    },
    description(task) {
      return task.description || 'not set';
    },
    user(task) {
      return User.findById(task.user);
    },
    comments() {
      return [];
    },
    dueDate: task => task.dueDate || null,
    startDate: task => task.startDate || null,
    createdAt(task) {
      return task.createdAt || moment().valueOf();
    },
    updatedAt(task) {
      return task.updatedAt || moment().valueOf();
    },
  },
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
  SurveyReportForUser: {
    overall(sr) {
      return 0;
    },
    status(sr) {
      return 'READY';
    },
    survey(sr) {
      return sr.survey;
    },
    user(sr) {
      return sr.user;
    },
    assessments(sr) {
      return sr.assessments || [];
    },
    tasks(sr) {
      return sr.tasks || [];
    },
    comments(sr) {
      return sr.comments || [];
    },
  },
  Rating: {
    id(obj) {
      return obj._id || null;
    },
    async quality(rating) {
      const lb = await LeadershipBrand.findOne({ 'qualities._id': ObjectId(rating.qualityId) }).then();
      if (lb) {
        return lb.qualities.id(rating.qualityId);
      }

      return null;
    },
    async behaviour(rating) {
      if (rating.custom === true && lodash.isNil(rating.behaviourId)) {
        return {
          id: ObjectId(),
          title: rating.behaviourText,
          ordinal: 99,
        };
      }

      const lb = await LeadershipBrand.findOne({ 'qualities._id': ObjectId(rating.qualityId) }).then();
      if (lb) {
        return lb.qualities.id(rating.qualityId).behaviours.id(rating.behaviourId);
      }

      return null;
    },
    rating(rating) {
      return rating.rating || 0;
    },
    comment(rating) {
      return rating.comment || '';
    },
  },
  Assessment: {
    id(o) {
      return o._id || null;
    },
    assessor(o) {
      if (o.assessor && o.assessor._id) return o.assessor;
      return User.findById(o.assessor);
    },
    delegate(o) {
      if (o.delegate && o.delegate._id) return o.delegate;
      return User.findById(o.delegate);
    },
    survey(o) {
      if (o.survey && o.survey._id) return o.survey;
      return Survey.findById(o.survey);
    },
    assessmentType(o) {
      return o.assessmentType || 'CUSTOM';
    },
    complete(o) {
      return o.complete === true;
    },
    selfAssessment(o) {
      return o.assessor === o.delegate;
    },
    async overdue(obj) {
      if (obj.complete === true) return false;
      const { survey } = obj;
      const now = moment();
      let end = null;
      let status = 'open';
      if (survey._id && survey.endDate && survey.status) {
        end = moment(survey.endDate);
        status = survey.status; //eslint-disable-line
      } else {
        const loaded = await Survey.findById(obj.survey).select('endDate status').then();
        end = moment(loaded.endDate);
        status = loaded.status; //eslint-disable-line
      }
      if (status === 'closed') return false;
      return now.isAfter(end) === true;
    },
    ratings(assessment) {
      return assessment.ratings;
    },
  },
  UserPeers: {
    id(obj) {
      return obj.id ? obj.id.toString() : '';
    },
    allowEdit(obj) {
      return obj.allowEdit === true;
    },
    async peers(obj) {
      // const peers = [];
      return obj.peers.map((peer) => {
        return {
          user: Admin.User.userWithId(peer.user),
          relationship: peer.relationship || 'PEER',
          isInternal: peer.isInternal === true,
          inviteSent: peer.inviteSent === true,
          confirmed: peer.confirmed === true,
          confirmedAt: peer.confirmedAt || null,
        };
      });
    },
    organization(obj) {
      return Admin.Organization.findById(obj.organization);
    },
    user(o) { return Admin.User.userWithId(o.user); },
  },
  User: {
    id(obj) {
      return obj._id;
    },
    username(obj) {
      return obj.username;
    },
    peers(usr) {
      return Organigram.findOne({ user: usr._id, organization: usr.memberships[0].organizationId });
    },
  },
  UserMembership: {
    client({ clientId }) {
      return ReactoryClient.findById(clientId);
    },
    organization({ organizationId }) {
      return Organization.findById(organizationId);
    },
    businessUnit({ businessUnitId }) {
      return BusinessUnit.findById(businessUnitId);
    },
  },
  Query: {
    allUsers(obj, args, context, info) {
      return Admin.User.listAll().then();
    },
    userWithId(obj, args, context, info) {
      return Admin.User.User.findById(args.id).then();
    },
    async userPeers(obj, { id, organizationId }) {
      const user = await User.findById(id).then();
      const organization = await Organization.findById(organizationId).then();
      const orgId = organization._id ? organization._id : user.memberships[0].organizationId;
      return Organigram.findOne({ user: user._id, organization: orgId }).then();
    },
    authenticatedUser(obj, args, context, info) {
      return global.user;
    },
    userInbox(obj, { id, sort }, context, info) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        if (isNil(user)) reject(new ApiError('Not Authorized'));
        const userId = isNil(id) ? user._id : ObjectId(id);
        logger.info(`Finding emails for userId ${userId}`);
        EmailQueue.find({ user: userId }).then((results) => {
          logger.info(`Found ${results.length} emails`, results);
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
    userSurveys(obj, { id, sort }, context, info) {
      logger.info(`Finding surveys for user ${id}, ${sort}`);
      return userAssessments(id);
    },
    userReports(obj, { id, sort }, context, info) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        Admin.User.surveysForUser(id).then((userSurveys) => {
          if (userSurveys && userSurveys.length === 0) resolve([]);
          const surveyReports = [];
          const promises = userSurveys.map((userSurvey) => {
            const resolveData = co.wrap(function* resolveDataGenerator(userId, survey) {
              const assessments = yield Admin.User.assessmentForUserInSurvey(userId, survey._id).then();
              const tasks = yield Admin.User.tasksForUserRelatedToSurvey(userId, survey._id).then();
              return {
                overall: 0,
                status: 'READY',
                user,
                survey: userSurvey,
                assessments,
                tasks,
                comments: [],
              };
            });
            return resolveData(id, userSurvey);
          });

          Promise.all(promises).then((results) => {
            resolve(results);
          }).catch((e) => {
            reject(e);
          });
        });
      });
    },
    reportDetailForUser(object, { userId, surveyId }, context, info) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        Admin.User.surveyForUser(userId || user._id.toString(), surveyId).then((surveyResult) => {
          logger.info('Found surveyResult', surveyResult);
          if (isNil(surveyResult) === true) return resolve(null);

          co.wrap(function* resolveDataGenerator(uId, survey) {
            logger.info(`Fetching Details For Assessment: ${userId} => Survey: ${survey._id}`);
            const assessments = yield Admin.User.assessmentForUserInSurvey(uId, survey._id).then();
            const tasks = yield Admin.User.tasksForUserRelatedToSurvey(uId, survey._id).then();
            resolve({
              overall: 0,
              status: 'READY',
              user,
              survey: surveyResult,
              assessments,
              tasks,
              comments: [],
            });
          })(userId, surveyResult).then((result) => {
            resolve(result);
          }).catch((e) => {
            reject(e);
          });
        }).catch((e) => {
          console.error('Error resolving report detail', e);
          reject(e);
        });
      });
    },
    async assessmentWithId(obj, { id }, context, info) {
      logger.info('Finding Assessment with Id', { id });
      return Assessment.findById(id)
        .populate('survey')
        .populate('delegate')
        .populate('assessor')
        .then();
    },
    userTasks(obj, { id, status }) {
      return Task.find({ user: ObjectId(id || global.user._id), status }).then();
    },
    taskDetail(parent, { id }) {
      logger.info(`Finding Task For Id ${id}`);
      return Task.findById(id).then();
    },
    async searchUser(parent, { searchString, sort = 'email' }) {
      return User.find({ email: `/${searchString}/i` }).sort(`-${sort}`).then();
    },
  },
  Mutation: {
    createUser: async (obj, { input, organizationId, password }, context, info) => {
      logger.info(`Create user mutation called ${input.email}`);
      if (isNil(organizationId) === false && isNil(input) === false) {
        const organization = await Organization.findById(organizationId);
        const createResult = await Admin.User.createUserForOrganization(input, password || 'Password123!', organization).then();
        return createResult.user;
      }
      throw new Error('Organization Id is required');
    },
    setOrganizationForUser: async (obj, { id, organizationId }) => {
      const user = await User.findById(id);
      const organization = await Organization.findById(organizationId);
      user.organization = organization;
      await user.save();

      return true;
    },
    updateUser(obj, { id, profileData }) {
      logger.info('Update user mutation called', { id, profileData });
      return Admin.User.updateProfile(id, profileData);
    },
    setPassword(obj, { input: { password, confirmPassword, authToken } }) {
      return new Promise((resolve, reject) => {
        const { user } = global;
        if (typeof password !== 'string') reject(new ApiError('password expects string input'));
        if (password === confirmPassword && user) {
          logger.info(`Setting user password ${user.email}, ${authToken}`);
          user.setPassword(password);
          user.save().then(updateUser => resolve(updateUser));
        } else {
          reject(new ApiError('Passwords do not match'));
        }
      });
    },
    createTask(obj, { id, taskInput }) {
      const { _id } = global.user;
      return co.wrap(function* createTaskGenerator(userId, task) {
        const created = yield new Task({
          ...task,
          user: ObjectId(userId),
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
        }).save().then();
        return created;
      })(id || _id.toString(), taskInput);
    },
    async confirmPeers(obj, { id, organization }) {
      const userOrganigram = await Organigram.findOne({
        user: ObjectId(id),
        organization: ObjectId(organization),
      })
        .populate('user')
        .populate('organization')
        .populate('peers.user')
        .then();

      if (lodash.isNil(userOrganigram) === true) throw new RecordNotFoundError('User Organigram Record Not Found');

      userOrganigram.confirmedAt = new Date().valueOf();
      userOrganigram.updatedAt = new Date().valueOf();

      const emailPromises = [];
      for (let peerIndex = 0; peerIndex < userOrganigram.peers.length; peerIndex += 1) {
        logger.info(`Sending peer notification to ${userOrganigram.peers[peerIndex].user.firstName}`);
        if (userOrganigram.peers[peerIndex].inviteSent !== true) {
          const { user } = userOrganigram;
          emailPromises.push(organigramEmails.confirmedAsPeer(
            userOrganigram.peers[peerIndex].user,
            user,
            userOrganigram.peers[peerIndex].relationship,
            userOrganigram.organization,
          ));
        }
      }

      logger.info(`Created ${emailPromises.length} promises to send invite peer confirmation emails`);
      try {
        if (emailPromises.length > 0) await Promise.all(emailPromises).then();
      } catch (emailError) {
        logger.error(`Error processing email promises ${emailError.message}`, emailError);
      }
      await userOrganigram.save().then();
      return Organigram.findById(userOrganigram._id);
    },
    async removePeer(obj, { id, peer, organization }) {
      const userOrganigram = await Organigram.findOne({
        user: ObjectId(id),
        organization: ObjectId(organization),
      }).then();

      let modified = false;
      if (userOrganigram) {
        userOrganigram.peers.forEach((peerEntry) => {
          logger.info(`Checking peer ${peerEntry.user} => ${peer}: match: ${peerEntry.user.toString() === peer}`);
          if (peerEntry.user.toString() === peer) {
            logger.info('Matched, deleting peerEntry');
            peerEntry.remove();
            modified = true;
          }
        });

        if (modified === true) {
          userOrganigram.confirmedAt = null;
          await userOrganigram.save().then();
        }

        return userOrganigram;
      }

      return null;
    },
    async setPeerRelationShip(obj, {
      id, peer, organization, relationship,
    }) {
      let userOrganigram = await Organigram.findOne({
        user: ObjectId(id),
        organization: ObjectId(organization),
      }).then();

      if (userOrganigram === null) {
        logger.info('User Organigram Not Found');
        userOrganigram = new Organigram({
          user: ObjectId(id),
          organization: ObjectId(organization),
          peers: [],
          confirmedAt: null,
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
        });
      } else {
        logger.info('User Organigram Found', userOrganigram);
        userOrganigram.updatedAt = new Date().valueOf();
      }

      let updated = false;
      userOrganigram.peers.forEach((p) => {
        if (p.user.toString() === peer) {
          logger.info('Matching peer found, updating relationship status', relationship);
          p.relationship = relationship;
          updated = true;
          userOrganigram.confirmedAt = null;
        }
      });

      if (updated === false) {
        userOrganigram.peers.push({
          user: ObjectId(peer),
          relationship,
          isInternal: true,
          inviteSent: false,
          confirmed: false,
        });

        userOrganigram.confirmedAt = null;
      }

      await userOrganigram.save().then();

      return userOrganigram;
    },
  },
};

module.exports = userResolvers;
