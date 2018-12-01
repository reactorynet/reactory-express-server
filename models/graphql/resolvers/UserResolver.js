import { ObjectId } from 'mongodb';
import co from 'co';
import moment from 'moment';
import { isNil, find } from 'lodash';
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
} from '../../index';
import ApiError from '../../../exceptions';
import AuthConfig from '../../../authentication';
import logger from '../../../logging';
import TaskModel from '../../schema/Task';

const userAssessments = (id, view = 'assessment') => {
  return new Promise((resolve, reject) => {
    const { user } = global;
    let findUser = user;
    const getAssessments = () => {
      Assessment.find({ assessor: findUser._id }).then((assessments) => {
        resolve(assessments);
      }).catch(e => reject(e));
    };

    if (isNil(id) === false) {
      findUser = Admin.User.userWithId(id).then((usr) => {
        findUser = usr;
        getAssessments();
      }).catch((e) => {
        getAssessments();
      });
    }
  });
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
  Assessment: {
    id(o) {
      return o._id || null;
    },
    assessor(o) {
      return User.findById(o.assessor);
    },
    delegate(o) {
      return User.findById(o.delegate);
    },
    survey(o) {
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
    ratings(o) {
      return co.wrap(function* ratingsResolver(assessment) {
        try {
          const survey = yield Survey.findById(assessment.survey).then();
          if (survey && survey.leadershipBrand) {
            const leadershipBrand = yield LeadershipBrand.findById(survey.leadershipBrand).then();
            const ratings = [];
            let ratingIndex = 0;
            for (ratingIndex; ratingIndex <= assessment.ratings.length - 1; ratingIndex += 1) {
              const rating = assessment.ratings[ratingIndex];
              const quality = find(leadershipBrand.qualities, { id: rating.qualityId.toString() });
              const ratingObj = {
                id: rating._id, //eslint-disable-line
                quality,
                behaviour: find(quality.behaviours, { id: rating.behaviourId.toString() }),
                ordinal: rating.ordinal,
                rating: rating.rating,
                comment: rating.comment,
              };

              ratingObj.ordinal = ratingObj.behaviour.ordinal;

              ratings.push(ratingObj);
            }
            return ratings;
          }
        } catch (resolveError) {
          console.error(resolveError);
          return [];
        }
      })(o);
    },
  },
  UserPeers: {
    allowEdit(obj) {
      return obj.allowEdit === true;
    },
    peers(obj) {
      debugger //eslint-disable-line
      logger.info('Getting peers for user', obj);
      return new Promise((resolve, reject) => {
        let peers = [];
        peers = obj.peers.map((peer) => {
          return {
            user: Admin.User.userWithId(peer.user),
            relationship: peer.relationship,
            isInternal: true,
          };
        });
        resolve(peers);
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
  Query: {
    allUsers(obj, args, context, info) {
      return Admin.User.listAll().then();
    },
    userWithId(obj, args, context, info) {
      return Admin.User.User.findById(args.id).then();
    },
    authenticatedUser(obj, args, context, info) {
      // logger.info('Authenticated user query', { obj, args, context, info });
      // return Admin.User.User.findOne({ email: 'werner.weber@gmail.com' }).then();
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
    assessmentWithId(obj, { id }, context, info) {
      logger.info('Finding Assessment with Id', { id });
      return new Promise((resolve, reject) => {
        const findWrapper = co.wrap(function* assessmentWithIdGenerator(assessmentId) {
          const assessment = yield Assessment.findById(assessmentId).then();
          return assessment;
        });

        resolve(findWrapper(id));
      });
    },
    userTasks(obj, { id, status }) {
      return Task.find({ user: ObjectId(id || global.user._id), status }).then();
    },
    taskDetail(parent, { id }) {
      logger.info(`Finding Task For Id ${id}`);
      return Task.findById(id).then();
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
  },
};

module.exports = userResolvers;
