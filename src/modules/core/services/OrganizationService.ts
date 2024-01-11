import { existsSync, mkdirSync, writeFileSync } from 'fs';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import Reactory from '@reactory/reactory-core';
// import Organization from '@reactory/server-modules/core/models/Organization';
// import BusinessUnit from '@reactory/server-modules/core/models/BusinessUnit';
// import Team from '@reactory/server-modules/core/models/Team';
import ApiError, { OrganizationNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import { trim } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators';

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
  @roles(['USER'])
  async findBusinessUnit(organization_id: string | number | ObjectId, search: string | number | ObjectId): Promise<Reactory.Models.IBusinessUnitDocument> {

    if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);

    const BusinessUnit = this.modelService.getModel<Reactory.Models.IBusinessUnitDocument>({ nameSpace: 'core', name: 'BusinessUnit', version: '1.0.0' });

    let $business_unit: Reactory.Models.IBusinessUnitDocument = null;
    if (typeof search === "string") {
      if (trim(search).length > 0) { 
        if(ObjectId.isValid(search) === false) {
          let count = await BusinessUnit.count({ organization: new ObjectId(organization_id), name: search.trim() }).then()
          if(count === 0) return null;
          else {
            let units = await BusinessUnit.find({ organization: new ObjectId(organization_id), name: search.trim() }).then()
            $business_unit = units[0];
          }  
        }
      }
    } else {
      if (ObjectId.isValid(search) === true) {
        $business_unit = await BusinessUnit.findById(search).then();
      }
    }
    
    return $business_unit;    
  }

  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN'])
  async createBusinessUnit(organization_id: string | number | ObjectId, name: string): Promise<Reactory.Models.IBusinessUnitDocument> {
    
    const BusinessUnit = this.modelService.getModel<Reactory.Models.IBusinessUnitDocument>({ nameSpace: 'core', name: 'BusinessUnit', version: '1.0.0' });

    // add a new business unit if we do not find any matches
      let $now = Date.now();
      let $business_unit = new BusinessUnit({
        _id: new ObjectId(),
        organization: new ObjectId(organization_id),
        name: name.trim(),
        createdAt: $now,
        updatedAt: $now,
        deleted: false,
        owner: this.context.user._id
      });

      await $business_unit.save().then()

      return $business_unit;

  }


  /***
  * Finds a business unit 
  */
 @roles(['USER'])
  async findTeam(organization_id: string | number | ObjectId, search: string | number | ObjectId): Promise<Reactory.Models.ITeamDocument> {

    if (ObjectId.isValid(organization_id) === false) throw new ApiError(`param organization_id is not a valid ${organization_id}`);

   const Team = this.modelService.getModel<Reactory.Models.ITeamDocument>({ nameSpace: 'core', name: 'Team', version: '1.0.0' });

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

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN'])
  async createTeam(organization_id: string | number | ObjectId, name: string): Promise<Reactory.Models.ITeamDocument> {

    const Team = this.modelService.getModel<Reactory.Models.ITeamDocument>({ nameSpace: 'core', name: 'Team', version: '1.0.0' });
    // add a new business unit if we do not find any matches
    let $now = Date.now();
    let $business_unit = new Team({
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

    await $business_unit.save().then()

    return $business_unit;
  }  

  @roles(['USER', 'ANON'])
  async findWithName(name: string): Promise<Reactory.Models.IOrganizationDocument> {
    this.context.log(`Seaching for organization by name: ${name}`, {}, 'debug', 'OrganizationService')
    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });
    return await Organization.findOne({ name }).then();
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN'])
  async create(name: string): Promise<Reactory.Models.IOrganizationDocument> {
    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });
    const organization = new Organization({ name });
    await organization.save();

    return organization;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN'])
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

  @roles(['ORGANIZATION_ADMIN', 'ADMIN'])
  async setOrganization(id: string, updates: { name?: string; code?: string; color?: string; logo?: string; }): Promise<Reactory.Models.IOrganizationDocument> {
    const _id = new ObjectId(id);
    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });

    const exists = await Organization.count({ _id }).then() === 1;

    if (exists === false) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`);

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

  @roles(['ORGANIZATION_ADMIN', 'ADMIN'])
  async uploadOrganizationImage(id: string, file: Reactory.Service.IFile, imageType: string): Promise<Reactory.Models.IOrganizationDocument> {


    if (!id) {
      throw new ApiError('Cannot upload image for null id')
    }

    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });

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
    const sortBy = sort || 'name';

    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });
    
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
      .then();

  }

  @roles(['USER'])
  async getPagedOrganizationsForLoggedInUser(search: string, sort: string, direction: string = 'asc', paging: Reactory.Models.IPagingRequest): Promise<Reactory.Models.IOrganizationDocument[]> {

    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });

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
    const Organization = this.modelService.getModel<Reactory.Models.IOrganizationDocument>({ nameSpace: 'core', name: 'Organization', version: '1.0.0' });
    return await Organization.findById(id).then();
  }

  onStartup(): Promise<void> {
    // nothing to do
    this.context.log(`Core OrganizationService started 🟢`)
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