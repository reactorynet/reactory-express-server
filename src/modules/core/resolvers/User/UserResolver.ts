import { ObjectId } from "mongodb";
import co from "co";
import moment from "moment";
import lodash, { isNil, find } from "lodash";
import om from "object-mapper";
// import Admin from "@reactory/server-core/application/admin";
// import {
//   Organization,
//   EmailQueue,
//   User,
//   Survey,
//   Assessment,
//   LeadershipBrand,
//   Organigram,
//   Task,
//   ReactoryClient,
//   BusinessUnit,
// } from "@reactory/server-core/models/index";
import O365 from "@reactory/server-modules/reactory-azure/services/graph";

import ApiError, {
  RecordNotFoundError,
} from "@reactory/server-core/exceptions";
import crypto from 'crypto';
import logger from "@reactory/server-core/logging";
import Reactory from "@reactory/reactory-core";

import Mongoose from "mongoose";

import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver'

const uuid = require("uuid");

/**
 * TODO: This resolver needs to be refactored to a class resolver.
 */
const userResolvers = {
  
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
    peers(usr: Reactory.Models.IUserDocument) { 
      if(usr && usr?.memberships?.length > 0, usr.memberships[0]?.organizationId) {        
        return Organigram.findOne({
          user: usr._id,
          organization: usr.memberships[0]?.organizationId,
        }).exec();
      }     
    },
    memberships(
      usr: { memberships: Reactory.IMembership[] },
      args: any,
      context: Reactory.Server.IReactoryContext
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
  Query: {
    allUsers(obj: any, args: any, context: any, info: any) {
      return Admin.User.listAll().then();
    },
    async userWithId(obj: any, { id }: any, context: any, info: any) {
      const user = await User.findById(id).clone().then();

      return user;
    },
    async userPeers(obj: any, { id, organizationId }: any) {
      if (!organizationId) {
        return null;
      }

      if(organizationId === "*") return null;

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
    
    // userTasks(
    //   obj: any,
    //   { id, status }: any,
    //   context: Reactory.Server.IReactoryContext
    // ) {
    //   return Task.find({
    //     user: ObjectId(id || context.user._id),
    //     status,
    //   }).then();
    // },
    // taskDetail(parent: any, { id }: any) {
    //   logger.info(`Finding Task For Id ${id}`);
    //   return Task.findById(id).then();
    // },
    async searchUser(parent: any, { searchString, sort = "email" }: any) {
      return User.find({ email: `/${searchString}/i` })
        .sort(`-${sort}`)
        .then();
    },
    async getUserCredentials(
      parent: any,
      { provider }: any,
      context: Reactory.Server.IReactoryContext
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
      params: { input: any, organizationId: string, password?: string },
      context: Reactory.Server.IReactoryContext,
      info: any
    ) => {
      
      const { input, organizationId, password = crypto.randomBytes(16).toString('hex') } = params;
      const { partner, user } = context;

      context.log(`Create user mutation called ${input.email}`, { params }, 'debug', 'UserResolver');
      const existing: Reactory.IUserDocument = await User.findOne({
        email: input.email,
      }).then();

      logger.info(
        `Checked user with email address ${input.email} result: ${isNil(existing) === false
          ? `Found [${existing._id.toString()}]`
          : "Not Found"
        }`
      );
      const organization = await Organization.findById(organizationId).then();

      if (isNil(existing) === false && organization) {
        /** Checking if user has role */
        if (existing.hasAnyRole(partner._id, organization._id) === false) {
          await existing.addRole(partner._id, "USER", organization._id);
        }

        return existing;
      }

      if (isNil(organizationId) === false && isNil(input) === false) {
        const organization = await Organization.findById(organizationId);
        // TODO: Core Services - Need to refactoring base Admin Interfaces into a service class with a reactory wired context
        const createResult = await Admin.User.createUserForOrganization(
          input,
          password,
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
      context: Reactory.Server.IReactoryContext
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
   
    async confirmPeers(
      obj: any,
      { id, organization, surveyId }: any,
      context: Reactory.Server.IReactoryContext
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

      
      userOrganigram.confirmedAt = new Date();
      userOrganigram.updatedAt = new Date();
      await userOrganigram.save().then()

      return userOrganigram;
    },
    async removePeer(
      obj: any,
      { id, peer, organization }: any,
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      context: Reactory.Server.IReactoryContext
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
      args: Reactory.Models.ReactorySetRolesArgs,
      context: Reactory.Server.IReactoryContext
    ): Promise<Reactory.Models.CoreSimpleResponse> => {
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
        user.memberships as Mongoose.Types.DocumentArray<Reactory.Models.IMembershipDocument>
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
      args: Reactory.Models.ReactoryCreateMembershipArgs,
      context: Reactory.Server.IReactoryContext
    ): Promise<Reactory.Models.IMembership> => {
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
          (membership: Reactory.Models.IMembershipDocument) => {
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
            enabled: true
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

@resolver
class UserResolver {
  // TODO: Convert the resolver struct to a resolver class.

}

export default userResolvers;
