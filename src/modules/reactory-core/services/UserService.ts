import Reactory from "@reactory/reactory-core";
import { ObjectId } from "mongodb";
import ApiError, {
  RecordNotFoundError,
} from "@reactory/server-core/exceptions";
import User from '@reactory/server-modules/reactory-core/models/User'
import ReactoryClient from '@reactory/server-modules/reactory-core/models/ReactoryClient';
import Organization from '@reactory/server-modules/reactory-core/models/Organization';
import Region from '@reactory/server-modules/reactory-core/models/Region';
import Team from '@reactory/server-modules/reactory-core/models/Team';
import { trim, union, isNil, find } from "lodash";
import crypto from "crypto";
import { roles } from "@reactory/server-core/authentication/decorators";
import logger from "@reactory/server-core/logging";
import { strongRandom } from "@reactory/server-core/utils";
import { 
  clients,
} from '@reactory/server-core/data'
import Constants from '@reactory/server-core/constants';
import fs from 'fs';
import path from 'path';

interface PeersState {
  [key: string]: Reactory.Models.IOrganigramDocument;
}

//simple hashmap
interface PeersFetchingState {
  [key: string]: string;
}

export interface CreateUserResult {
  organization?: Reactory.Models.IOrganizationDocument;
  user?: Reactory.Models.IUserDocument;
  errors: any[];
}

class UserService implements Reactory.Service.IReactoryUserService {
  name: string = "UserService";
  nameSpace: string = "core";
  version: string = "1.0.0";
  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;

  peerState: PeersState;
  isFetchingDocument: PeersFetchingState;
  
  modelRegistry: Reactory.Service.TReactoryModelRegistryService

  constructor(
    props: Reactory.Service.IReactoryServiceProps,
    context: Reactory.Server.IReactoryContext
  ) {
    this.context = context;
    this.props = props;
    // contains any previously fetched documents using a key map
    this.peerState = {};
    // used to indicated whether or not we are fetching a document
    this.isFetchingDocument = {};
  }


