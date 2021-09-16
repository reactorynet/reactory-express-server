import { ObjectId } from "mongodb";
import co from "co";
import moment from "moment";
import lodash, { isNil, find } from "lodash";
import om from "object-mapper";
import Admin from "@reactory/server-core/application/admin";
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
} from "@reactory/server-core/models/index";
import O365 from "@reactory/server-modules/reactory-azure/services/graph";
import { launchSurveyForDelegate } from '@reactory/server-modules/mores/services/Survey';
import { Mores } from '@reactory/server-modules/mores/types/mores';
import { organigramEmails } from "@reactory/server-core/emails";
import ApiError, {
  RecordNotFoundError,
} from "@reactory/server-core/exceptions";
import logger from "@reactory/server-core/logging";

import { Reactory } from "@reactory/server-core/types/reactory";

import { SURVEY_EVENTS_TO_TRACK } from "@reactory/server-core/models/index";
import Mongoose from "mongoose";
import { execml } from "@reactory/server-core/graph/client";

const uuid = require("uuid");

const userAssessments = async (id: any, context: Reactory.IReactoryContext) => {
  const { user, partner } = context;
  const findUser = isNil(id) === true ? await User.findById(id).then() : user;
  if (findUser && findUser._id) {
    logger.info(
      `Fetching assessments for user ${user.firstName} [${user.email}] - for partner key: ${partner.key}`
    );
    const assessmentTypes = ["custom"];

    if (partner.key === "plc") {
      assessmentTypes.push("plc");
    } else {
      assessmentTypes.push("180");
      assessmentTypes.push("360");
    }

    const assessments = await Assessment.find({
      assessor: findUser._id,
      deleted: false,
    })
      .populate("assessor")
      .populate("delegate")
      .populate("survey")
      .then();

    if (lodash.isArray(assessments) === true) {
      return lodash.filter(assessments, (assessment) => {
        return (
          lodash.intersection(assessmentTypes, [assessment.survey.surveyType])
            .length > 0
        );
      });
    }

    return [];
  }

  throw new RecordNotFoundError("No user matching id");
};

const MoresAssessmentsForUser = async (
  userId: any,
  status = ["launched"],
  context: Reactory.IReactoryContext
) => {
  const { user, partner } = context;
  const findUser =
    isNil(userId) === true ? await User.findById(userId).then() : user;
  if (findUser && findUser._id) {
    logger.info(
      `Fetching assessments for user ${user.firstName} [${user.email}] - for partner key: ${partner.key}`
    );
    const assessmentTypes = [];

    switch (partner.key) {
      case "plc": {
        assessmentTypes.push("plc");
        break;
      }
      case "towerstone": {
        assessmentTypes.push("180");
        assessmentTypes.push("360");
        break;
      }
      case "mores": {
        assessmentTypes.push("i360");
        assessmentTypes.push("l360");
        assessmentTypes.push("team180");
        assessmentTypes.push("culture");
        break;
      }
    }

    let $statuses = status;
    if (
      user.hasRole(partner._id, "DEVELOPER") === true ||
      user.hasRole(partner._id, "ADMIN") === true ||
      user.hasRole(partner._id, "ORGANIZATION_ADMIN") === true
    ) {
      $statuses.push("new");
      $statuses.push("paused");
    }

    const surveys = await Survey.find({
      surveyType: {
        $in: assessmentTypes,
      },
      status: { $in: status },
      endDate: {
        $gte: moment().subtract(1, "month").startOf("month").toDate(),
      },
    }).then();

    logger.debug(`Found (${surveys.length}) surveys for user`);

    const assessments = await Assessment.find({
      assessor: findUser._id,
      deleted: false,
      survey: { $in: surveys.map((survey) => survey._id) },
    })
      .populate("assessor")
      .populate("delegate")
      .populate("survey")
      .then();

    return assessments;
  }

  throw new RecordNotFoundError("No user matching id");
};

