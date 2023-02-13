import Reactory from "@reactory/reactory-core";
import { ObjectId } from "bson";
import Organigram from "@reactory/server-core/models/schema/Organigram";
import Demographic from '@reactory/server-modules/core/models/demographics/Demographic';
import { BusinessUnit, Organization, Region, Team, User, UserDemographic } from '@reactory/server-core/models';
import ApiError, { RecordNotFoundError } from "@reactory/server-core/exceptions";
import { trim, filter, find, isNil } from 'lodash';
import { createUserForOrganization } from "@reactory/server-core/application/admin/User";
import crypto from 'crypto';
interface PeersState {
  [key: string]: Reactory.Models.IOrganigramDocument
}


//simple hashmap
interface PeersFetchingState {
  [key: string]: string
}

class UserService implements Reactory.Service.IReactoryUserService {

  name: string = "UserService";
  nameSpace: string = "core";
  version: string = "1.0.0";
  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;

  peerState: PeersState;
  isFetchingDocument: PeersFetchingState;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
    // contains any previously fetched documents using a key map
    this.peerState = {};
    // used to indicated whether or not we are fetching a document
    this.isFetchingDocument = {};
  }

  async getUserPeers(id: string | ObjectId, organization_id: string | ObjectId): Promise<Reactory.Models.IOrganigramDocument> {


    if (id === null) return null;
    if (organization_id === null) return null;

    const key = `${id}::${organization_id}`;

    if (this.peerState[key]) {
      this.context.log(`Found organigram data in service state: ${this.context.colors.green(key)} ✅`)
      return this.peerState[key];
    }

    this.context.log(`Organigram document not found fetching: ${this.context.colors.green(key)} ☎`)
    this.isFetchingDocument[key] = 'fetching';

    const query = {
      user: new ObjectId(id),
      organization: new ObjectId(organization_id),
    };

    const organigram: Reactory.IOrganigramDocument = await Organigram.findOne(query).then();


    if (!this.peerState[key]) {
      this.peerState[key] = organigram;
      this.isFetchingDocument[key] = 'fetched';
    }

    return this.peerState[key];
  }

/**
 * Sets the peers for a user after they have been validate.
 * @param { User } user
 * @param { Array<*>} peers
 * @param { Organization } organization
 */
