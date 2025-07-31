import { existsSync, mkdirSync, writeFileSync } from 'fs';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import Reactory from '@reactory/reactory-core';
import { 
  Organization,
  BusinessUnit,
  Team,
  User,
} from '@reactory/server-modules/reactory-core/models'
import ApiError, { OrganizationNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import { trim } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators';
import { service } from '@reactory/server-core/application/decorators/service';
import { businessUnitUISchema } from 'build/server/reactory/minikube/data/plugins/reactory-client-core/src/components/User/Forms/MyPersonalDemographics/uiSchema';


@service({
  id: 'core.OrganizationService@1.0.0',
  name: 'ReactoryOrganizationService',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Default Organization Service.',
  serviceType: 'organization',
  lifeCycle: 'singleton',
  dependencies: [
    { id: 'core.ReactoryModelRegistry@1.0.0', alias: 'modelService' }
  ],
})
class OrganizationService implements Reactory.Service.IReactoryOrganizationService {

  name: string = 'OrganizationService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  context: Reactory.Server.IReactoryContext;
  props: any;

  modelService: Reactory.Service.TReactoryModelRegistryService;

  constructor(props: any, context: any) {
    this.context = context;

  }

  /***
   * Finds a business unit 
   */
  //@roles(['USER', 'SYSTEM'])
  async findBusinessUnit(organization_id: string | number | ObjectId, search: string | number | ObjectId): Promise<Reactory.Models.IBusinessUnitDocument> {

    if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);  
    if (typeof search === "string") {
      if (trim(search).length > 0) { 
        if(ObjectId.isValid(search) === false) {          
            return await BusinessUnit.findOne({ 
            organization: new ObjectId(organization_id), 
            name: { $regex: `^${search.trim()}$`, $options: 'i' }
            }).then()
        } else { 
          return await BusinessUnit.findOne({
            organization: new ObjectId(organization_id), 
            _id: new ObjectId(search)
          }).then()
        }        
      }
    } else {
      if (ObjectId.isValid(search) === true) {
        return await BusinessUnit.findById(search).then();
      }
    }
    
    return null; 
  }

  async findBusinessUnitById(id: string | number | ObjectId): Promise<Reactory.Models.IBusinessUnitDocument> {
    return await BusinessUnit.findById(id, {
      id: 1,
      name: 1,
      description: 1,
      avatar: 1,
      createdAt: 1,
      updatedAt: 1,
      deleted: 1,
      owner: 1,
      members: 1,
      organization: 1,
    }).then();
  }

  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async createBusinessUnit(organization_id: string | number | ObjectId, name: string): Promise<Reactory.Models.IBusinessUnitDocument> {
    
      if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);

      // check if the business unit already exists
      let $business_unit = await this.findBusinessUnit(organization_id, name);
      if ($business_unit) {
        throw new ApiError(`Business Unit with name ${name} already exists in organization ${organization_id}`, 400);
      }

      const organization = await Organization.findById<Reactory.Models.IOrganizationDocument>(organization_id, {
        id: 1,
        name: 1,
        description: 1,
        businessUnits: 1,
        teams: 1,
        createdAt: 1,
        updatedAt: 1,
        deleted: 1,
      }, { 
        populate: ['businessUnits', 'teams']
      }).then();
      if (!organization) {
        throw new OrganizationNotFoundError(`Organization with id ${organization_id} not found`, `${organization_id}`);
      }

    // add a new business unit if we do not find any matches
      let $now = Date.now();
      $business_unit = new BusinessUnit({        
        organization: new ObjectId(organization_id),
        name: name.trim(),
        createdAt: $now,
        updatedAt: $now,
        deleted: false,
        owner: this.context.user._id
      });
      await $business_unit.save().then();
      if (!organization.businessUnits) organization.businessUnits = [];
      organization.businessUnits.push($business_unit);      
      await organization.save().then();      
      return $business_unit;

  }


  /***
  * Finds a business unit 
  */
 // @roles(['USER', 'SYSTEM'])
  async findTeam(organization_id: string | number | ObjectId, search: string | number | ObjectId): Promise<Reactory.Models.ITeamDocument> {

    if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);

    let $team: Reactory.Models.ITeamDocument = null;
    if (typeof search === "string") {
      if (trim(search).length > 0) {
        const qry = { organization: new ObjectId(organization_id), name: search.trim() }
        if (ObjectId.isValid(search) === false) {
          let count = await Team.count(qry);
          if(count === 0) return null;

          let units = await Team.find(qry).then()
          $team = units[0]
        }
      }
    } else {
      if (ObjectId.isValid(search) === true) {
        $team = await Team.findById(search).then();
      }
    }

    return $team;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async createTeam(organization_id: string | number | ObjectId, name: string): Promise<Reactory.Models.ITeamDocument> {
    
    if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);

    // check if the team already exists
    let $team = await this.findTeam(organization_id, name);
    if ($team) {
      throw new ApiError(`Team with name ${name} already exists in organization ${organization_id}`, 400);
    }

    const organization = await Organization.findById<Reactory.Models.IOrganizationDocument>(organization_id, {
      id: 1,
      name: 1,
      description: 1,
      businessUnits: 1,
      teams: 1,
      createdAt: 1,
      updatedAt: 1,
      deleted: 1,
    }, { 
      populate: ['businessUnits', 'teams']
    }).then();
    if (!organization) {
      throw new OrganizationNotFoundError(`Organization with id ${organization_id} not found`, `${organization_id}`);
    }

    // add a new business unit if we do not find any matches
    let $now = Date.now();
    $team = new Team({
      _id: new ObjectId(),
      organization: new ObjectId(organization_id),
      title: name.trim(),
      name: name.trim(),
      members: [],
      createdAt: $now,
      updatedAt: $now,
      deleted: false,
      owner: this.context.user._id
    });
    organization.teams = organization.teams || [];
    organization.teams.push($team);
    $team.organization = organization._id;
    $team.createdBy = this.context.user._id;
    $team.updatedBy = this.context.user._id;    
    await $team.save().then();
    await organization.save().then()

    return $team as Reactory.Models.ITeamDocument;
  }

  @roles(['USER', 'SYSTEM'])
  async getPagedTeamsForOrganization(
    organization_id?: string | number | ObjectId, 
    filter?: any, 
    paging?: Reactory.Models.IPagingRequest
  ): Promise<{ teams: Reactory.Models.ITeamDocument[], paging: Reactory.Models.IPagingResult }> {
    
    const dbQuery: any = { deleted: { $ne: true } };
    
    // Add organization filter only if organization_id is provided and valid
    if (organization_id && ObjectId.isValid(organization_id)) {
      dbQuery.organization = new ObjectId(organization_id);
    }
    
    if (filter) {
      if (filter.search) {
        dbQuery.$or = [
          { name: new RegExp(filter.search, 'i') },
          { title: new RegExp(filter.search, 'i') }
        ];
      }
      if (filter.owner) {
        dbQuery.owner = new ObjectId(filter.owner);
      }
      if (filter.member) {
        dbQuery.members = new ObjectId(filter.member);
      }
      if (filter.createdBefore) {
        dbQuery.createdAt = { ...dbQuery.createdAt, $lte: new Date(filter.createdBefore) };
      }
      if (filter.createdAfter) {
        dbQuery.createdAt = { ...dbQuery.createdAt, $gte: new Date(filter.createdAfter) };
      }
      if (filter.updatedBefore) {
        dbQuery.updatedAt = { ...dbQuery.updatedAt, $lte: new Date(filter.updatedBefore) };
      }
      if (filter.updatedAfter) {
        dbQuery.updatedAt = { ...dbQuery.updatedAt, $gte: new Date(filter.updatedAfter) };
      }
    }

    const page = paging?.page || 1;
    const pageSize = paging?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const [teams, total] = await Promise.all([
      Team.find(dbQuery)
        .populate('owner')
        .populate('members')
        .skip(skip)
        .limit(pageSize)
        .then(),
      Team.countDocuments(dbQuery).then(),
    ]);

    return {
      teams,
      paging: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
        hasNext: (page * pageSize) < total,
      },
    };
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async updateTeam(team_id: string | number | ObjectId, updates: any): Promise<Reactory.Models.ITeamDocument> {
    
    if (ObjectId.isValid(team_id) === false) throw new ApiError(`param team_id is not a valid ${team_id}`);

    const team = await Team.findById(team_id).then();
    if (!team) {
      throw new ApiError(`Team with id ${team_id} not found`, 404);
    }

    // Update fields
    if (updates.name) team.name = updates.name.trim();
    if (updates.title) team.title = updates.title.trim();
    if (updates.description) team.description = updates.description;
    if (updates.avatar) team.avatar = updates.avatar;

    team.updatedAt = Date.now();
    team.updatedBy = this.context.user._id;

    await team.save().then();
    return team;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async addMemberToTeam(team_id: string | number | ObjectId, member_id: string | number | ObjectId): Promise<boolean> {
    
    if (ObjectId.isValid(team_id) === false) throw new ApiError(`param team_id is not a valid ${team_id}`);
    if (ObjectId.isValid(member_id) === false) throw new ApiError(`param member_id is not a valid ${member_id}`);

    const team = await Team.findById(team_id).then();
    if (!team) {
      throw new ApiError(`Team with id ${team_id} not found`, 404);
    }

    const user = await User.findById(member_id).then();
    if (!user) {
      throw new ApiError(`User with id ${member_id} not found`, 404);
    }

    // Check if user is already a member
    if (team.members && team.members.includes(user._id)) {
      return true; // Already a member
    }

    team.members = team.members || [];
    team.members.push(user._id);
    team.updatedAt = Date.now();
    team.updatedBy = this.context.user._id;

    await team.save().then();
    return true;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async removeMemberFromTeam(team_id: string | number | ObjectId, member_id: string | number | ObjectId): Promise<boolean> {
    
    if (ObjectId.isValid(team_id) === false) throw new ApiError(`param team_id is not a valid ${team_id}`);
    if (ObjectId.isValid(member_id) === false) throw new ApiError(`param member_id is not a valid ${member_id}`);

    const team = await Team.findById(team_id).then();
    if (!team) {
      throw new ApiError(`Team with id ${team_id} not found`, 404);
    }

    const user = await User.findById(member_id).then();
    if (!user) {
      throw new ApiError(`User with id ${member_id} not found`, 404);
    }

    // Remove user from members array
    if (team.members) {
      team.members = team.members.filter((memberId: any) => !memberId.equals(user._id));
      team.updatedAt = Date.now();
      team.updatedBy = this.context.user._id;
      await team.save().then();
    }

    return true;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async deleteTeam(team_id: string | number | ObjectId): Promise<boolean> {
    
    if (ObjectId.isValid(team_id) === false) throw new ApiError(`param team_id is not a valid ${team_id}`);

    const team = await Team.findById(team_id).then();
    if (!team) {
      throw new ApiError(`Team with id ${team_id} not found`, 404);
    }

    // Soft delete
    team.deleted = true;
    team.updatedAt = Date.now();
    team.updatedBy = this.context.user._id;

    await team.save().then();
    return true;
  }
  
  async findWithName(name: string): Promise<Reactory.Models.IOrganizationDocument> {
    this.context.log(`Seaching for organization by name: ${name}`, {}, 'debug', 'OrganizationService')    
    return await Organization.findOne(
      { name: { $regex: `^${name}$`, $options: 'i' } },
      { 
        id: 1,
        name: 1,
        code: 1,
        description: 1,
        logo: 1,
        avatar: 1,
        color: 1,
        createdAt: 1,
        updatedAt: 1,
        deleted: 1,
        businessUnits: 1,
        teams: 1
      },
      {
        populate: ['businessUnits', 'teams']
      }).then();
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async create(name: string): Promise<Reactory.Models.IOrganizationDocument> {    
    const organization = new Organization({ name });
    await organization.save();

    return organization as Reactory.Models.IOrganizationDocument;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async updateOrganizationLogo(organization: Reactory.Models.IOrganizationDocument, imageData: string): Promise<Reactory.Models.IOrganizationDocument> {
    try {      
      const {
        APP_DATA_ROOT,
      } = process.env;

      const isPng = imageData.startsWith('data:image/png');
      const buffer = Buffer.from(imageData.split(/,\s*/)[1], 'base64');
      if (!existsSync(`${APP_DATA_ROOT}/organization`)) mkdirSync(`${APP_DATA_ROOT}/organization`);
      const path = `${APP_DATA_ROOT}/organization/${organization._id}/`;

      if (!existsSync(path)) mkdirSync(path);
      const filename = `${APP_DATA_ROOT}/organization/${organization._id}/logo_${organization._id}_default.${isPng === true ? 'png' : 'jpeg'}`;

      // if (isPng === true) {
      //  logger.info(`Converting logo for ${organization} from png to jpg`);
      //  pngToJpeg({ quality: 70 })(buffer).then(output => writeFileSync(filename, output));
      // } else writeFileSync(filename, buffer);

      writeFileSync(filename, buffer);
      return organization

    } catch (organizationLogoUpdate) {
      return organization;
    }
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async setOrganization(id: string, updates: { name?: string; code?: string; color?: string; logo?: string; }): Promise<Reactory.Models.IOrganizationDocument> {
    const _id = new ObjectId(id);
    const exists = await Organization.count({ _id }).then() === 1;

    if (exists === false) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);

    let organization: Reactory.Models.IOrganizationDocument = await Organization.findById(_id).then();
    const inputData = {
      name: updates.name || organization.name,
      code: updates.code || organization.code,
    };

    if (updates.color) {
      organization.setSetting('color', { primary: updates.color, secondary: updates.color }, 'core.MaterialThemeColorPicker');
    }

    if (organization && organization._id) {
      organization.code = inputData.code;
      organization.name = inputData.name;

      if (updates.logo) {
        try {
          organization = await this.updateOrganizationLogo(organization, updates.logo);
        } catch (logoError) {
          logger.warn('Could not update the organization logo');
        }
      }
      organization.createdAt = organization.createdAt || moment().valueOf();
      organization.updatedAt = moment().valueOf();
      await organization.save().then();

      return organization;
    }
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async uploadOrganizationImage(id: string, file: Reactory.Service.IFile, imageType: string): Promise<Reactory.Models.IOrganizationDocument> {

    if (!id) {
      throw new ApiError('Cannot upload image for null id')
    }

    const organization = await Organization.findById(id).then();

    if (!organization) throw new ApiError(`Organization with id ${id} not found`);


    let virtualPath = `/organization/${organization._id}/`;
    let filename = `${imageType}_${organization._id}_default`;

    const fileSvc: Reactory.Service.IReactoryFileService = this.context.getService('core.ReactoryFileService@1.0.0');

    const reactoryFile: Reactory.Models.IReactoryFile = await fileSvc.uploadFile({
      catalog: false,
      file: file,
      rename: false,
      filename,
      isUserSpecific: false,
      uploadContext: `mores::organization::${organization._id}::logo`,
      virtualPath
    }).then();

    if (reactoryFile.id && reactoryFile.hash) {
      if (imageType === 'logo') organization.logo = reactoryFile.alias;
      if (imageType === 'avatar') organization.avatar = reactoryFile.alias;
    }

    organization.save();

    return organization;
  }

  @roles(['USER'])
  async getOrganizationsForLoggedInUser(search: string, sort: string, direction: string = 'asc'): Promise<Reactory.Models.IOrganizationDocument[]> {
    const { user, partner } = this.context;
    const sortByf = sort || 'name';
  
    if (user.hasAnyRole(partner._id) === false) return [];

    if (
      user.hasRole(partner._id, 'ADMIN') === true ||
      user.hasRole(partner._id, 'DEVELOPER')
    ) {
      return Organization.find({}).sort(direction).then();
    }

    const _membershipOrganizationIds: any[] = [];
    this.context.user.memberships.forEach((membership) => {
      if (
        membership.organizationId &&
        membership.clientId.equals(partner._id) &&
        _membershipOrganizationIds.indexOf(membership.organizationId) < 0
      ) {
        _membershipOrganizationIds.push(membership.organizationId);
      }
    });

    // collect all my membership organizations
    return Organization.find({ _id: { $in: _membershipOrganizationIds } })
      .sort(sortByf)
      .then();

  }

  @roles(['USER'])
  async getPagedOrganizationsForLoggedInUser(search: string, sort: string, direction: string = 'asc', paging: Reactory.Models.IPagingRequest): Promise<Reactory.Models.IOrganizationDocument[]> {

    const { user, partner } = this.context;
    const sortBy = sort || 'name';

    if (user.hasAnyRole(partner._id) === false) return [];

    if (
      user.hasRole(partner._id, 'ADMIN') === true ||
      user.hasRole(partner._id, 'DEVELOPER')
    ) {
      return Organization.find({}).sort(direction).then();
    }

    const _membershipOrganizationIds: any[] = [];
    this.context.user.memberships.forEach((membership) => {
      if (
        membership.organizationId &&
        membership.clientId.equals(partner._id) &&
        _membershipOrganizationIds.indexOf(membership.organizationId) < 0
      ) {
        _membershipOrganizationIds.push(membership.organizationId);
      }
    });

    // collect all my membership organizations
    return Organization.find({ _id: { $in: _membershipOrganizationIds } })
      .sort(sortBy)
      .limit(paging.pageSize)
      .skip(paging.pageSize * paging.page)
      .then();

  }


  async get(id: string): Promise<Reactory.Models.IOrganizationDocument> {
    return await Organization.findById(id, {
      id: 1,
      name: 1,
      code: 1,
      description: 1,
      logo: 1,
      avatar: 1,
      color: 1,
      createdAt: 1,
      updatedAt: 1,
      deleted: 1,
      businessUnits: 1,
      teams: 1
    }, {
      populate: ['businessUnits', 'teams']
    }).then((organization) => {
      if (!organization) throw new OrganizationNotFoundError(`Organization with id ${id} not found`, `${id}`);
      return organization;
    }).then();
  }

  onStartup(): Promise<void> {
    this.context.log(`Core OrganizationService STARTUP OKAY`)
    //check that the organization folder on the file system exists
    const { APP_DATA_ROOT } = process.env;
    if (!existsSync(`${APP_DATA_ROOT}/organization`)) mkdirSync(`${APP_DATA_ROOT}/organization`);
    return Promise.resolve();
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): void {
    this.context = executionContext;
  }

  setModelService(modelService: Reactory.Service.TReactoryModelRegistryService): void {
    this.modelService = modelService;
  }
}

export const ReactoryOrganizationServiceDefinition: Reactory.Service.IReactoryServiceDefinition<OrganizationService> = {
  id: 'core.OrganizationService@1.0.0',
  name: 'ReactoryOrganization',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Default Organization Service.',
  dependencies: [
    {
      id: 'core.ReactoryModelRegistry@1.0.0',
      alias: 'modelService'
    }
  ],
  serviceType: "organization",
  service: (props: Reactory.Service.IReactoryServiceProps, context: any) => {
    return new OrganizationService(props, context);
  }
}

export default ReactoryOrganizationServiceDefinition