  /**
   * Functions used to Create a new user for an organization and assign a default membership
   * @param user - the user object on which to base the user
   * @param password - password string for the user
   * @param organization - organization object
   * @param roles - string array of allowed roles
   * @param provider - login / avatar provider
   * @param partner - reactory client partner
   * @param businessUnit - business unit to assign to the user
   * @returns
   */
  @roles(["SYSTEM", "ADMIN", "ORG-ADMIN::${arguments[2].id}"])
  async createUserForOrganization (
    user: Reactory.Models.IUserCreateParams,
    password: string,
    organization: Reactory.Models.IOrganizationDocument,
    roles: string[] = [],
    provider: string = "LOCAL",
    partner: Reactory.Models.IReactoryClientDocument,
    businessUnit: Reactory.Models.IBusinessUnitDocument
  ): Promise<CreateUserResult> {
    const { context } = this;
    const result: CreateUserResult = { 
      errors: [], 
      organization: organization       
    };
    try {
      const userModel = this.modelRegistry.getModel<typeof User>({
        name: "User",
        nameSpace: "core",
      });
      const partnerToUse = partner;
      let foundUser: Reactory.Models.IUserDocument = await userModel.findOne(
        { email: user.email },
        {
          _id: 1,
          memberships: 1,
          firstName: 1,
          lastName: 1,
          email: 1
        }
      ).then();
      context.info(
        `Using partner ${partnerToUse.name} to create user ${user.email} ${
          foundUser ? "EXISTING" : "NEW"
        }`
      );

      if (isNil(partnerToUse._id) === false) {
        if (isNil(foundUser) === true) {
          logger.info("User not found creating");
          foundUser = new User({
            ...user,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          foundUser.setPassword(password);
          await foundUser.save().then();
        }

        const membership: any = {
          // eslint-disable-line
          clientId: new ObjectId(partnerToUse._id), // eslint-disable-line no-underscore-dangle
          organizationId:
            organization && organization._id ? organization._id : null, // eslint-disable-line no-underscore-dangle
          businessUnitId:
            businessUnit && businessUnit._id ? businessUnit._id : null, // eslint-disable-line no-underscore-dangle
          provider,
          enabled: true,
          roles: roles.length == 1 && roles[0].toUpperCase().indexOf("ANON") >= 0 ? roles : union(roles, ["USER"]),
        };

        let membershipString = `${membership.clientId.toString()}::${membership.organizationId?.toString() || 'null'}::${membership.businessUnitId?.toString() || 'null'}`;
        // @ts-ignore //TODO: Fix the typings 
        let hasMembership = foundUser.hasMembership(
            membership.clientId,
            membership.organizationId,
            membership.businessUnitId
          );
        logger.debug(`${user.firstName} ${user.lastName} ${hasMembership ? 'has' : 'does not have'} membership: ${membershipString}`);
        if (!hasMembership) {
          foundUser.memberships.push(membership);          
        }

        membershipString = `${membership.clientId.toString()}::${membership.organizationId?.toString() || 'null'}}`;
        hasMembership = foundUser.hasMembership(
          membership.clientId,
          membership.organizationId
        );
        logger.debug(`${user.firstName} ${user.lastName} ${hasMembership ? 'has' : 'does not have'} membership: ${membershipString}`);
        if (!hasMembership) {
          foundUser.memberships.push({
            clientId: membership.clientId,
            organizationId: membership.organizationId,
            provider: membership.provider,
            enabled: membership.enabled,
            roles: membership.roles,
          });
        }

        membershipString = `${membership.clientId.toString()}`;
        hasMembership = foundUser.hasMembership(membership.clientId);
        logger.debug(`${user.firstName} ${user.lastName} ${hasMembership ? 'has' : 'does not have'} membership: ${membershipString}`);
        if (!hasMembership) {
          foundUser.memberships.push({
            clientId: membership.clientId,
            provider: membership.provider,
            enabled: membership.enabled,
            roles: membership.roles,
          });
        }
        result.user = await foundUser.save().then();

        return result;
      }
      throw new ApiError("Partner Is Required For User Creation");
    } catch (createError) {
      console.error("Created error occured", createError);
      result.errors.push(createError.message);
      return result;
    }
  };

  @roles(["ORG-ADMIN::${arguments[2].id}", "USER::${arguments[0].id}"])
  async setUserPeers(
    user: Reactory.Models.IUserDocument,
    peers: any,
    organization: Reactory.Models.IOrganizationDocument,
    allowEdit: boolean,
    confirmedAt?: Date
  ): Promise<Reactory.Models.IOrganigramDocument> {
    throw new Error("Method not implemented.");
  }

  @roles(["ORG-ADMIN::${arguments[2].id}", "USER::${arguments[0].id}"])
  async getUserPeers(
    id: string | ObjectId,
    organization_id: string | ObjectId
  ): Promise<Reactory.Models.IOrganigramDocument> {
    if (id === null) return null;
    if (organization_id === null) return null;

    const key = `${id}::${organization_id}`;

    if (this.peerState[key]) {
      this.context.log(
        `Found organigram data in service state: ${this.context.colors.green(
          key
        )} ✅`
      );
      return this.peerState[key];
    }

    this.context.log(
      `Organigram document not found fetching: ${this.context.colors.green(
        key
      )} ☎`
    );
    this.isFetchingDocument[key] = "fetching";

    const query = {
      user: new ObjectId(id),
      organization: new ObjectId(organization_id),
    };

    const organigram: Reactory.Models.IOrganigramDocument =
      await Organigram.findOne(query).then();

    if (!this.peerState[key]) {
      this.peerState[key] = organigram;
      this.isFetchingDocument[key] = "fetched";
    }

    return this.peerState[key];
  }

  
  /**
   * Sets the peers for a user after they have been validate.
   * @param { User } user
   * @param { Array<*>} peers
   * @param { Organization } organization
   */
  @roles(["ORG-ADMIN::${arguments[2].id}", "USER::${arguments[0].id}"])
  async setPeersForUser(
    user: Reactory.Models.IUserDocument,
    peers: any,
    organization: Reactory.Models.IOrganizationDocument,
    allowEdit: boolean = true,
    confirmedAt: Date = new Date()
  ): Promise<Reactory.Models.IOrganigramDocument> {
    // eslint-disable-line max-len
    return Organigram.findOne({
      user: user._id,
      organization: organization._id,
    }).then((organigram) => {
      if (isNil(organigram) === true) {
        return new Organigram({
          user: user._id,
          organization: organization._id,
          peers,
          updatedAt: new Date(),
          createdAt: new Date(),
          allowEdit,
          confirmedAt,
        })
          .save()
          .then();
      } else {
        organigram.peers = peers;
        organigram.updatedAt = new Date();
        organigram.confirmedAt = confirmedAt;
        organigram.allowEdit = allowEdit;
        return organigram.save().then();
      }
    });
  }

  @roles(["ORG-ADMIN::${arguments[1]}", "USER::${arguments[0]}"])
  async setUserDemographics(
    userId: string,
    organisationId: string,
    membershipId?: string,
    dob?: Date,
    businessUnit?: string,
    gender?: string,
    operationalGroup?: string,
    position?: string,
    race?: string,
    region?: string,
    team?: string
  ): Promise<Reactory.Models.IUserDemographicDocument> {
    const context = this.context;
    context.log(`Update Demographics start`, {
      userId,
      organisationId,
      membershipId,
      dob,
      businessUnit,
      gender,
      operationalGroup,
      position,
      region,
      race,
      team,
    });

    if (ObjectId.isValid(userId) === false)
      throw new ApiError("Bad user id - check format");
    if (ObjectId.isValid(organisationId) === false)
      throw new ApiError("Bad org id - check format");

    const organization = await Organization.findById(organisationId).then();

    if (organization === null)
      throw new RecordNotFoundError(`Organization ${organisationId} not found`);

    const user = await User.findById(new ObjectId(userId as string)).then();

    if (!user) throw new RecordNotFoundError(`User not found`);
    if (dob) user.dateOfBirth = dob;

    // TODO: Werner - 2021-09-29 - Refactor this to use the Demographic model
    context.log(
      `MoresUpdateUserDemographic >>  Processing User Demographics ${user.email}`,
      {
        dob,
        businessUnit,
        gender,
        operationalGroup,
        position,
        region,
        race,
        team,
      },
      "debug",
      "Mores.UserResolver"
    );

    // sanity check
    //@ts-ignore
    if (user.memberships === null || user.memberships === undefined)
      user.memberships = [];

    let $business_unit: Reactory.Models.IBusinessUnitDocument = null;

    //make sure it is a string and has a length - process the business unit
    if (trim(businessUnit).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(businessUnit) === true) {
        $business_unit = await BusinessUnit.findById(businessUnit).then();
      }
    }
    let $membership: Reactory.Models.IMembershipDocument;

    //check if we have a role within the org
    if ($business_unit) {
      if (
        user.hasRole(
          context.partner._id.toString(),
          "USER",
          organization._id,
          $business_unit._id
        ) === false
      ) {
        if (
          user.hasRole(
            context.partner._id.toString(),
            "USER",
            organization._id
          ) === true
        ) {
          //update this membership and link the person the business unit.
          $membership = user.getMembership(
            context.partner._id.toString(),
            organization._id
          );
          $membership.businessUnitId = $business_unit._id;
          await user.updateMembership($membership);
        }
      } else {
        $membership = user.getMembership(
          context.partner._id,
          organization._id,
          $business_unit._id
        );
      }
    } else {
      if (
        user.hasRole(
          context.partner._id.toString(),
          "USER",
          organization._id
        ) === true
      ) {
        //update this membership and link the person the business unit.
        $membership = user.getMembership(
          context.partner._id.toString(),
          organization._id
        );
      }
    }

    if ($membership === null) {
      //use the addRole interface to add the user role
      const $memberships = await user
        .addRole(
          context.partner._id.toString(),
          "USER",
          organization._id,
          $business_unit && $business_unit._id
            ? $business_unit._id.toString()
            : null
        )
        .then();
      $membership = user.getMembership(
        context.partner._id,
        organization._id,
        $business_unit && $business_unit._id ? $business_unit._id : null
      );

      if (
        $memberships.length === 0 ||
        $membership === null ||
        $membership === undefined
      ) {
        //sanity check
        context.log(
          `WARNING: membership should have a length of at least 1`,
          {},
          "warning",
          "Mores.UserResolver"
        );
        throw new ApiError(
          "User should have memberships, something went wrong"
        );
      }
    }

    let $membership_id = $membership._id;

    let $gender: Reactory.Models.IDemographicDocument = null;
    let $race: Reactory.Models.IDemographicDocument = null;
    let $position: Reactory.Models.IDemographicDocument = null;
    let $operationalGroup: Reactory.Models.IDemographicDocument = null;
    let $region: Reactory.Models.IRegionDocument = null;
    let $team: Reactory.Models.ITeamDocument = null;

    //set them if have 'em bois 🚬
    if (trim(gender).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(gender) === true) {
        $gender = await Demographic.findById(gender).then();
      }
    }

    if (trim(race).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(race) === true) {
        $race = await Demographic.findById(race).then();
      }
    }