async setPeersForUser (user: Reactory.IUserDocument, peers: any, organization: Reactory.IOrganizationDocument,allowEdit: boolean = true, confirmedAt: Date = new Date()): Promise<Reactory.IOrganigramDocument> { // eslint-disable-line max-len
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
      }).save().then();
    } else {
      organigram.peers = peers;
      organigram.updatedAt = new Date();
      organigram.confirmedAt = confirmedAt;
      organigram.allowEdit = allowEdit;
      return organigram.save().then();
    }
  });
};

  async setUserDemographics(userId: string, organisationId: string, membershipId?:
    string, dob?: Date, businessUnit?: string, gender?: string, operationalGroup?: string,
    position?: string, race?: string, region?: string, team?: string): Promise<Reactory.IUserDemographicDocument> {
    
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
      team
    });

    if (ObjectId.isValid(userId) === false) throw new ApiError('Bad user id - check format');
    if (ObjectId.isValid(organisationId) === false) throw new ApiError('Bad org id - check format');


    const organization = await Organization.findById(organisationId).then();

    if (organization === null) throw new RecordNotFoundError(`Organization ${organisationId} not found`);

    const user = await User.findById(new ObjectId(userId as string)).then();

    if (!user) throw new RecordNotFoundError(`User not found`);
    if(dob) user.dateOfBirth = dob;


    context.log(`MoresUpdateUserDemographic >>  Processing User Demographics ${user.email}`,
      { dob, businessUnit, gender, operationalGroup, position, region, race, team },
      'debug', 'Mores.UserResolver');

    // sanity check
    //@ts-ignore
    if (user.memberships === null || user.memberships === undefined) user.memberships = [];


    let $business_unit: Reactory.IBusinessUnitDocument = null;

    //make sure it is a string and has a length - process the business unit
    if (trim(businessUnit).length > 0) {
      //check if it is an id        
      if (ObjectId.isValid(businessUnit) === true) {
        $business_unit = await BusinessUnit.findById(businessUnit).then();
      } 
    }
    let $membership: Reactory.IMembership;

    //check if we have a role within the org
    if ($business_unit) {          
      if (user.hasRole(context.partner._id.toString(), 'USER', organization._id, $business_unit._id) === false) {
        if(user.hasRole(context.partner._id.toString(), 'USER', organization._id) === true) {
          //update this membership and link the person the business unit.
          $membership = user.getMembership(context.partner._id.toString(), organization._id);
          $membership.businessUnitId = $business_unit._id;
          await user.updateMembership($membership);
        }
      } else {
        $membership = user.getMembership(context.partner._id, organization._id, $business_unit._id);
      }
    } else {
      if (user.hasRole(context.partner._id.toString(), 'USER', organization._id) === true) {
        //update this membership and link the person the business unit.
        $membership = user.getMembership(context.partner._id.toString(), organization._id);        
      }
    }

    if($membership === null) {
      //use the addRole interface to add the user role
      const $memberships = await user.addRole(context.partner._id.toString(), 'USER', organization._id, $business_unit && $business_unit._id ? $business_unit._id.toString() : null).then();
      $membership = user.getMembership(context.partner._id, organization._id, $business_unit && $business_unit._id ? $business_unit._id : null);
      
      if ($memberships.length === 0 || $membership === null || $membership === undefined) //sanity check
      {
        context.log(`WARNING: membership should have a length of at least 1`, {}, 'warning', 'Mores.UserResolver');
        throw new ApiError('User should have memberships, something went wrong');
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
    
    debugger;
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
        context.log(`User does not have document matching params, creatintg a new entry for user ${user.email}`, {}, 'debug', 'Mores.UserResolver');
        doc = new UserDemographic({
          membership: $membership_id,
          organization: organization._id,
          user: user._id,
          gender: $gender && $gender._id ? $gender._id : null,          
          race: $race && $race._id ? $race._id : null,
          position: $position && $position._id ? $position._id : null,
          operationalGroup: $operationalGroup && $operationalGroup._id ? $operationalGroup._id : null,
          region: $region && $region._id ? $region._id : null,
          businessUnit: $business_unit && $business_unit._id ? $business_unit._id : null,
          team: $team && $team._id ? $team._id : null,
        });
      } else {
        context.log(`User document found updating user demographics for user ${user.email}`, {}, 'debug', 'Mores.UserResolver');
        doc.gender = $gender && $gender._id ? $gender._id : null;
        doc.race = $race && $race._id ? $race._id : null;
        doc.position = $position && $position._id ? $position._id : null;
        doc.operationalGroup = $operationalGroup && $operationalGroup._id ? $operationalGroup._id : null;
        doc.region = $region && $region._id ? $region._id : null;
        doc.businessUnit = $business_unit && $business_unit._id ? $business_unit._id : null;
        doc.team = $team && $team._id ? $team._id : null;
      }

      await user.save().then();
      await doc.save().then();
      return doc
    } catch (error) {
      throw new ApiError(`User demographic not saved due to ${error}`);
    }

  }

  /**
   * Creates 
   * @param userInput 
   * @param organization 
   */
  createUser(userInput: Reactory.Models.IUser, organization?: Reactory.Models.IOrganization): Promise<Reactory.Models.IUserDocument> {

    return createUserForOrganization(userInput, 
      crypto.randomBytes(16).toString('hex'), 
      organization, 
      ["USER"], 
      "LOCAL", 
      this.context.partner);
  }

  updateUser(userInput: Reactory.IUser): Promise<Reactory.IUserDocument> {
    throw new Error("Method not implemented.");
  }

  async findUserWithEmail(email: string): Promise<Reactory.IUserDocument> {
    return User.findOne({ email });
  }

  async findUserById(id: string | ObjectId): Promise<Reactory.IUserDocument> {
    return User.findById(id);
  }

  onStartup(): Promise<any> {
    this.context.log(`Reactory Core User Service: ${this.context.colors.green('STARTUP OKAY')} ✅`)
    return Promise.resolve();
  }


  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }


  static reactory: Reactory.IReactoryServiceDefinition = {
    id: 'core.UserService@1.0.0',
    description: 'The core default user service',
    service: (props, context) => {
      return new UserService(props, context)
    },
    name: 'User management service',
    dependencies: [],
    serviceType: "user"
  }
}

export default UserService;