const userResolvers = {
  Task: {
    id(task: { _id: any }) {
      return task._id;
    },
    description(task: { description: any }) {
      return task.description || "not set";
    },
    user(task: { user: any }) {
      return User.findById(task.user);
    },
    comments() {
      return [];
    },
    dueDate: (task: { dueDate: any }) => task.dueDate || null,
    startDate: (task: { startDate: any }) => task.startDate || null,
    createdAt(task: { createdAt: any }) {
      return task.createdAt || moment().valueOf();
    },
    updatedAt(task: { updatedAt: any }) {
      return task.updatedAt || moment().valueOf();
    },
  },
  Email: {
    id(email: { _id: any; id: any }) {
      if (email._id) return email._id;
      if (email.id) return email.id;
      return "no-id";
    },
    user(obj: { user: any }) {
      try {
        if (obj.user) return User.findById(obj.user);
        return null;
      } catch (findErr) {
        console.error("Error loading user");
        throw findErr;
      }
    },
    survey(obj: { survey: any }) {
      try {
        if (obj.survey) return Survey.findById(obj.survey);
        return null;
      } catch (surveyError) {
        console.error("Error loading survey");
        throw surveyError;
      }
    },
  },
  SurveyReportForUser: {
    overall(sr: any) {
      return 0;
    },
    status(sr: any) {
      return "READY";
    },
    survey(sr: { survey: any }) {
      return sr.survey;
    },
    user(sr: { user: any }) {
      return sr.user;
    },
    assessments(sr: { assessments: any }) {
      return sr.assessments || [];
    },
    tasks(sr: { tasks: any }) {
      return sr.tasks || [];
    },
    comments(sr: { comments: any }) {
      return sr.comments || [];
    },
  },
  Rating: {
    id(obj: { _id: any }) {
      return obj._id || null;
    },
    async quality(rating: { qualityId: any }) {
      const lb = await LeadershipBrand.findOne({
        "qualities._id": ObjectId(rating.qualityId),
      }).then();
      if (lb) {
        return lb.qualities.id(rating.qualityId);
      }

      return null;
    },
    async behaviour(rating: {
      custom: boolean;
      behaviourId: any;
      behaviourText: any;
      qualityId: any;
    }) {
      if (rating.custom === true && lodash.isNil(rating.behaviourId)) {
        return {
          id: ObjectId(),
          title: rating.behaviourText,
          ordinal: 99,
        };
      }

      const lb = await LeadershipBrand.findOne({
        "qualities._id": ObjectId(rating.qualityId),
      }).then();
      if (lb) {
        return lb.qualities
          .id(rating.qualityId)
          .behaviours.id(rating.behaviourId);
      }

      return null;
    },
    rating(rating: { rating: any }) {
      return rating.rating || 0;
    },
    comment(rating: { comment: any }) {
      return rating.comment || "";
    },
  },
  Assessment: {
    id(o: { _id: any }) {
      return o._id || null;
    },
    assessor(o: { assessor: { _id: any } }) {
      if (o.assessor && o.assessor._id) return o.assessor;
      return User.findById(o.assessor);
    },
    delegate(o: { delegate: { _id: any } }) {
      if (o.delegate && o.delegate._id) return o.delegate;
      return User.findById(o.delegate);
    },
    survey(o: { survey: { _id: any } }) {
      if (o.survey && o.survey._id) return o.survey;
      return Survey.findById(o.survey);
    },
    assessmentType(o: { assessmentType: any }) {
      return o.assessmentType || "CUSTOM";
    },
    complete(o: { complete: boolean }) {
      return o.complete === true;
    },
    selfAssessment(assessment: { assessor: any; delegate: any }) {
      const { assessor, delegate } = assessment;

      if (
        ObjectId.isValid(assessor) === true &&
        ObjectId.isValid(delegate) === true
      ) {
        return new ObjectId(assessor).equals(new ObjectId(delegate));
      }

      if (
        typeof assessor === "object" &&
        assessor._id &&
        typeof delegate === "object" &&
        delegate._id
      ) {
        return assessor._id.equals(delegate._id);
      }

      return assessor === delegate;
    },
    async overdue(obj: { complete?: any; survey: any }) {
      if (obj.complete === true) return false;
      const { survey } = obj;
      const now = moment();
      let end = null;
      let status = "open";
      if (survey._id && survey.endDate && survey.status) {
        end = moment(survey.endDate);
        status = survey.status; //eslint-disable-line
      } else {
        const loaded = await Survey.findById(obj.survey)
          .select("endDate status")
          .then();
        end = moment(loaded.endDate);
        status = loaded.status; //eslint-disable-line
      }
      if (status === "closed") return false;
      return now.isAfter(end) === true;
    },
    ratings(assessment: { ratings: any }) {
      return assessment.ratings;
    },
  },
  UserPeers: {
    id(obj: Reactory.IOrganigramDocument) {
      if (obj._id) return obj._id.toString();
    },
    allowEdit(obj: { allowEdit: boolean }) {
      return obj.allowEdit === true;
    },
    async peers(obj: { peers: any[] }) {
      // const peers = [];
      return obj.peers.map(
        (peer: {
          user: any;
          relationship: any;
          isInternal: boolean;
          inviteSent: boolean;
          confirmed: boolean;
          confirmedAt: any;
        }) => {
          return {
            user: Admin.User.userWithId(peer.user),
            relationship: peer.relationship || "PEER",
            isInternal: peer.isInternal === true,
            inviteSent: peer.inviteSent === true,
            confirmed: peer.confirmed === true,
            confirmedAt: peer.confirmedAt || null,
          };
        }
      );
    },
    organization(obj: { organization: any }) {
      return Admin.Organization.findById(obj.organization);
    },
    user(o: { user: any }) {
      return Admin.User.userWithId(o.user);
    },
  },
  User: {
    id(obj: { _id: any }) {
      return obj._id;
    },
    fullName(user: { fullName: () => any; firstName: any; lastName: any }) {
      if (!user) return "null-user";
      if (typeof user.fullName === "function") return user.fullName();

      return `${user.firstName} ${user.lastName}`;
    },
    fullNameWithEmail(user: { firstName: any; lastName: any; email: any }) {
      const { firstName, lastName, email } = user;
      return `${firstName} ${lastName}<${email}>`;
    },
    username(obj: { username: any }) {
      return obj.username;
    },
    peers(usr: { _id: any; memberships: { organizationId: any }[] }) {
      return Organigram.findOne({
        user: usr._id,
        organization: usr.memberships[0].organizationId,
      });
    },
    memberships(
      usr: { memberships: Reactory.IMembership[] },
      args: any,
      context: Reactory.IReactoryContext
    ) {
      if (lodash.isArray(usr.memberships)) {
        return lodash.filter(usr.memberships, {
          clientId: context.partner._id,
        });
      }

      return [];
    },
    deleted(user: { deleted: any }) {
      return user.deleted || false;
    },
    mobileNumber(user: { mobileNumber: any }) {
      return user.mobileNumber || "Not Set";
    },
  },
  UserMembership: {
    id: ({ _id }) => {
      return _id.toString();
    },
    client({ clientId }) {
      return ReactoryClient.findById(clientId);
    },
    organization({ organizationId }) {
      return Organization.findById(organizationId);
    },
    businessUnit({ businessUnitId }) {
      return BusinessUnit.findById(businessUnitId);
    },
    lastLogin: ({ lastLogin, user }) => {
      if (lastLogin) return lastLogin;

      if (user && user.lastLogin) return user.lastLogin;

      return null;
    },
    created: ({ created, user }) => {
      if (created) return created;

      if (user && user.createdAt) return user.createdAt;

      return null;
    },
  },
  Query: {
    allUsers(obj: any, args: any, context: any, info: any) {
      return Admin.User.listAll().then();
    },
    async userWithId(obj: any, { id }: any, context: any, info: any) {
      const user = await User.findById(id).then();

      return user;
    },
    async userPeers(obj: any, { id, organizationId }: any) {
      if (!organizationId) {
        return [];
      }

      const user = await User.findById(id).then();
      const organization = await Organization.findById(organizationId).then();
      const orgId = organization._id
        ? organization._id
        : user.memberships[0].organizationId;
      return Organigram.findOne({ user: user._id, organization: orgId }).then();
    },
    authenticatedUser(obj: any, args: any, context: any, info: any) {
      return context.user;
    },
    async userInbox(
      obj: any,
      { id, sort, via = "local" }: any,
      context: any,
      info: any
    ) {
      const { user } = context;
      if (isNil(user) === true) throw new ApiError("Not Authorized");
      const userId = isNil(id) ? user._id : ObjectId(id);
      logger.info(`Finding emails for userId ${userId} via ${via}`);

      switch (via) {
        case "microsoft": {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            logger.debug(found);
            if (found) {
              logger.debug("Found Authentication Info For MS", {
                token: found.props.accessToken,
              });
              const emails = await O365.getEmails(found.props.accessToken);
              logger.debug("Received Email Payload", emails);
              const mailmaps = om(emails, {
                "value[].id": "emails[].id",
                "value[].body.contentType": "emails[].format",
                "value[].body.content": "emails[].message",
                "value[].sender.emailAddress.address": "emails[].from",
                "value[].sentDateTime": "emails[].sentAt",
                "value[].receivedDateTime": [
                  "emails[].receivedAt",
                  "emails[].createdAt",
                ],
                "value[].subject": "emails[].subject",
                "value[].isRead": "emails[].isRead",
              });

              logger.debug("Found mails", mailmaps);
              return mailmaps.emails;
            }
            throw new ApiError("User has not authenticated with microsoft");
          } else {
            throw new ApiError("User has not authenticated via microsoft");
          }
        }
        default: {
          return EmailQueue.find({ user: userId }).then();
        }
      }
    },
    userSurveys(obj: any, { id, sort }: any, context: any, info: any) {
      logger.info(`Finding surveys for user ${id}, ${sort}`);
      return userAssessments(id, context);
    },
    MoresUserSurvey(obj: any, { id }: any, context: any, info: any) {
      const { partner } = context;
      switch (partner.key) {
        case "mores": {
          return MoresAssessmentsForUser(id, ["launched"], context);
        }
        default: {
          return userAssessments(id, context);
        }
      }
    },
    userReports(obj: any, { id, sort }: any, context: any, info: any) {
      return new Promise((resolve, reject) => {
        const { user } = context;
        Admin.User.surveysForUser(id).then((userSurveys) => {
          if (userSurveys && userSurveys.length === 0) resolve([]);
          const surveyReports = [];
          const promises = userSurveys.map((userSurvey: any) => {
            const resolveData = co.wrap(function* resolveDataGenerator(
              userId,
              survey
            ) {
              const assessments = yield Admin.User.assessmentForUserInSurvey(
                userId,
                survey._id
              ).then();
              const tasks = yield Admin.User.tasksForUserRelatedToSurvey(
                userId,
                survey._id
              ).then();
              return {
                overall: 0,
                status: "READY",
                user,
                survey: userSurvey,
                assessments,
                tasks,
                comments: [],
              };
            });
            return resolveData(id, userSurvey);
          });

          Promise.all(promises)
            .then((results) => {
              resolve(results);
            })
            .catch((e) => {
              reject(e);
            });
        });
      });
    },
    async reportDetailForUser(
      object: any,
      { userId, surveyId }: any,
      context: any,
      info: any
    ) {
      const { user } = context;
      const reportResult = {
        overall: 0,
        status: "BUSY",
        user,
        survey: null,
        assessments: [],
        tasks: [],
        comments: [],
        errors: null,
      };

      let _user = user;
      if (userId && ObjectId.isValid(userId) === true)
        _user = await User.findById(userId).then();
      if (_user === null) {
        throw new RecordNotFoundError(`The user id ${userId} not found`);
      }

      try {
        const survey = await Admin.User.surveyForUser(
          userId || user._id.toString(),
          surveyId
        ).then();
        reportResult.survey = survey;

        logger.info("Found surveyResult", survey);
        if (isNil(survey) === true)
          throw new RecordNotFoundError(
            "Could not locate the survey and delegate match"
          );

        logger.info(
          `Fetching Details For Assessment: ${userId} => Survey: ${survey._id}`
        );

        reportResult.assessments = await Admin.User.assessmentForUserInSurvey(
          _user._id,
          survey._id
        ).then();
        reportResult.tasks = await Admin.User.tasksForUserRelatedToSurvey(
          _user._id,
          survey._id
        ).then();
      } catch (reportGenerateError) {
        logger.error(
          `Could not generate a report due to an error ${reportGenerateError.message}`,
          reportGenerateError
        );
      }

      return reportResult;
    },
    async assessmentWithId(obj: any, { id }: any, context: any, info: any) {
      logger.info("Finding Assessment with Id", { id });
      return Assessment.findById(id)
        .populate("survey")
        .populate("delegate")
        .populate("assessor")
        .then();
    },
    userTasks(
      obj: any,
      { id, status }: any,
      context: Reactory.IReactoryContext
    ) {
      return Task.find({
        user: ObjectId(id || context.user._id),
        status,
      }).then();
    },
    taskDetail(parent: any, { id }: any) {
      logger.info(`Finding Task For Id ${id}`);
      return Task.findById(id).then();
    },
    async searchUser(parent: any, { searchString, sort = "email" }: any) {
      return User.find({ email: `/${searchString}/i` })
        .sort(`-${sort}`)
        .then();
    },
    async getUserCredentials(
      parent: any,
      { provider }: any,
      context: Reactory.IReactoryContext
    ) {
      logger.info(
        `Getting user credentials for ${context.user.fullName(true)}`
      );
      if (context.user) {
        return context.user.getAuthentication(provider);
      }
      return null;
    },
  },
  Mutation: {
    createUser: async (
      obj: any,
      { input, organizationId, password }: any,
      context: Reactory.IReactoryContext,
      info: any
    ) => {
      const { partner, user } = context;

      logger.info(`Create user mutation called ${input.email}`);
      const existing: Reactory.IUserDocument = await User.findOne({
        email: input.email,
      }).then();

      logger.info(
        `Checked user with email address ${input.email} result: ${isNil(existing) === false
          ? `Found [${existing._id.toString()}]`
          : "Not Found"
        }`
      );
      const organization = await Organization.findById(organizationId);

      if (isNil(existing) === false && organization) {
        /** Checking if user has role */
        if (existing.hasAnyRole(partner._id, organization._id) === false) {
          await existing.addRole(partner._id, "USER", organization._id);
        }

        return existing;
      }

      if (isNil(organizationId) === false && isNil(input) === false) {
        const organization = await Organization.findById(organizationId);
        const createResult = await Admin.User.createUserForOrganization(
          input,
          password || "Password123!",
          organization,
          ["USER"],
          "LOCAL",
          context.partner,
          null
        ).then();
        return createResult.user;
      }
      throw new Error("Organization Id is required");
    },
    setOrganizationForUser: async (obj: any, { id, organizationId }: any) => {
      const user = await User.findById(id);
      const organization = await Organization.findById(organizationId);
      user.organization = organization;
      await user.save();

      return true;
    },
    updateUser(obj: any, { id, profileData }: any) {
      logger.info("Update user mutation called", { id, profileData });
      return Admin.User.updateProfile(id, profileData);
    },
    setPassword(
      obj: any,
      { input: { password, confirmPassword, authToken } }: any,
      context: Reactory.IReactoryContext
    ) {
      return new Promise((resolve, reject) => {
        const { user } = context;
        if (typeof password !== "string")
          reject(new ApiError("password expects string input"));
        if (password === confirmPassword && user) {
          logger.info(`Setting user password ${user.email}, ${authToken}`);
          user.setPassword(password);
          user.save().then((updateUser: unknown) => resolve(updateUser));
        } else {
          reject(new ApiError("Passwords do not match"));
        }
      });
    },
    createTask(
      obj: any,
      { id, taskInput }: any,
      context: Reactory.IReactoryContext
    ) {
      const { _id } = context.user;
      return co.wrap(function* createTaskGenerator(userId, task) {
        const created = yield new Task({
          ...task,
          user: ObjectId(userId),
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
        })
          .save()
          .then();
        return created;
      })(id || _id.toString(), taskInput);
    },
    async confirmPeers(
      obj: any,
      { id, organization, surveyId }: any,
      context: Reactory.IReactoryContext
    ) {
      logger.debug(
        `CONFIRMING PEERS - ID: ${id}  ORG: ${organization}  SURVEY ID: ${surveyId}`
      );

      const userOrganigram = await Organigram.findOne({
        user: new ObjectId(id),
        organization: new ObjectId(organization),
      })
        .populate("user")
        .populate("organization")
        .populate("peers.user")
        .then();

      if (lodash.isNil(userOrganigram) === true)
        throw new RecordNotFoundError("User Organigram Record Not Found");

      let survey: ISurveyDocument = null;
      userOrganigram.confirmedAt = new Date().valueOf();
      userOrganigram.updatedAt = new Date().valueOf();
      await userOrganigram.save().then()

      if (surveyId) {
        survey = await Survey.findById(new ObjectId(surveyId))
          .populate("delegates.assessments")
          .populate("delegates.delegate").then();
        const params = {
          query: {
            _id: new ObjectId(surveyId),
            "delegates.delegate": new ObjectId(id),
          },
          data: { "delegates.$.nomineeConfirmed": true },
        };
        let delegate = survey.delegates.filter((delegate: any) => delegate.delegate._doc._id.toString() === id)
        delegate = delegate.length > 0 ? delegate[0] : null
        if (survey && survey.delegates.length > 0) {
          if (delegate.status !== 'new') await Survey.updateOne(params.query, { $set: params.data });
        } else throw new ApiError('No Peers to confirm')

        if (survey && survey.options) {
          //@ts-ignore
          const {autoLaunchOnPeerConfirm, minimumPeers} = survey.options
          const entryData: Mores.IDelegateEntryDataStruct = {
            entry: null,
            entryIdx: -1,
            message: 'Awaiting instruction',
            error: false,
            success: true,
            patch: false,
          };
          if (autoLaunchOnPeerConfirm === true && survey.delegates.length >= minimumPeers && delegate && delegate.status !== 'new') {
            entryData.entry = delegate
            const variables = {
              survey: survey._id.toString(),
              entryId: entryData.entry._id.toString(),
              delegate: entryData.entry.delegate._id.toString(),
              action: 'launch',
              inputData: {
                relaunch: false,
              }
            };
            const result = await execml(`mutation SurveyDelegateAction($entryId: String!, $survey: String!, $delegate: String!, $action: String!, $inputData: Any){
              surveyDelegateAction(entryId: $entryId, survey: $survey, delegate: $delegate, action: $action, inputData: $inputData) {
                id
                delegate {
                  id
                  firstName
                  lastName
                  email
                  avatar
                }
                team
                peers {
                  id
                  peers{
                    user {
                      id
                      firstName
                      lastName
                    }
                  }
                }
                notifications {
                  id
                }
                assessments {
                  id
                }
                status
                launched
                complete
                removed
                message
                updatedAt
                lastAction
              }
            }`, variables , {}, context.user, context.partner).then()
            logger.debug(`Auto launched survey ${survey.surveyType} for user ${id}`);
           
          }
        }
      } else throw new ApiError('No survey found')



      const emailPromises = [];
      for (
        let peerIndex = 0;
        peerIndex < userOrganigram.peers.length;
        peerIndex += 1
      ) {
        logger.info(
          `Sending peer notification to ${userOrganigram.peers[peerIndex].user.firstName}`
        );
        let mustSend = userOrganigram.peers[peerIndex].inviteSent !== true;

        if (
          mustSend === false &&
          userOrganigram.peers[peerIndex].confirmed === true
        ) {
          const whenConfirmed = moment(
            userOrganigram.peers[peerIndex].confirmedAt
          );
          if (moment.isMoment(whenConfirmed) === true) {
            mustSend =
              Math.abs(moment().diff(whenConfirmed, "day", true)) >= 30;
          }
        }

        if (mustSend === true) {
          const { user } = userOrganigram;
          emailPromises.push(
            organigramEmails.confirmedAsPeer(
              userOrganigram.peers[peerIndex].user,
              user,
              userOrganigram.peers[peerIndex].relationship,
              userOrganigram.organization,
              userOrganigram,
              peerIndex,
              survey
            )
          );
        }
      }

      logger.info(
        `Created ${emailPromises.length} promises to send invite peer confirmation emails`
      );
      try {
        if (emailPromises.length > 0) {
          await Promise.all(emailPromises).then((res) => {
            if (survey)
              survey.addTimelineEntry(
                SURVEY_EVENTS_TO_TRACK.NOMINEES_CONFIRMED,
                `Nominees confirmed @ ${moment().format("DD MMM YYYY HH:mm")}.`,
                null,
                true
              );
          });
        }
      } catch (emailError) {
        logger.error(
          `Error processing email promises ${emailError.message}`,
          emailError
        );
      }
      await userOrganigram.save().then();

      return Organigram.findById(userOrganigram._id);
    },
    async removePeer(
      obj: any,
      { id, peer, organization }: any,
      context: Reactory.IReactoryContext
    ) {
      const userOrganigram = await Organigram.findOne({
        user: ObjectId(id),
        organization: ObjectId(organization),
      }).then();

      let modified = false;
      if (userOrganigram) {
        userOrganigram.peers.forEach(
          (peerEntry: {
            user: { toString: () => any };
            remove: () => void;
          }) => {
            logger.info(
              `Checking peer ${peerEntry.user} => ${peer}: match: ${peerEntry.user.toString() === peer
              }`
            );
            if (peerEntry.user.toString() === peer) {
              logger.info("Matched, deleting peerEntry");
              peerEntry.remove();
              modified = true;
            }
          }
        );

        if (modified === true) {
          userOrganigram.confirmedAt = null;
          await userOrganigram.save().then();
        }

        return userOrganigram;
      }

      return null;
    },
    async setPeerRelationShip(
      obj: any,
      { id, peer, organization, relationship }: any,
      context: Reactory.IReactoryContext
    ) {
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
        logger.info("User Organigram Not Found");
        userOrganigram = new Organigram({
          user: ObjectId(id),
          organization: ObjectId(organization),
          peers: [],
          confirmedAt: null,
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
        });
      } else {
        logger.info("User Organigram Found", userOrganigram);
        userOrganigram.updatedAt = new Date().valueOf();
      }

      let updated = false;
      userOrganigram.peers.forEach(
        (p: { user: { toString: () => any }; relationship: any }) => {
          if (p.user.toString() === peer) {
            logger.info(
              "Matching peer found, updating relationship status",
              relationship
            );
            p.relationship = relationship;
            updated = true;
            userOrganigram.confirmedAt = null;
          }
        }
      );

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
    async removeUserRole(
      obj: any,
      { id, email, organization, role, clientId }: any,
      context: Reactory.IReactoryContext
    ) {
      const { user, partner } = context;
      let clientToUse = partner; // use the default partner
      let userToUpdate = null;

      if (lodash.isNil(email) === false) {
        userToUpdate = await User.findOne({ email }).then();
        if (lodash.isNil(userToUpdate) === true)
          throw new RecordNotFoundError(`User not found ${email}`);
      } else {
        if (ObjectId.isValid(id) === false) throw new ApiError("Invalid id");
        userToUpdate = await User.findOne({ _id: ObjectId(id) }.then());
        if (lodash.isNil(userToUpdate) === true)
          throw new RecordNotFoundError(`User not found ${id}`);
      }

      if (
        lodash.isNil(organization) === false &&
        ObjectId.isValid(organization) === false
      )
        throw new ApiError(
          "Invalid organization id - accepts null or valid id"
        );
      if (
        lodash.isNil(clientId) === false &&
        ObjectId.isValid(clientId) === false
      )
        throw new ApiError("Invalid clientId id - accepts null or valid id");

      // Check if we have a valid client
      if (
        ObjectId.isValid(clientId) &&
        ObjectId(clientId).equals(clientToUse._id) === false
      ) {
        clientToUse = await ReactoryClient.findById(clientId).then();
      }

      // Check if the logged in user has permissions
      if (user.hasRole(clientToUse._id, "ADMIN", null, null) === false) {
        throw new ApiError(
          "Incorrect Permissions, you do not have permission to perform this function"
        );
      }

      if (
        userToUpdate.hasRole(clientToUse._id, role, organization, null) === true
      ) {
        await userToUpdate.removeRole(
          clientToUse._id,
          role,
          organization,
          null
        );
      }

      return userToUpdate.memberships;
    },
    async addUserRole(
      obj: any,
      { id, email, organization, role, clientId }: any,
      context: Reactory.IReactoryContext
    ) {
      const { user, partner } = context;
      logger.info(
        `Adding role => EMAIL: ${email}  ROLE: ${role} ORG: ${organization} CLIENT: ${clientId}`
      );
      let clientToUse = partner; // use the default partner
      let userToUpdate = null;

      if (lodash.isNil(email) === false) {
        userToUpdate = await User.findOne({ email }).then();
        if (lodash.isNil(userToUpdate) === true)
          throw new RecordNotFoundError(`User not found ${email}`);
      } else {
        if (ObjectId.isValid(id) === false) throw new ApiError("Invalid id");
        userToUpdate = await User.findOne({ _id: ObjectId(id) }.then());
        if (lodash.isNil(userToUpdate) === true)
          throw new RecordNotFoundError(`User not found ${id}`);
      }

      if (
        lodash.isNil(organization) === false &&
        ObjectId.isValid(organization) === false
      )
        throw new ApiError(
          "Invalid organization id - accepts null or valid id"
        );
      if (
        lodash.isNil(clientId) === false &&
        ObjectId.isValid(clientId) === false
      )
        throw new ApiError("Invalid clientId id - accepts null or valid id");

      // Check if we have a valid client
      if (
        ObjectId.isValid(clientId) &&
        ObjectId(clientId).equals(clientToUse._id) === false
      ) {
        clientToUse = await ReactoryClient.findById(clientId).then();
      }

      // Check if the logged in user has permissions
      logger.info(`Checking calling user permissions ${user.fullName()}`, {
        memberships: user.memberships,
      });
      if (user.hasRole(clientToUse._id, "ADMIN", null, null) === false) {
        logger.info(`Authenticated user is: ${user.fullName()}`, user);
        throw new ApiError(
          `Incorrect Permissions, you do not have permission to perform this function ${user.fullName()}`
        );
      }

      logger.info(
        `Adding role ${role} to ${userToUpdate.fullName()} does not have role, adding`
      );
      await userToUpdate.addRole(clientToUse._id, role, organization, null);

      return userToUpdate.memberships;
    },
    async deleteUser(
      parent: any,
      { id }: any,
      context: Reactory.IReactoryContext
    ) {
      const user = await User.findById(id).then();
      if (isNil(user) === true)
        throw new RecordNotFoundError(
          `Could not locate the user with the id ${id}`
        );
      user.deleted = true;
      await user.save().then();
      return true;
    },
    async addUserCredentials(
      parent: any,
      { provider, props }: any,
      context: Reactory.IReactoryContext
    ) {
      return context.user.setAuthentication({
        provider,
        props,
        lastLogin: new Date().valueOf(),
      });
    },
    async removeUserCredentials(
      parent: any,
      { provider }: any,
      context: Reactory.IReactoryContext
    ) {
      if (context.user) {
        await context.user.removeAuthentication(provider);
        return true;
      }
      return false;
    },
    async sendMail(
      parent: any,
      { message }: any,
      context: Reactory.IReactoryContext
    ) {
      const {
        id,
        via,
        subject,
        contentType,
        content,
        recipients,
        ccRecipients,
        bcc,
        saveToSentItems,
        attachments = [],
      } = message;
      const { user } = context;
      if (isNil(user) === true) throw new ApiError("Not Authorized");
      const userId = isNil(id) ? user._id : ObjectId(id);
      logger.info(`USER ID ${userId} via ${via}`);
      switch (via) {
        case "microsoft": {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            logger.debug(`EMAIL USER FOUND: ${found}`);
            if (found) {
              const result = await O365.sendEmail(
                found.props.accessToken,
                subject,
                contentType,
                content,
                recipients,
                saveToSentItems,
                ccRecipients,
                bcc,
                attachments
              )
                .then()
                .catch((error) => {
                  if (error.statusCode == 401) {
                    throw new ApiError(
                      `Error Sending Mail. Invalid Authentication Token`,
                      {
                        statusCode: error.statusCode,
                        type: "MSAuthenticationFailure",
                      }
                    );
                  } else {
                    throw new ApiError(
                      `Error Sending Mail: ${error.code} - ${error.message}`,
                      { statusCode: error.statusCode }
                    );
                  }
                });

              if (result && result.statusCode && result.statusCode != 400) {
                throw new ApiError(`${result.code}. ${result.message}`);
              }

              return {
                Successful: true,
                Message: "Your mail was sent successfully.",
              };
            }
            throw new ApiError("User has not authenticated with microsoft");
          } else {
            throw new ApiError("User has not authenticated via microsoft");
          }
        }
        default: {
          throw new ApiError("Not Implemented Yet");
        }
      }
    },
    async createOutlookTask(
      parent: any,
      { task }: any,
      context: Reactory.IReactoryContext
    ) {
      const { id, via, subject, startDate, dueDate, timeZone } = task;
      const { user } = context;
      if (isNil(user) === true) throw new ApiError("Not Authorized");
      const userId = isNil(id) ? user._id : new ObjectId(id);
      logger.info(`USER ID ${userId} via ${via}`);
      switch (via) {
        case "microsoft": {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            if (found) {
              let TaskId = "";
              const result = await O365.createTask(
                found.props.accessToken,
                subject,
                id,
                startDate,
                dueDate,
                timeZone
              )
                .then((response) => {
                  TaskId = response.id;
                })
                .catch((error) => {
                  if (error.statusCode == 401) {
                    throw new ApiError(
                      `Error Creating Outlook Task. Invalid Authentication Token`,
                      {
                        statusCode: error.statusCode,
                        type: "MSAuthenticationFailure",
                      }
                    );
                  } else {
                    throw new ApiError(
                      `Error Creating Outlook Task: ${error.code} - ${error.message}`,
                      { statusCode: error.statusCode }
                    );
                  }
                });

              if (result && result.statusCode && result.statusCode != 400) {
                throw new ApiError(
                  `Error Createing Outlook Task: ${result.message} - ${result.message}`
                );
              }

              return {
                Successful: true,
                Message: "Your task was created successfully.",
                TaskId,
              };
            }
            throw new ApiError("User has not authenticated with microsoft");
          } else {
            throw new ApiError("User has not authenticated via microsoft");
          }
        }
        default: {
          throw new ApiError("Not Implemented Yet");
        }
      }
    },
    async deleteOutlookTask(
      parent: any,
      { task }: any,
      context: Reactory.IReactoryContext
    ) {
      const { id, via, taskId } = task;
      const { user } = context;
      if (isNil(user) === true) throw new ApiError("Not Authorized");
      const userId = isNil(id) ? user._id : ObjectId(id);
      switch (via) {
        case "microsoft": {
          const emailUser = await User.findById(userId).then();
          if (emailUser.authentications) {
            const found = find(emailUser.authentications, { provider: via });
            if (found) {
              const result = await O365.deleteTask(
                found.props.accessToken,
                taskId
              )
                .then()
                .catch((error) => {
                  if (error.statusCode == 401) {
                    throw new ApiError(
                      `Error Deleting Outlook Task. Invalid Authentication Token`,
                      {
                        statusCode: error.statusCode,
                        type: "MSAuthenticationFailure",
                      }
                    );
                  } else {
                    throw new ApiError(
                      `Error Deleting Outlook Task: ${error.code} - ${error.message}`,
                      { statusCode: error.statusCode }
                    );
                  }
                });

              logger.info(`DELETION RESULT::  ${JSON.stringify(result)}`);

              if (result && result.statusCode && result.statusCode != 400) {
                throw new ApiError(
                  `Error Createing Outlook Task: ${result.message} - ${result.message}`
                );
              }

              return {
                Successful: true,
                Message: "Task successfully deleted.",
              };
            }
            throw new ApiError("User has not authenticated with microsoft");
          } else {
            throw new ApiError("User has not authenticated via microsoft");
          }
        }
        default: {
          throw new ApiError("Not Implemented Yet");
        }
      }
    },
    ReactoryCoreSetRolesForMembership: async (
      parent: any,
      args: Reactory.ReactorySetRolesArgs,
      context: Reactory.IReactoryContext
    ): Promise<Reactory.CoreSimpleResponse> => {
      const { partner } = context;
      /**
       * Check if the the user executing this has the ADMIN role for the application
       */
      if (context.user.hasRole(`${partner._id}`, "ADMIN") === false) {
        return {
          message:
            "You do not have sufficient permissions to perform this activity",
          success: false,
          payload: null,
        };
      }

      const { id, user_id, roles } = args;

      const user = await User.findById(user_id).then();

      if (!user) {
        return {
          message: "User with that id is not found",
          success: false,
          payload: null,
        };
      }

      const membership = (
        user.memberships as Mongoose.Types.DocumentArray<Reactory.IMembershipDocument>
      ).id(id);
      if (membership) {
        membership.roles = roles;
      }

      await user.save().then();

      return {
        message: "Roles for user has been successfully updated.",
        success: true,
        payload: null,
      };
    },
    ReactoryCoreCreateUserMembership: async (
      parent: any,
      args: Reactory.ReactoryCreateMembershipArgs,
      context: Reactory.IReactoryContext
    ): Promise<Reactory.IMembership> => {
      const { partner } = context;
      /**
       * Check if the the user executing this has the ADMIN role for the application
       */
      if (context.user.hasRole(`${partner._id}`, "ADMIN") === false) {
        throw new ApiError(
          "You do not have permissions to perform this function",
          {}
        );
      }

      const userToUpdate = await User.findById(args.user_id).then();

      if (userToUpdate) {
        let existing = lodash.filter(
          userToUpdate.memberships,
          (membership: Reactory.IMembershipDocument) => {
            let org_match = false;
            let bu_match = false;

            if (args.organization && membership.organizationId) {
              if (
                membership.organizationId.equals(
                  new ObjectId(args.organization)
                ) === true
              ) {
                org_match = true;
              }

              if (org_match === true) {
                if (args.businessUnit && membership.businessUnitId)
                  if (
                    membership.businessUnitId.equals(
                      new ObjectId(args.businessUnit)
                    ) === true
                  ) {
                    bu_match = true;
                  }
              }
            }

            return org_match && bu_match;
          }
        );

        if (existing.length === 0) {
          //no matching combos add it to the users profile
          userToUpdate.memberships.push({
            clientId: partner._id,
            organizationId: args.organization
              ? new ObjectId(args.organization)
              : null,
            businessUnitId: args.businessUnit
              ? new ObjectId(args.businessUnit)
              : null,
            roles: args.roles,
            enabled: true,
            authProvider: "",
            providerId: "",
            lastLogin: null,
            user: userToUpdate,
          });

          await userToUpdate.save().then();
          return userToUpdate.memberships[userToUpdate.memberships.length - 1];
        }

        if (existing.length > 0) {
          throw new ApiError(
            "User already has a membership with this combination."
          );
        }
      }

      throw new RecordNotFoundError(
        "Could not load the user with the given id",
        "User",
        { id: args.user_id }
      );
    },
  },
};

module.exports = userResolvers;