    if (trim(position).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(position) === true) {
        $position = await Demographic.findById(position).then();
      }
    }
    // if (position && position.length > 0) {
    //   $position = find(all_demographics, { type: 'position', key: position.toLowerCase() });
    // }

    if (trim(operationalGroup).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(position) === true) {
        $operationalGroup = await Demographic.findById(operationalGroup).then();
      }
    }

    if (trim(region).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(region) === true) {
        $region = await Region.findById(region).then();
      }
    }

    if (trim(team).length > 0) {
      //check if it is an id
      if (ObjectId.isValid(team) === true) {
        $team = await Team.findById(team).then();
      }
    }

    try {
      const query = { user: user._id, organization: organization._id };

      let doc = await UserDemographic.findOne(query).then();
      if (doc === null || doc === undefined) {
        context.log(
          `User does not have document matching params, creatintg a new entry for user ${user.email}`,
          {},
          "debug",
          "Mores.UserResolver"
        );
        doc = new UserDemographic({
          membership: $membership_id,
          organization: organization._id,
          user: user._id,
          gender: $gender && $gender._id ? $gender._id : null,
          race: $race && $race._id ? $race._id : null,
          position: $position && $position._id ? $position._id : null,
          operationalGroup:
            $operationalGroup && $operationalGroup._id
              ? $operationalGroup._id
              : null,
          region: $region && $region._id ? $region._id : null,
          businessUnit:
            $business_unit && $business_unit._id ? $business_unit._id : null,
          team: $team && $team._id ? $team._id : null,
        });
      } else {
        context.log(
          `User document found updating user demographics for user ${user.email}`,
          {},
          "debug",
          "Mores.UserResolver"
        );
        doc.gender = $gender && $gender._id ? $gender._id : null;
        doc.race = $race && $race._id ? $race._id : null;
        doc.position = $position && $position._id ? $position._id : null;
        doc.operationalGroup =
          $operationalGroup && $operationalGroup._id
            ? $operationalGroup._id
            : null;
        doc.region = $region && $region._id ? $region._id : null;
        doc.businessUnit =
          $business_unit && $business_unit._id ? $business_unit._id : null;
        doc.team = $team && $team._id ? $team._id : null;
      }

      await user.save().then();
      await doc.save().then();
      return doc;
    } catch (error) {
      throw new ApiError(`User demographic not saved due to ${error}`);
    }
  }

  /**
   * Creates
   * @param userInput
   * @param organization
   */
  async createUser(
    userInput: Reactory.Models.IUserCreateParams,
    organization?: Reactory.Models.IOrganizationDocument,
    businessUnit?: Reactory.Models.IBusinessUnitDocument,
    teams?: Reactory.Models.ITeamDocument[],
    partner?: Reactory.Models.IReactoryClientDocument,
  ): Promise<Reactory.Models.IUserDocument> {
    const result = await this.createUserForOrganization(
      userInput,
      userInput?.password ? userInput.password : crypto.randomBytes(16).toString("hex"),
      organization,
      userInput?.roles ? userInput.roles : ["USER"],
      "LOCAL",
      partner || this.context.partner,
      businessUnit
    );

    // if the user was added successfully,
    if (businessUnit && businessUnit._id && result.user) { 
      if (!businessUnit.members) { 
        businessUnit.members = [];
      }
      // add the user to business unit 
      // check if the business unit already has the user member
      const hasMember = businessUnit.members.includes(result.user._id);
      if (!hasMember) {
        businessUnit.members.push(result.user._id);
        await businessUnit.save();
      }
    }

    if (teams && teams.length > 0 && result.user) {
      // add the user to the teams
      for (const team of teams) {
        if (!team.members) {
          team.members = [];
        }
        team.members.push(result.user._id);
        await team.save();

        if (!result.user.teamMemberships) {
          result.user.teamMemberships = [];
        }

        // check if the user is already a member of the team
        const hasMembership = result.user.teamMemberships.includes(team._id);
        if (!hasMembership) {
          result.user.teamMemberships.push(team._id);
          await result.user.save();
        }
      }
    }

    return result.user || null;
  }

  async updateUser(
    userInput: Reactory.Models.IUser
  ): Promise<Reactory.Models.IUserDocument> {
    // load the user by id
    const user = await this.findUserById(userInput.id);
    if (!user) {
      throw new RecordNotFoundError(`User with id ${userInput.id} not found`);
    }
    // update the user properties
    user.firstName = userInput.firstName || user.firstName;
    user.lastName = userInput.lastName || user.lastName;
    user.email = userInput.email || user.email;
    user.username = userInput.username || user.username;
    user.active = userInput.active !== undefined ? userInput.active : user.active;
    user.dateOfBirth = userInput.dateOfBirth || user.dateOfBirth;
    user.mobileNumber = userInput.mobileNumber || user.mobileNumber;
    user.avatar = userInput.avatar || user.avatar;

    // check if the avatar is a valid URL or base64 string
    if (userInput.avatar && !/^https?:\/\//.test(userInput.avatar) && !/^data:image\//.test(userInput.avatar)) {
      throw new ApiError("Invalid avatar URL or base64 string");
    }

    // if the avatar is a base64 string save it as a file
    // for the user profile
    if (userInput.avatar && /^data:image\//.test(userInput.avatar)) {
      const base64Data = userInput.avatar.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const fileName = `${user._id.toString()}.png`;
      const filePath = path.join(Constants.env.APP_DATA_ROOT, 'profiles', userInput.id, fileName);
      
      // save the file to the CDN
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, buffer);
      user.avatar = fileName; // save the file path to the user
    }

    // save the user
    try {
      const updatedUser = await user.save();
      this.context.log(`User ${user.email} updated successfully`, {}, 'info');
      return updatedUser;
    } catch (error) {
      this.context.error(`Error updating user ${user.email}: ${error.message}`, {}, 'error');
      throw new ApiError(`Error updating user: ${error.message}`);
    }
  }

  async findUserWithEmail(
    email: string
  ): Promise<Reactory.Models.IUserDocument> {
    return User.findOne({ email });
  }

  async findUserById(
    id: string | ObjectId
  ): Promise<Reactory.Models.IUserDocument> {
    return User.findById(new ObjectId(id));
  }

  async onStartup(): Promise<any> {    
    return Promise.resolve(true);
  }

  @roles(["ADMIN"])
  async removeUserMembership(
    userId: string | ObjectId,
    membershipId: string | ObjectId
  ): Promise<Reactory.Models.CoreSimpleResponse> {
    try {
      if (!userId || !membershipId) {
        throw new ApiError("Invalid user or membership id");
      }

      const user: Reactory.Models.IUserDocument = await User.findById(userId);
      if (!user) {
        throw new ApiError("User not found");
      }

      user.memberships.remove(membershipId);
      await user.save();

      return {
        success: true,
        message: "Membership removed",
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(
    executionContext: Reactory.Server.IReactoryContext
  ): boolean {
    this.context = executionContext;
    return true;
  }

  async initializeSystemUser(): Promise<Reactory.Models.IUserDocument>{
    const { 
      REACTORY_APPLICATION_EMAIL = 'system@localhost',
      REACTORY_APPLICATION_PASSWORD = strongRandom(16),
    } = process.env;

    const { context } = this;
  
    if (!REACTORY_APPLICATION_EMAIL || !REACTORY_APPLICATION_PASSWORD) {
      context.error('[ConfigurationError] System user email or password not set. Cannot continue system user initialization.'
        + 'Please check REACTORY_APPLICATION_EMAIL and REACTORY_APPLICATION_PASSWORD configuration values');
      throw new RecordNotFoundError('System user email or password not set. Cannot continue system user initialization.');
    }
    
    const { log } = context;
  
    const reactoryConfig = find(clients, { key: 'reactory' });
    if(!reactoryConfig) {
      log(`[ClientConfigurationError] Reactory client configuration not found. Cannot continue system user initialization.`);
      throw new RecordNotFoundError('Reactory client configuration not found. Cannot continue system user initialization.');
    }
  
    let reactoryClient = await ReactoryClient.findOne({ key: 'reactory' }).exec();
    if(isNil(reactoryClient) === true) { 
      // @ts-ignore
      reactoryClient = await ReactoryClient.upsertFromConfig(reactoryConfig);
      if(isNil(reactoryClient)) {
        log(`[ClientConfigurationError] Reactory client configuration not found. Cannot continue system user initialization.`);
        process.exit(1);
      }
    }
  
    log(`Initializing system user ${REACTORY_APPLICATION_EMAIL}...`, {}, 'info');
  
    //@ts-ignore
    let user: Reactory.Models.IUserDocument = await User.findOne({ email: REACTORY_APPLICATION_EMAIL }).exec();
  
    if(user) {
      log('Initial user already exists', {}, 'warning');
      return user;
    }
  
    //@ts-ignore
    user = new User({
      email: REACTORY_APPLICATION_EMAIL,
      password: "",
      firstName: 'Reactory',
      lastName: 'System',
      memberships: [],
      username: 'reactory',
      salt: strongRandom(16),
      createdAt: new Date(),
      updatedAt: new Date(),
      active: true,
      dateOfBirth: new Date(),
    });
  
    user.setPassword(REACTORY_APPLICATION_PASSWORD);
    user.addRole(reactoryClient._id.toString(),'SYSTEM');
    await user.save();
  
    log(`System user initialized successfully`, {}, 'info');

    return user;
  }

  // List all users
  async listAllUsers(): Promise<Reactory.Models.IUserDocument[]> {
    return (await User.find({}).exec()) as unknown as Reactory.Models.IUserDocument[];
  }

  // Search users by email (regex) and sort
  async searchUser(searchString: string, sort: string = 'email'): Promise<Reactory.Models.IUserDocument[]> {
    return (await User.find({ email: { $regex: searchString, $options: 'i' } })
      .sort(`-${sort}`)
      .exec()) as unknown as Reactory.Models.IUserDocument[];
  }

  // Find organization by ID
  async findOrganizationById(organizationId: string): Promise<Reactory.Models.IOrganizationDocument> {
    return (await Organization.findById(organizationId).exec()) as unknown as Reactory.Models.IOrganizationDocument;
  }

  // Update user profile
  async updateUserProfile(id: string, profileData: any): Promise<Reactory.Models.IUserDocument> {
    return (await User.findByIdAndUpdate(id, profileData, { new: true }).exec()) as unknown as Reactory.Models.IUserDocument;
  }

  // Set user password
  async setUserPassword(userId: string, password: string, authToken?: string): Promise<Reactory.Models.IUserDocument> {
    const user = await User.findById(userId).exec() as Reactory.Models.IUserDocument;
    if (!user) throw new ApiError('User not found');
    if (typeof user.setPassword === 'function') {
      user.setPassword(password);
    } else {
      throw new ApiError('User model does not support setPassword');
    }
    return (await user.save()) as unknown as Reactory.Models.IUserDocument;
  }

  // Delete user (soft delete)
  async deleteUser(id: string): Promise<boolean> {
    const user = await User.findById(id).exec() as Reactory.Models.IUserDocument;
    if (!user) throw new ApiError('User not found');
    user.deleted = true;
    await user.save();
    return true;
  }

  static reactory: Reactory.Service.IReactoryServiceDefinition<UserService> = {
    id: "core.UserService@1.0.0",
    nameSpace: "core",
    name: "UserService",
    version: "1.0.0",
    description: "The core default user service",
    service: (props, context) => {
      return new UserService(props, context);
    },
    dependencies: [{
      id: "core.ReactoryModelRegistry@1.0.0",
      alias: "modelRegistry"
    }],
    serviceType: "user",
  };
}

export default UserService;
