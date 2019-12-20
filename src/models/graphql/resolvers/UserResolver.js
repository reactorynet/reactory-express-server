import { ObjectId } from 'mongodb';
import co from 'co';
import moment from 'moment';
import lodash, { isNil, find } from 'lodash';
import om from 'object-mapper';
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
import O365 from '../../../azure/graph';

import { organigramEmails } from '../../../emails';
import ApiError, { RecordNotFoundError } from '../../../exceptions';
import AuthConfig from '../../../authentication';
import logger from '../../../logging';
import iz from '../../../utils/validators';
import TaskModel from '../../schema/Task';
import { isObject, isNull } from 'util';

const uuid = require('uuid');

const userAssessments = async (id) => {
  const { user, partner } = global;
  const findUser = isNil(id) === true ? await User.findById(id).then() : user;
  if (findUser && findUser._id) {
    logger.info(`Fetching assessments for user ${user.firstName} [${user.email}] - for partner key: ${partner.key}`);
    const assessmentTypes = ['custom'];
    if (partner.key === 'plc') {
      assessmentTypes.push('plc');
    } else {
      assessmentTypes.push('180');
      assessmentTypes.push('360');
    }

    const assessments = await Assessment.find({ assessor: findUser._id, deleted: false })
      .populate('assessor')
      .populate('delegate')
      .populate('survey')
      .then();

    if (lodash.isArray(assessments) === true) {
      return lodash.filter(assessments, (assessment) => {
        return lodash.intersection(assessmentTypes, [assessment.survey.surveyType]).length > 0;
      });
    }

    return [];
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
      if (email.id) return email.id;
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
    selfAssessment(assessment) {
      const { assessor, delegate } = assessment;

      if (ObjectId.isValid(assessor) === true && ObjectId.isValid(delegate) === true) {
        return ObjectId(assessor).equals(ObjectId(delegate));
      }

      if (isObject(assessor) === true && assessor._id && isObject(delegate) === true && delegate._id) {
        return assessor._id.equals(delegate._id);
      }

      return assessor === delegate;
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
    fullName(user) {
      if (!user) return 'null-user';
      if (typeof user.fullName === 'function') return user.fullName();

      return `${user.firstName} ${user.lastName}`;
    },
    fullNameWithEmail(user) {
      const { firstName, lastName, email } = user;
      return `${firstName} ${lastName}<${email}>`;
    },
    username(obj) {
      return obj.username;
    },
    peers(usr) {
      return Organigram.findOne({ user: usr._id, organization: usr.memberships[0].organizationId });
    },
    memberships(usr) {
      if (lodash.isArray(usr.memberships)) {
        return lodash.filter(usr.memberships, { clientId: global.partner._id });
      }

      return [];
    },
    deleted(user) {
      return user.deleted || false;
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
    async userWithId(obj, { id }, context, info) {
      const user = await User.findById(id).then();

      return user;
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
    async userInbox(obj, { id, sort, via = 'local' }, context, info) {
      const { user } = global;
      if (isNil(user) === true) throw new ApiError('Not Authorized');
      const userId = isNil(id) ? user._id : ObjectId(id);
      logger.info(`Finding emails for userId ${userId} via ${via}`);

      switch (via) {
        case 'microsoft': {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            logger.debug(found);
            if (found) {
              logger.debug('Found Authentication Info For MS', { token: found.props.accessToken });
              const emails = await O365.getEmails(found.props.accessToken);
              logger.debug('Received Email Payload', emails);
              const mailmaps = om(emails, {
                'value[].id': 'emails[].id',
                'value[].body.contentType': 'emails[].format',
                'value[].body.content': 'emails[].message',
                'value[].sender.emailAddress.address': 'emails[].from',
                'value[].sentDateTime': 'emails[].sentAt',
                'value[].receivedDateTime': [
                  'emails[].receivedAt',
                  'emails[].createdAt',
                ],
                'value[].subject': 'emails[].subject',
                'value[].isRead': 'emails[].isRead',
              });

              logger.debug('Found mails', mailmaps);
              return mailmaps.emails;
            }
            throw new ApiError('User has not authenticated with microsoft');
          } else {
            throw new ApiError('User has not authenticated via microsoft');
          }
        }
        default: {
          return EmailQueue.find({ user: userId }).then();
        }
      }
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
    async reportDetailForUser(object, { userId, surveyId }, context, info) {
      const { user } = global;
      const reportResult = {
        overall: 0,
        status: 'BUSY',
        user,
        survey: null,
        assessments: [],
        tasks: [],
        comments: [],
        errors: null,
      };

      let _user = user;
      if (userId && ObjectId.isValid(userId) === true) _user = await User.findById(userId).then();
      if (_user === null) {
        throw new RecordNotFoundError(`The user id ${userId} not found`);
      }

      try {
        const survey = await Admin.User.surveyForUser(userId || user._id.toString(), surveyId).then();
        reportResult.survey = survey;

        logger.info('Found surveyResult', survey);
        if (isNil(survey) === true) throw new RecordNotFoundError('Could not locate the survey and delegate match');

        logger.info(`Fetching Details For Assessment: ${userId} => Survey: ${survey._id}`);

        reportResult.assessments = await Admin.User.assessmentForUserInSurvey(_user._id, survey._id).then();
        reportResult.tasks = await Admin.User.tasksForUserRelatedToSurvey(_user._id, survey._id).then();
      } catch (reportGenerateError) {
        logger.error(`Could not generate a report due to an error ${reportGenerateError.message}`, reportGenerateError);
      }

      return reportResult;
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
    async getUserCredentials(parent, { provider }) {
      logger.info(`Getting user credentials for ${global.user.fullName(true)}`);
      if (global.user) {
        return global.user.getAuthentication(provider);
      }
      return null;
    },
  },
  Mutation: {
    createUser: async (obj, { input, organizationId, password }, context, info) => {
      logger.info(`Create user mutation called ${input.email}`);
      const existing = await User.findOne({ email: input.email }).then();
      logger.info(`Checked user with email address ${input.email} result: ${isNil(existing) === false ? `Found [${existing._id.toString()}]` : 'Not Found'}`);

      if (isNil(existing) === false) return existing;

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
        let mustSend = userOrganigram.peers[peerIndex].inviteSent !== true;

        if (mustSend === false && userOrganigram.peers[peerIndex].confirmed === true) {
          const whenConfirmed = moment(userOrganigram.peers[peerIndex].confirmedAt);
          if (moment.isMoment(whenConfirmed) === true) {
            mustSend = Math.abs(moment().diff(whenConfirmed, 'day', true)) >= 30;
          }
        }

        if (mustSend === true) {
          const { user } = userOrganigram;
          emailPromises.push(organigramEmails.confirmedAsPeer(
            userOrganigram.peers[peerIndex].user,
            user,
            userOrganigram.peers[peerIndex].relationship,
            userOrganigram.organization,
            userOrganigram,
            peerIndex,
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

      // ignore the operation if the peer and id is the same, we
      // cannot have a user be their own peer
      if (ObjectId(id).equals(ObjectId(peer))) {
        return userOrganigram;
      }

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
    async removeUserRole(obj, {
      id, email, organization, role, clientId,
    }) {
      const { user, partner } = global;
      let clientToUse = partner; // use the default partner
      let userToUpdate = null;

      if (lodash.isNil(email) === false) {
        userToUpdate = await User.findOne({ email }).then();
        if (lodash.isNil(userToUpdate) === true) throw new RecordNotFoundError(`User not found ${email}`);
      } else {
        if (ObjectId.isValid(id) === false) throw new ApiError('Invalid id');
        userToUpdate = await User.findOne({ _id: ObjectId(id) }.then());
        if (lodash.isNil(userToUpdate) === true) throw new RecordNotFoundError(`User not found ${id}`);
      }


      if (lodash.isNil(organization) === false && ObjectId.isValid(organization) === false) throw new ApiError('Invalid organization id - accepts null or valid id');
      if (lodash.isNil(clientId) === false && ObjectId.isValid(clientId) === false) throw new ApiError('Invalid clientId id - accepts null or valid id');

      // Check if we have a valid client
      if (ObjectId.isValid(clientId) && ObjectId(clientId).equals(clientToUse._id) === false) {
        clientToUse = await ReactoryClient.findById(clientId).then();
      }

      // Check if the logged in user has permissions
      if (user.hasRole(clientToUse._id, 'ADMIN', null, null) === false) {
        throw new ApiError('Incorrect Permissions, you do not have permission to perform this function');
      }

      if (userToUpdate.hasRole(clientToUse._id, role, organization, null) === true) {
        await userToUpdate.removeRole(clientToUse._id, role, organization, null);
      }

      return userToUpdate.memberships;
    },
    async addUserRole(obj, {
      id, email, organization, role, clientId,
    }) {
      const { user, partner } = global;
      logger.info(`Adding role => EMAIL: ${email}  ROLE: ${role} ORG: ${organization} CLIENT: ${clientId}`);
      let clientToUse = partner; // use the default partner
      let userToUpdate = null;

      if (lodash.isNil(email) === false) {
        userToUpdate = await User.findOne({ email }).then();
        if (lodash.isNil(userToUpdate) === true) throw new RecordNotFoundError(`User not found ${email}`);
      } else {
        if (ObjectId.isValid(id) === false) throw new ApiError('Invalid id');
        userToUpdate = await User.findOne({ _id: ObjectId(id) }.then());
        if (lodash.isNil(userToUpdate) === true) throw new RecordNotFoundError(`User not found ${id}`);
      }


      if (lodash.isNil(organization) === false && ObjectId.isValid(organization) === false) throw new ApiError('Invalid organization id - accepts null or valid id');
      if (lodash.isNil(clientId) === false && ObjectId.isValid(clientId) === false) throw new ApiError('Invalid clientId id - accepts null or valid id');

      // Check if we have a valid client
      if (ObjectId.isValid(clientId) && ObjectId(clientId).equals(clientToUse._id) === false) {
        clientToUse = await ReactoryClient.findById(clientId).then();
      }

      // Check if the logged in user has permissions
      logger.info(`Checking calling user permissions ${user.fullName()}`, { memberships: user.memberships });
      if (user.hasRole(clientToUse._id, 'ADMIN', null, null) === false) {
        logger.info(`Authenticated user is: ${user.fullName()}`, user);
        throw new ApiError(`Incorrect Permissions, you do not have permission to perform this function ${user.fullName()}`);
      }


      logger.info(`Adding role ${role} to ${userToUpdate.fullName()} does not have role, adding`);
      await userToUpdate.addRole(clientToUse._id, role, organization, null);


      return userToUpdate.memberships;
    },
    async deleteUser(parent, { id }) {
      const user = await User.findById(id).then();
      if (isNil(user) === true) throw new RecordNotFoundError(`Could not locate the user with the id ${id}`);
      user.deleted = true;
      await user.save().then();
      return true;
    },
    async addUserCredentials(parent, {
      provider, props,
    }) {
      return global.user.setAuthentication({
        provider,
        props,
        lastLogin: new Date().valueOf(),
      });
    },
    async removeUserCredentials(parent, { provider }) {
      if (global.user) {
        await global.user.removeAuthentication(provider);
        return true;
      }
      return false;
    },
    async sendMail(parent, { message }) {
      const { id, via, subject, contentType, content, recipients, ccRecipients, saveToSentItems } = message;
      const { user } = global;
      if (isNil(user) === true) throw new ApiError('Not Authorized');
      const userId = isNil(id) ? user._id : ObjectId(id);
      logger.info(`USER ID ${userId} via ${via}`);
      switch (via) {
        case 'microsoft': {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            logger.debug(`EMAIL USER FOUND: ${found}`);
            if (found) {
              logger.debug('Found Authentication Info For MS', { token: found.props.accessToken });
              const result = await O365.sendEmail(found.props.accessToken, subject, contentType, content, recipients, ccRecipients, saveToSentItems);

              if (result.statusCode != 400) {
                throw new ApiError(`${result.code}. ${result.message}`);
              }

              return {
                Successful: true,
                Message: 'Your mail was sent successfully.'
              }
            }
            throw new ApiError('User has not authenticated with microsoft');
          } else {
            throw new ApiError('User has not authenticated via microsoft');
          }
        }
        default: {
          throw new ApiError('Not Implemented Yet');
        }
      }
    },
    async createOutlookTask(parent, { task }) {
      const { id, via, subject, startDate, dueDate, timeZone } = task;
      const { user } = global;
      if (isNil(user) === true) throw new ApiError('Not Authorized');
      const userId = isNil(id) ? user._id : ObjectId(id);
      logger.info(`USER ID ${userId} via ${via}`);
      switch (via) {
        case 'microsoft': {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            logger.debug(`EMAIL USER FOUND: ${found}`);
            if (found) {
              logger.debug('Found Authentication Info For MS', { token: found.props.accessToken });
              const result = await O365.createTask(found.props.accessToken, subject, startDate, dueDate, timeZone);

              if (result.statusCode != 400) {
                throw new ApiError(`${result.code}. ${result.message}`);
              }

              return {
                Successful: true,
                Message: 'Your task was created successfully.'
              }
            }
            throw new ApiError('User has not authenticated with microsoft');
          } else {
            throw new ApiError('User has not authenticated via microsoft');
          }
        }
        default: {
          throw new ApiError('Not Implemented Yet');
        }
      }
    }
  },
};

module.exports = userResolvers;
