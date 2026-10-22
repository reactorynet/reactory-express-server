import { existsSync, mkdirSync } from 'fs';
import { Readable } from 'stream';
import moment from 'moment';
import { ObjectId } from 'mongodb';
import Reactory from '@reactorynet/reactory-core';
import { 
  Organization,
  BusinessUnit,
  Team,
  User,
  Organigram,
} from '@reactory/server-modules/reactory-core/models'
import ApiError, { BusinessUnitExistsError, InsufficientPermissions, OrganizationNotFoundError, RecordNotFoundError } from '@reactory/server-core/exceptions';
import logger from '@reactory/server-core/logging';
import { trim } from 'lodash';
import { roles } from '@reactory/server-core/authentication/decorators';
import { service } from '@reactory/server-core/application/decorators/service';
import { ThemeService } from './ThemeService';
import { seedOrganizationDemographics } from './demographics/seedOrganizationDemographics';

/**
 * Identity, lifecycle and branding fields accepted by `updateOrganization`.
 *
 * Every field is optional and follows the three-state contract documented on
 * `normalizeOptionalText`: omit to leave untouched, `null`/blank to clear, a
 * value to set. `settings`, `public` and `legacyId` use their native types.
 */
export interface IOrganizationUpdateInput {
  name?: string | null;
  code?: string | null;
  tradingName?: string | null;
  legalName?: string | null;
  description?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: string | null;
  theme?: string | null;
  themeMode?: string | null;
  public?: boolean | null;
  avatar?: string | null;
  logo?: string | null;
  color?: string | null;
  settings?: any[];
  legacyId?: number | string | null;
}

/** Counts shown on the organization dashboard. */
export interface IOrganizationStatistics {
  members: number;
  businessUnits: number;
  teams: number;
}

/**
 * Identity fields accepted by `updateBusinessUnit` (ORG-020).
 *
 * Every field is optional and follows the same three-state contract as
 * `IOrganizationUpdateInput`: omit to leave untouched, `null`/blank to clear,
 * a value to set. `name` is the exception - a business unit without a name is
 * unusable (it is the key callers match on), so clearing it is rejected.
 *
 * Membership is deliberately NOT here: `members` is maintained by
 * `addMemberToBusinessUnit` / `removeMemberFromBusinessUnit`, which also keep the
 * Organigram pointer and the organization membership in step. Replacing the
 * array through a generic update would silently desynchronise those records.
 */
export interface IBusinessUnitUpdateInput {
  name?: string | null;
  description?: string | null;
  avatar?: string | null;
  owner?: string | null;
}

/** Filter accepted by `pagedBusinessUnits`. */
export interface IBusinessUnitFilter {
  /** Matched case-insensitively against the name and description. */
  search?: string | null;
  /** Restrict to business units owned by this user id. */
  owner?: string | null;
  /** Restrict to business units this user id is a member of. */
  member?: string | null;
  /** Include soft-deleted rows. Defaults to false. */
  includeDeleted?: boolean | null;
  /** Return only soft-deleted rows. Implies `includeDeleted`. */
  deletedOnly?: boolean | null;
}

/** Paged business unit envelope. Mirrors `PagedOrganizations`. */
export interface IPagedBusinessUnits {
  paging: Reactory.Models.IPagingResult;
  businessUnits: Reactory.Models.IBusinessUnitDocument[];
}

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
export class OrganizationService implements Reactory.Service.IReactoryOrganizationService {

  name: string = 'OrganizationService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  context: Reactory.Server.IReactoryContext;
  props: any;

  modelService: Reactory.Service.TReactoryModelRegistryService;

  constructor(props: any, context: any) {
    this.context = context;

  }

  /**
   * Resolves the execution context that owns this call. Callers should pass
   * their request context explicitly; `this.context` remains the fallback for
   * legacy call sites and is, by design, the caller's context when resolved
   * through ServiceManager (singletons are exposed through a per-caller
   * facade).
   */
  private resolveExecutionContext(
    executionContext?: Reactory.Server.IReactoryContext
  ): Reactory.Server.IReactoryContext {
    const context = executionContext || this.context;
    if (!context) {
      throw new ApiError('An execution context is required to determine the acting user');
    }
    return context;
  }

  /**
   * Returns the id of the user performing the operation. An unresolved actor
   * is an error: silently attributing work to the system user is exactly the
   * defect this exists to prevent.
   */
  private resolveActorId(
    executionContext?: Reactory.Server.IReactoryContext
  ): any {
    const { user } = this.resolveExecutionContext(executionContext);
    if (!user || !user._id) {
      throw new ApiError('An authenticated user is required to determine the acting user');
    }
    return user._id;
  }

  /**
   * Normalises an optional text update so that "not supplied", "set" and
   * "clear" are three distinct outcomes.
   *
   * - `undefined` in  -> `undefined` out (field untouched)
   * - `null` in       -> `null` out (field cleared)
   * - blank string in -> `null` out (field cleared)
   * - anything else   -> trimmed string
   */
  private normalizeOptionalText(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = `${value}`.trim();
    return trimmed.length === 0 ? null : trimmed;
  }

  /**
   * Lifecycle states accepted by `updateOrganization`. Mirrors
   * `ORGANIZATION_STATUSES` on the Organization model; kept local so the
   * service does not depend on model-module exports that tests replace.
   */
  private static readonly STATUSES: string[] = ['active', 'suspended', 'archived'];

  /** Theme modes accepted by `updateOrganization` (mirrors the model enum). */
  private static readonly THEME_MODES: string[] = ['light', 'dark', 'os'];

  /**
   * Resolves the partner (ReactoryClient) id used for role evaluation.
   * Roles are always evaluated against the caller's partner, never globally.
   */
  private resolvePartnerId(
    executionContext?: Reactory.Server.IReactoryContext
  ): string {
    const { partner } = this.resolveExecutionContext(executionContext);
    if (!partner || !partner._id) {
      throw new InsufficientPermissions(
        'A partner (client) context is required to evaluate organization permissions'
      );
    }
    return `${partner._id}`;
  }

  /**
   * Returns true when the caller holds `role` on exactly this organization.
   *
   * This deliberately does NOT use `user.hasRole(partnerId, role,
   * organizationId)`. That method ends with an unconditional document-level
   * fallback (`this.roles.includes(role)`), and
   * `UserService.createUserForOrganization` unions membership roles into
   * `user.roles`. A user provisioned as an ORGANIZATION_ADMIN therefore carries
   * the role on the user document, and the model's scoped query returns true
   * for *every* organization - precisely the cross-tenant bypass this helper
   * exists to prevent.
   *
   * The membership is the only authoritative source, so it is matched directly
   * here using the same key the model's scoped query uses for an
   * organization-level role: same client, same organization, and **no**
   * business unit. Document-level roles are ignored, so a global
   * ORGANIZATION_ADMIN cannot administer an organization they are not a member
   * of. Explicitly disabled memberships confer nothing.
   */
  private hasOrganizationRole(
    user: Reactory.Models.IUserDocument,
    clientId: string,
    organizationId: string,
    role: string
  ): boolean {
    const memberships: any[] = Array.isArray(user?.memberships)
      ? (user.memberships as any[])
      : [];

    return memberships.some((membership) => {
      if (!membership) return false;
      if (!membership.clientId || `${membership.clientId}` !== clientId) return false;
      if (!membership.organizationId || `${membership.organizationId}` !== organizationId) return false;
      // A business-unit membership does not confer organization administration.
      if (membership.businessUnitId !== null && membership.businessUnitId !== undefined) {
        return false;
      }
      if (membership.enabled === false) return false;
      if (!Array.isArray(membership.roles)) return false;
      return membership.roles.includes(role);
    });
  }

  /**
   * Organization-scoped authorization (ORG-005).
   *
   * A coarse `@roles(['ORGANIZATION_ADMIN', ...])` check only proves the caller
   * holds the role *somewhere*; it does not stop an administrator of
   * organization A from mutating organization B. This helper resolves the
   * acting user (never the process/system context) and requires either:
   *
   * - `ADMIN` for the caller's partner - a platform administrator, or
   * - `ORGANIZATION_ADMIN` held on *this* organization's membership.
   *
   * Anything else - including an unauthenticated caller, a missing partner or
   * an invalid organization id - throws. There is deliberately no fall-through:
   * a permission check that silently passes on a malformed input is worse than
   * no check at all.
   */
  private assertOrgAdmin(
    organizationId: string | ObjectId,
    executionContext: Reactory.Server.IReactoryContext
  ): void {
    const context = this.resolveExecutionContext(executionContext);
    const { user } = context;

    if (!user || !user._id) {
      throw new InsufficientPermissions(
        'An authenticated user is required to administer an organization'
      );
    }

    if (!organizationId || ObjectId.isValid(organizationId as any) === false) {
      throw new ApiError(`param id is not a valid ${organizationId}`);
    }

    const partnerId = this.resolvePartnerId(context);

    // Platform administrators may act on any organization.
    if (user.hasRole(partnerId, 'ADMIN') === true) return;

    // Organization administrators only on the organization they administer.
    // Resolved from the membership, never from document-level roles.
    if (this.hasOrganizationRole(user, partnerId, `${organizationId}`, 'ORGANIZATION_ADMIN') === true) {
      return;
    }

    throw new InsufficientPermissions(
      `User [${user._id}] does not have permission to administer organization [${organizationId}]`,
      { organizationId: `${organizationId}`, partnerId }
    );
  }

  /**
   * Creation is the one mutation with no target organization to scope against.
   * Organization administrators cannot create organizations because they have
   * no authority beyond their own; only a platform `ADMIN` or the `SYSTEM`
   * account may create one. The caller must still re-authorize (as ADMIN) when
   * configuring the new organization afterwards.
   */
  private assertCanCreateOrganization(
    executionContext?: Reactory.Server.IReactoryContext
  ): void {
    const context = this.resolveExecutionContext(executionContext);
    const { user } = context;

    if (!user || !user._id) {
      throw new InsufficientPermissions(
        'An authenticated user is required to create an organization'
      );
    }

    const partnerId = this.resolvePartnerId(context);

    if (user.hasRole(partnerId, 'ADMIN') === true) return;
    if (user.hasRole(partnerId, 'SYSTEM') === true) return;

    throw new InsufficientPermissions(
      `User [${user._id}] does not have permission to create an organization`,
      { partnerId }
    );
  }

  /**
   * Loads an organization after checking that the caller may administer it.
   * Authorization runs first so an unauthorized caller cannot use response
   * timing or error messages to probe for organization ids.
   */
  private async loadOrganizationForAdministration(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    this.assertOrgAdmin(id, executionContext || this.context);

    const organization = await Organization.findById(id).then() as unknown as Reactory.Models.IOrganizationDocument;
    if (!organization) {
      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);
    }

    return organization;
  }

  /**
   * Normalises a membership role list. An empty or omitted list means the
   * `USER` role - the same default `UserService.createUserForOrganization`
   * applies - and duplicates are removed so repeated calls stay idempotent.
   */
  private normalizeMemberRoles(roles?: string[]): string[] {
    const normalised = Array.isArray(roles)
      ? roles
          .filter((role) => typeof role === 'string' && role.trim().length > 0)
          .map((role) => role.trim())
      : [];

    return normalised.length > 0 ? Array.from(new Set(normalised)) : ['USER'];
  }

  /**
   * Finds the membership record for a client + organization pair. Membership
   * lives on `User.memberships` (never a second collection); when the model's
   * `getMembership` helper is available it is used, otherwise the document is
   * scanned with the same key comparison so plain test doubles also work.
   */
  private findMembership(
    user: Reactory.Models.IUserDocument,
    clientId: string,
    organizationId: string
  ): any {
    if (typeof (user as any).getMembership === 'function') {
      const membership = (user as any).getMembership(clientId, organizationId);
      if (membership) return membership;
    }

    const memberships: any[] = Array.isArray(user.memberships) ? (user.memberships as any[]) : [];
    return (
      memberships.find(
        (membership) =>
          membership &&
          membership.clientId &&
          `${membership.clientId}` === clientId &&
          membership.organizationId &&
          `${membership.organizationId}` === organizationId
      ) || null
    );
  }

  /** Image mime types accepted for organization branding assets. */
  private static readonly IMAGE_EXTENSIONS: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpeg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };

  /**
   * Converts a base64 image data URI into the `IFile` contract the
   * `ReactoryFileService` consumes, so organization images go through exactly
   * the same upload + aliasing path as multipart uploads.
   */
  private imageDataToFile(imageData: string, filename: string): Reactory.Service.IFile {
    const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(`${imageData}`);
    if (match === null) {
      throw new ApiError('Organization image must be a base64 encoded data URI');
    }

    const mimetype = match[1].toLowerCase();
    const isBase64 = match[2] !== undefined;
    const payload = match[3];
    const buffer = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8');

    if (buffer.length === 0) {
      throw new ApiError('Organization image data is empty');
    }

    const extension = OrganizationService.IMAGE_EXTENSIONS[mimetype] || 'jpeg';

    return {
      filename: `${filename}.${extension}`,
      mimetype,
      encoding: isBase64 ? 'base64' : 'utf8',
      // A fresh stream per call: `uploadFile` pipes it exactly once.
      createReadStream: () => {
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        return stream;
      },
    };
  }

  /**
   * Single upload path for organization branding assets. Returns the stored
   * file model; the caller is responsible for assigning the alias and saving.
   */
  private async uploadOrganizationFile(
    organization: Reactory.Models.IOrganizationDocument,
    file: Reactory.Service.IFile,
    imageType: 'logo' | 'avatar',
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IReactoryFileModel> {
    const fileSvc: Reactory.Service.IReactoryFileService = this
      .resolveExecutionContext(executionContext)
      .getService('core.ReactoryFileService@1.0.0');

    return fileSvc.uploadFile({
      catalog: false,
      file,
      rename: false,
      filename: `${imageType}_${organization._id}_default`,
      isUserSpecific: false,
      uploadContext: `mores::organization::${organization._id}::${imageType}`,
      virtualPath: `/organization/${organization._id}/`,
    }).then();
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
  async createBusinessUnit(
    organization_id: string | number | ObjectId,
    name: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IBusinessUnitDocument> {
    
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
        owner: this.resolveActorId(executionContext)
      });
      await $business_unit.save().then();
      if (!organization.businessUnits) organization.businessUnits = [];
      organization.businessUnits.push($business_unit);      
      await organization.save().then();      
      return $business_unit;

  }

  // ---- Business unit management (ORG-020) ----
  //
  // A business unit has no independent role model: authority over it is exactly
  // authority over the organization that owns it. Every mutation below therefore
  // runs `loadBusinessUnitForAdministration`, which resolves the parent
  // organization and applies the same `assertOrgAdmin` check ORG-005 uses for
  // organization mutations. An ORGANIZATION_ADMIN of organization A cannot
  // mutate a business unit that belongs to organization B.

  /** The organization id a business unit belongs to. */
  private businessUnitOrganizationId(
    businessUnit: Reactory.Models.IBusinessUnitDocument
  ): string {
    const organization: any = (businessUnit as any).organization;
    if (!organization) return null;
    if (typeof organization === 'string') return organization;
    if (organization._id) return `${organization._id}`;
    return `${organization}`;
  }

  /** Escapes a caller-supplied term so it can be used as a literal regex. */
  private escapeRegExp(term: string): string {
    return `${term}`.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`);
  }

  /**
   * Loads a business unit after checking that the caller may administer the
   * organization that owns it.
   *
   * The parent organization is the authorization boundary. Authorization runs
   * before anything else so an unauthorized caller cannot use response timing
   * or error messages to probe for business unit ids.
   */
  private async loadBusinessUnitForAdministration(
    id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IBusinessUnitDocument> {
    if (!id || ObjectId.isValid(id as any) === false) {
      throw new ApiError(`param id is not a valid ${id}`);
    }

    const businessUnit = await BusinessUnit.findById(id).then();
    if (!businessUnit) {
      throw new RecordNotFoundError(`Business Unit with the id ${id} could not be found`, 'BusinessUnit');
    }

    const organizationId = this.businessUnitOrganizationId(
      businessUnit as unknown as Reactory.Models.IBusinessUnitDocument
    );
    if (!organizationId) {
      throw new OrganizationNotFoundError(
        `Business Unit ${id} is not linked to an organization and cannot be administered`,
        `${id}`
      );
    }

    this.assertOrgAdmin(organizationId, executionContext || this.context);

    return businessUnit as unknown as Reactory.Models.IBusinessUnitDocument;
  }

  /**
   * Updates a business unit's identity fields.
   *
   * Semantics match `updateOrganization`: an omitted field is left untouched,
   * `null` or a blank string clears it, and any other value is trimmed and
   * stored. Before this existed the resolver wrote the GraphQL input straight
   * through `findByIdAndUpdate`, which (a) performed no authorization at all and
   * (b) could not express "clear this field" because `undefined` keys are
   * dropped by the driver.
   *
   * The name is the one field that cannot be cleared: it is how callers find a
   * business unit (`findBusinessUnit`) and how `createBusinessUnit` detects a
   * duplicate, so a nameless unit would break both.
   */
  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async updateBusinessUnit(
    id: string | number | ObjectId,
    updates: IBusinessUnitUpdateInput,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IBusinessUnitDocument> {
    const businessUnit = await this.loadBusinessUnitForAdministration(id, executionContext);
    const businessUnitDocument: any = businessUnit;

    if (!updates || typeof updates !== 'object') {
      throw new ApiError('Business Unit updates are required');
    }

    const name = this.normalizeOptionalText(updates.name);
    if (name !== undefined) {
      if (name === null) throw new ApiError('Business Unit name cannot be empty');

      // Preserve the per-organization name uniqueness `createBusinessUnit`
      // enforces. Renaming into a name that is already taken would leave two
      // live units a caller cannot tell apart, because `findBusinessUnit`
      // matches by name and would return an arbitrary one. Soft-deleted units
      // are ignored: restoring a unit whose name was reused is an administrator
      // decision, not a rename error.
      const currentName = `${businessUnitDocument.name || ''}`.trim().toLowerCase();
      if (name.toLowerCase() !== currentName) {
        const organizationId = this.businessUnitOrganizationId(businessUnit);
        const conflicting = await BusinessUnit.countDocuments({
          organization: new ObjectId(organizationId),
          _id: { $ne: (businessUnit as any)._id },
          name: { $regex: `^${this.escapeRegExp(name)}$`, $options: 'i' },
          deleted: { $ne: true },
        }).then();

        if (conflicting > 0) {
          throw new BusinessUnitExistsError(
            `Business Unit with name ${name} already exists in organization ${organizationId}`
          );
        }
      }

      businessUnitDocument.name = name;
    }

    const optionalTextFields: Array<'description' | 'avatar'> = ['description', 'avatar'];
    optionalTextFields.forEach((field) => {
      const value = this.normalizeOptionalText(updates[field]);
      if (value !== undefined) businessUnitDocument[field] = value;
    });

    // Owner is a user reference, not free text: null clears it, anything else
    // must be a user id. Existence is not checked here (create does not check it
    // either) but the id must be well formed so the reference cannot dangle on a
    // syntactically invalid value.
    if (updates.owner !== undefined) {
      const owner = this.normalizeOptionalText(updates.owner);
      if (owner === null) {
        businessUnitDocument.owner = null;
      } else {
        if (ObjectId.isValid(owner) === false) {
          throw new ApiError(`param owner is not a valid user id ${owner}`);
        }
        businessUnitDocument.owner = new ObjectId(owner);
      }
    }

    // Membership is deliberately not writable through this path: member
    // management goes through `addMemberToBusinessUnit` /
    // `removeMemberFromBusinessUnit`, which also move the Organigram pointer and
    // the organization membership. Replacing the array here would desynchronise
    // them.
    businessUnitDocument.updatedAt = moment().valueOf();
    businessUnitDocument.updatedBy = this.resolveActorId(executionContext);

    await businessUnitDocument.save().then();

    return businessUnit;
  }

  /**
   * Soft-deletes a business unit. The document and its members are retained:
   * `deleted` is the only thing that changes, so `restoreBusinessUnit` is a
   * lossless undo and historical references stay resolvable.
   *
   * Listings (`businessUnitsForOrganization`, `pagedBusinessUnits`, the
   * `Organization.businessUnits` property and the organization statistics)
   * exclude `deleted: true` by default, which is what removes the unit from
   * business-unit queries and from the options offered when assigning a
   * membership.
   */
  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async deleteBusinessUnit(
    id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IBusinessUnitDocument> {
    const businessUnit = await this.loadBusinessUnitForAdministration(id, executionContext);
    const businessUnitDocument: any = businessUnit;

    businessUnitDocument.deleted = true;
    businessUnitDocument.updatedAt = moment().valueOf();
    businessUnitDocument.updatedBy = this.resolveActorId(executionContext);

    await businessUnitDocument.save().then();

    return businessUnit;
  }

  /** Clears the soft-delete flag so the business unit is listed again. */
  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async restoreBusinessUnit(
    id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IBusinessUnitDocument> {
    const businessUnit = await this.loadBusinessUnitForAdministration(id, executionContext);
    const businessUnitDocument: any = businessUnit;

    businessUnitDocument.deleted = false;
    businessUnitDocument.updatedAt = moment().valueOf();
    businessUnitDocument.updatedBy = this.resolveActorId(executionContext);

    await businessUnitDocument.save().then();

    return businessUnit;
  }

  /**
   * Paged, filterable business unit list for one organization.
   *
   * The envelope is the same `{ paging, <collection> }` shape
   * `getPagedOrganizationsForLoggedInUser` and `getPagedTeamsForOrganization`
   * already return, so clients can reuse one table component.
   *
   * Soft-deleted units are excluded unless `includeDeleted` is set; the
   * `deletedOnly` variant exists so an administrator can find and restore them.
   */
  @roles(['USER'])
  async pagedBusinessUnits(
    organizationId: string | number | ObjectId,
    filter?: IBusinessUnitFilter,
    paging?: Reactory.Models.IPagingRequest
  ): Promise<IPagedBusinessUnits> {
    if (!organizationId || ObjectId.isValid(organizationId as any) === false) {
      throw new ApiError(`param organizationId is not a valid ${organizationId}`);
    }

    const _organizationId = new ObjectId(organizationId as any);
    const exists = await Organization.countDocuments({ _id: _organizationId }).then();
    if (exists === 0) {
      throw new OrganizationNotFoundError(
        `Organization with the id ${organizationId} could not be found`,
        `${organizationId}`
      );
    }

    const dbQuery: Record<string, any> = { organization: _organizationId };

    if (filter?.deletedOnly === true) {
      dbQuery.deleted = true;
    } else if (filter?.includeDeleted !== true) {
      dbQuery.deleted = { $ne: true };
    }

    const search = `${filter?.search || ''}`.trim();
    if (search.length > 0) {
      // Escape the term: a caller searching for "R&D" must not submit an
      // invalid regular expression.
      const term = this.escapeRegExp(search);
      dbQuery.$or = [
        { name: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
    }

    if (filter?.owner) {
      if (ObjectId.isValid(filter.owner) === false) {
        throw new ApiError(`param owner is not a valid user id ${filter.owner}`);
      }
      dbQuery.owner = new ObjectId(filter.owner);
    }

    if (filter?.member) {
      if (ObjectId.isValid(filter.member) === false) {
        throw new ApiError(`param member is not a valid user id ${filter.member}`);
      }
      dbQuery.members = new ObjectId(filter.member);
    }

    const page = paging?.page || 1;
    const pageSize = paging?.pageSize || 25;
    const skip = (page - 1) * pageSize;

    const [businessUnits, total] = await Promise.all([
      BusinessUnit.find(dbQuery).sort({ name: 1 }).skip(skip).limit(pageSize).then(),
      BusinessUnit.countDocuments(dbQuery).then(),
    ]);

    return {
      // `BusinessUnit.find` resolves to hydrated mongoose documents, which are
      // structurally the model type but not assignable to the registry's
      // document interface; the envelope is the public shape callers consume.
      businessUnits: businessUnits as unknown as Reactory.Models.IBusinessUnitDocument[],
      paging: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
        hasNext: (page * pageSize) < total,
      } as Reactory.Models.IPagingResult,
    };
  }

  /**
   * Adds a user to a business unit and points their organization membership at
   * it. Org-scoped against the business unit's parent organization, so this
   * cannot be used to edit another tenant.
   */
  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async addMemberToBusinessUnit(
    id: string | number | ObjectId,
    memberId: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    const businessUnit = await this.loadBusinessUnitForAdministration(id, executionContext);
    const businessUnitDocument: any = businessUnit;

    if (!memberId || ObjectId.isValid(memberId as any) === false) {
      throw new ApiError(`param memberId is not a valid ${memberId}`);
    }

    const user = await User.findById(memberId).then() as unknown as Reactory.Models.IUserDocument;
    if (!user) {
      throw new RecordNotFoundError(`User with the id ${memberId} could not be found`, 'User');
    }

    const organizationId = this.businessUnitOrganizationId(businessUnit);
    const organigram = await Organigram.findOne({
      user: (user as any).id || (user as any)._id,
      organization: organizationId,
    }).then();

    if (organigram) {
      (organigram as any).businessUnit = (businessUnit as any).id || (businessUnit as any)._id;
      await organigram.save().then();
    }

    const members: any[] = Array.isArray(businessUnitDocument.members) ? businessUnitDocument.members : [];
    const isMember = members.some((member: any) => `${member}` === `${(user as any)._id}`);
    if (isMember === false) {
      members.push((user as any)._id);
      businessUnitDocument.members = members;
    }

    businessUnitDocument.updatedAt = moment().valueOf();
    businessUnitDocument.updatedBy = this.resolveActorId(executionContext);
    await businessUnitDocument.save().then();

    return true;
  }

  /**
   * Removes a user from a business unit and clears the business unit pointer on
   * the matching organization membership. Org-scoped like every other business
   * unit mutation.
   */
  @roles(['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async removeMemberFromBusinessUnit(
    id: string | number | ObjectId,
    memberId: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    const businessUnit = await this.loadBusinessUnitForAdministration(id, executionContext);
    const businessUnitDocument: any = businessUnit;

    if (!memberId || ObjectId.isValid(memberId as any) === false) {
      throw new ApiError(`param memberId is not a valid ${memberId}`);
    }

    const user = await User.findById(memberId).then() as unknown as Reactory.Models.IUserDocument;
    if (!user) {
      throw new RecordNotFoundError(`User with the id ${memberId} could not be found`, 'User');
    }

    const organizationId = this.businessUnitOrganizationId(businessUnit);
    const organigram = await Organigram.findOne({
      user: (user as any).id || (user as any)._id,
      organization: organizationId,
      businessUnit: (businessUnit as any).id || (businessUnit as any)._id,
    }).then();

    if (organigram) {
      (organigram as any).businessUnit = null;
      await organigram.save().then();
    }

    if (Array.isArray(businessUnitDocument.members)) {
      businessUnitDocument.members = businessUnitDocument.members
        .filter((member: any) => `${member}` !== `${(user as any)._id}`);
    }

    businessUnitDocument.updatedAt = moment().valueOf();
    businessUnitDocument.updatedBy = this.resolveActorId(executionContext);
    await businessUnitDocument.save().then();

    return true;
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
  async createTeam(
    organization_id: string | number | ObjectId,
    name: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.ITeamDocument> {
    
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
    const actorId = this.resolveActorId(executionContext);
    $team = new Team({
      _id: new ObjectId(),
      organization: new ObjectId(organization_id),
      title: name.trim(),
      name: name.trim(),
      members: [],
      createdAt: $now,
      updatedAt: $now,
      deleted: false,
      owner: actorId
    });
    organization.teams = organization.teams || [];
    organization.teams.push($team);
    $team.organization = organization._id;
    $team.createdBy = actorId;
    $team.updatedBy = actorId;    
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
  async updateTeam(
    team_id: string | number | ObjectId,
    updates: any,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.ITeamDocument> {
    
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
    team.updatedBy = this.resolveActorId(executionContext);

    await team.save().then();
    return team;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async addMemberToTeam(
    team_id: string | number | ObjectId,
    member_id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    
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
    team.updatedBy = this.resolveActorId(executionContext);

    await team.save().then();
    return true;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async removeMemberFromTeam(
    team_id: string | number | ObjectId,
    member_id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    
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
      team.updatedBy = this.resolveActorId(executionContext);
      await team.save().then();
    }

    return true;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'TEAM_ADMIN', 'SYSTEM'])
  async deleteTeam(
    team_id: string | number | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    
    if (ObjectId.isValid(team_id) === false) throw new ApiError(`param team_id is not a valid ${team_id}`);

    const team = await Team.findById(team_id).then();
    if (!team) {
      throw new ApiError(`Team with id ${team_id} not found`, 404);
    }

    // Soft delete
    team.deleted = true;
    team.updatedAt = Date.now();
    team.updatedBy = this.resolveActorId(executionContext);

    await team.save().then();
    return true;
  }
  
  async findWithName(name: string): Promise<Reactory.Models.IOrganizationDocument> {
    this.context.log(`Searching for organization by name: ${name}`, {}, 'debug', 'OrganizationService')    
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

  /**
   * Creates an organization.
   *
   * This is the one organization mutation with no target organization to scope
   * against, so authorization cannot use `assertOrgAdmin`: an
   * `ORGANIZATION_ADMIN` only has authority over the organization they already
   * administer and must not be able to create (or bootstrap) another. Only a
   * platform `ADMIN` or the `SYSTEM` account may create one.
   *
   * Initial identity fields are applied in the same call because `SYSTEM` is
   * deliberately not admitted by `assertOrgAdmin` for subsequent updates -
   * without this, a SYSTEM create would succeed but its configuration would
   * not.
   */
  @roles(['ADMIN', 'SYSTEM'])
  async create(
    name: string,
    input?: IOrganizationUpdateInput,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    this.assertCanCreateOrganization(executionContext);

    const organizationName = this.normalizeOptionalText(name);
    if (organizationName === undefined || organizationName === null) {
      throw new ApiError('Organization name is required');
    }

    const now = moment().valueOf();
    const organization = new Organization({
      name: organizationName,
      createdAt: now,
      updatedAt: now,
    }) as Reactory.Models.IOrganizationDocument;

    if (input) {
      await this.applyOrganizationUpdates(organization, input, executionContext);
    }

    await organization.save();

    // ORG-030: seed the base demographic set once the organization exists.
    // This is best-effort by design - see `seedOrganizationDemographics`.
    await this.seedOrganizationDemographics(organization, executionContext);

    return organization;
  }

  /**
   * ORG-030: seeds the base demographic template set for a freshly created
   * organization.
   *
   * Called *after* the organization document is persisted, and deliberately
   * never throws - see the shared `seedOrganizationDemographics` helper, which
   * owns that policy and is also used by `UserService.selfRegister` (the other
   * path that creates an organization).
   *
   * Resolving the demographics service lazily (rather than injecting it) keeps
   * this out of the constructor dependency graph, which is also what makes the
   * failure path testable: a context without the service is the "module not
   * loaded" case.
   */
  private async seedOrganizationDemographics(
    organization: Reactory.Models.IOrganizationDocument,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<void> {
    await seedOrganizationDemographics(`${organization?._id}`, executionContext || this.context);
  }

  /**
   * Applies identity, lifecycle and branding fields to an organization
   * document. Shared by `create` and `setOrganization` so "clear a field",
   * "leave it alone" and "set it" cannot drift between the two paths.
   *
   * Validation is confined to values that would corrupt the record: an empty
   * name, an unknown lifecycle status or an unknown theme mode are rejected
   * before anything is written. The caller persists the document.
   */
  private async applyOrganizationUpdates(
    organization: Reactory.Models.IOrganizationDocument,
    updates: IOrganizationUpdateInput,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<void> {
    const name = this.normalizeOptionalText(updates.name);
    if (name !== undefined) {
      if (name === null) throw new ApiError('Organization name cannot be empty');
      organization.name = name;
    }

    const optionalTextFields: Array<keyof IOrganizationUpdateInput> = [
      'code',
      'tradingName',
      'legalName',
      'description',
      'website',
      'contactEmail',
      'contactPhone',
    ];

    optionalTextFields.forEach((field) => {
      const value = this.normalizeOptionalText(updates[field] as string | null | undefined);
      if (value !== undefined) (organization as any)[field] = value;
    });

    if (updates.status !== undefined) {
      const status = this.normalizeOptionalText(updates.status);
      if (status === null || OrganizationService.STATUSES.includes(status) === false) {
        throw new ApiError(
          `Organization status must be one of: ${OrganizationService.STATUSES.join(', ')}`
        );
      }
      (organization as any).status = status;
    }

    if (updates.themeMode !== undefined) {
      const themeMode = this.normalizeOptionalText(updates.themeMode);
      if (themeMode === null || OrganizationService.THEME_MODES.includes(themeMode) === false) {
        throw new ApiError(
          `Organization theme mode must be one of: ${OrganizationService.THEME_MODES.join(', ')}`
        );
      }
      (organization as any).themeMode = themeMode;
    }

    if (updates.theme !== undefined) {
      (organization as any).theme = this.normalizeOptionalText(updates.theme);
    }

    if (updates.avatar !== undefined) {
      (organization as any).avatar = this.normalizeOptionalText(updates.avatar);
    }

    if (updates.public !== undefined) {
      (organization as any).public = updates.public === true;
    }

    if (updates.settings !== undefined) {
      (organization as any).settings = updates.settings;
    }

    if (updates.legacyId !== undefined) {
      (organization as any).legacyId =
        updates.legacyId === null || updates.legacyId === undefined ? null : `${updates.legacyId}`;
    }

    if (updates.color) {
      organization.setSetting(
        'color',
        { primary: updates.color, secondary: updates.color },
        'core.MaterialThemeColorPicker'
      );
    }

    if (updates.logo) {
      try {
        await this.updateOrganizationLogo(organization, updates.logo, executionContext);
      } catch (logoError) {
        logger.warn(`Could not update the organization logo: ${logoError?.message || logoError}`);
      }
    }
  }

  /**
   * Stores an organization logo supplied as a base64 data URI.
   *
   * The previous implementation wrote the decoded bytes straight to disk and
   * returned the organization untouched, so `organization.logo` was never set
   * and `logoURL` always resolved to null. It now goes through the same
   * `ReactoryFileService` upload path as multipart uploads, assigns the
   * returned alias to the document and persists it.
   *
   * INTERNAL: this takes an already-loaded organization document and performs
   * no authorization of its own. It is only safe because every caller has
   * already authorized the target organization - `setupOrganization` via
   * `create`/`applyOrganizationUpdates` (post-`assertOrgAdmin`) and the public
   * `uploadOrganizationImage` after its own `assertOrgAdmin`. It is not part of
   * the published `IReactoryOrganizationService` interface, so external
   * callers should use `uploadOrganizationImage`.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async updateOrganizationLogo(
    organization: Reactory.Models.IOrganizationDocument,
    imageData: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    const file = this.imageDataToFile(imageData, `logo_${organization._id}_default`);
    const reactoryFile = await this.uploadOrganizationFile(organization, file, 'logo', executionContext);

    if (!reactoryFile || !reactoryFile.alias) {
      throw new ApiError(`Could not store the logo for organization ${organization._id}`);
    }

    organization.logo = reactoryFile.alias;
    await organization.save();

    return organization;
  }

  /**
   * Applies identity updates to an organization.
   *
   * Updates use explicit `undefined` checks so a caller can distinguish
   * "leave this field alone" (`undefined`) from "clear this field" (`null` or a
   * blank string). An empty `name` is invalid and rejected.
   *
   * ORG-005: the `@roles` decorator is only a cheap first gate. The caller must
   * additionally be a platform `ADMIN` or an `ORGANIZATION_ADMIN` scoped to
   * *this* organization; an administrator of another organization is denied.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async setOrganization(
    id: string,
    updates: IOrganizationUpdateInput,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    if (ObjectId.isValid(id) === false) {
      throw new ApiError(`param id is not a valid ${id}`);
    }

    this.assertOrgAdmin(id, executionContext || this.context);

    const _id = new ObjectId(id);
    const exists = await Organization.countDocuments({ _id }).then() > 0;

    if (exists === false) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);

    let organization: Reactory.Models.IOrganizationDocument = await Organization.findById(_id).then();
    if (!organization) throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);

    await this.applyOrganizationUpdates(organization, updates, executionContext);

    organization.createdAt = organization.createdAt || moment().valueOf();
    organization.updatedAt = moment().valueOf();
    await organization.save().then();

    return organization;
  }

  /**
   * Full identity update. Delegates to `setOrganization` so there is exactly
   * one implementation of "apply these fields to this organization"; the
   * GraphQL mutation and direct service callers therefore share both the
   * update semantics and the org-scoped authorization check.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async updateOrganization(
    id: string,
    input: IOrganizationUpdateInput,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    return this.setOrganization(id, input, executionContext);
  }

  /**
   * Sets the lifecycle status without deleting anything. Archive and restore
   * are separate mutations rather than a caller-supplied status so neither can
   * be reached through a generic update by a caller who only has one of them.
   */
  private async setOrganizationStatus(
    id: string,
    status: 'active' | 'archived',
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    if (ObjectId.isValid(id) === false) {
      throw new ApiError(`param id is not a valid ${id}`);
    }

    this.assertOrgAdmin(id, executionContext || this.context);

    const organization = await Organization.findById(id).then() as unknown as Reactory.Models.IOrganizationDocument;
    if (!organization) {
      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);
    }

    (organization as any).status = status;
    organization.updatedAt = moment().valueOf();
    await organization.save().then();

    return organization;
  }

  /** Archives an organization. The record and its data are retained. */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async archiveOrganization(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    return this.setOrganizationStatus(id, 'archived', executionContext);
  }

  /** Restores an archived organization to the active state. */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async restoreOrganization(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    return this.setOrganizationStatus(id, 'active', executionContext);
  }

  /**
   * Returns the organization's settings bag. Reads are `USER`-level (a member
   * may see the organization's configuration); a missing organization is a
   * 404 rather than an empty list so callers cannot mistake the two.
   */
  @roles(['USER'])
  async getSettings(id: string): Promise<Reactory.Models.IOrganizationSetting[]> {
    if (ObjectId.isValid(id) === false) {
      throw new ApiError(`param id is not a valid ${id}`);
    }

    const organization = await Organization.findById(id).then();
    if (!organization) {
      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);
    }

    const settings = (organization as any).settings;
    return Array.isArray(settings) ? settings : [];
  }

  /**
   * Upserts one setting by name. Delegates to the document's `setSetting`
   * helper, which correctly handles the first-write case (empty `settings`).
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async setSetting(
    id: string,
    name: string,
    data: any,
    componentFqn?: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    if (!name || `${name}`.trim().length === 0) {
      throw new ApiError('A setting name is required');
    }

    const organization = await this.loadOrganizationForAdministration(id, executionContext);

    organization.setSetting(`${name}`.trim(), data, componentFqn);
    organization.updatedAt = moment().valueOf();
    await organization.save().then();

    return organization;
  }

  /** Removes one setting by name. Removing an absent setting is a no-op. */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async removeSetting(
    id: string,
    name: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    if (!name || `${name}`.trim().length === 0) {
      throw new ApiError('A setting name is required');
    }

    const organization = await this.loadOrganizationForAdministration(id, executionContext);
    const target = `${name}`.trim();
    const settings: any[] = Array.isArray((organization as any).settings)
      ? (organization as any).settings
      : [];

    (organization as any).settings = settings.filter(
      (setting: any) => setting === null || setting === undefined || setting.name !== target
    );
    organization.updatedAt = moment().valueOf();
    await organization.save().then();

    return organization;
  }

  /**
   * Counts for the organization dashboard.
   *
   * Deliberately one parallel round of aggregate queries (existence plus one
   * `countDocuments` per collection) - no per-member or per-team queries, which
   * is what makes the naive implementation N+1.
   */
  @roles(['USER'])
  async getStatistics(id: string): Promise<IOrganizationStatistics> {
    if (ObjectId.isValid(id) === false) {
      throw new ApiError(`param id is not a valid ${id}`);
    }

    const _id = new ObjectId(id);

    const [exists, members, businessUnits, teams] = await Promise.all([
      Organization.countDocuments({ _id }).then(),
      User.countDocuments({ 'memberships.organizationId': _id }).then(),
      BusinessUnit.countDocuments({ organization: _id, deleted: { $ne: true } }).then(),
      Team.countDocuments({ organization: _id, deleted: { $ne: true } }).then(),
    ]);

    if (!exists) {
      throw new OrganizationNotFoundError(`Organization with the id ${id} could not be found`, id);
    }

    return { members, businessUnits, teams };
  }

  /** Loads a user that is about to be added to or removed from an organization. */
  private async loadMember(userId: string): Promise<Reactory.Models.IUserDocument> {
    if (!userId || ObjectId.isValid(userId) === false) {
      throw new ApiError(`param userId is not a valid ${userId}`);
    }

    const user = await User.findById(userId).then() as unknown as Reactory.Models.IUserDocument;
    if (!user) {
      throw new ApiError(`User with id ${userId} not found`, 404);
    }

    return user;
  }

  /**
   * Adds (or re-activates) a member's membership for this organization.
   *
   * Membership lives on `User.memberships`, keyed by client id + organization
   * id, exactly as `UserService.createUserForOrganization` and
   * `ReactoryCoreCreateUserMembership` write it. There is no second membership
   * model. Existing roles are unioned so adding a member twice is idempotent.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async addMember(
    id: string,
    userId: string,
    roles: string[] = ['USER'],
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    const organization = await this.loadOrganizationForAdministration(id, executionContext);
    const user = await this.loadMember(userId);
    const clientId = this.resolvePartnerId(executionContext);
    const membershipRoles = this.normalizeMemberRoles(roles);

    const membership = this.findMembership(user, clientId, `${organization._id}`);
    if (membership) {
      membership.roles = Array.from(new Set([...(membership.roles || []), ...membershipRoles]));
      membership.enabled = true;
    } else {
      if (!Array.isArray(user.memberships)) (user as any).memberships = [];
      (user.memberships as any[]).push({
        clientId: new ObjectId(clientId),
        organizationId: organization._id,
        businessUnitId: null,
        roles: membershipRoles,
        enabled: true,
        authProvider: 'default',
        created: new Date(),
      });
    }

    if (typeof (user as any).markModified === 'function') (user as any).markModified('memberships');
    await user.save().then();

    return organization;
  }

  /**
   * Replaces the roles on a member's membership for this organization. When no
   * membership exists it is created, so a role can be granted without a
   * separate add round-trip.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async setMemberRoles(
    id: string,
    userId: string,
    roles: string[],
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    const organization = await this.loadOrganizationForAdministration(id, executionContext);
    const user = await this.loadMember(userId);
    const clientId = this.resolvePartnerId(executionContext);
    const membershipRoles = this.normalizeMemberRoles(roles);

    const membership = this.findMembership(user, clientId, `${organization._id}`);
    if (membership) {
      membership.roles = membershipRoles;
      membership.enabled = true;
    } else {
      if (!Array.isArray(user.memberships)) (user as any).memberships = [];
      (user.memberships as any[]).push({
        clientId: new ObjectId(clientId),
        organizationId: organization._id,
        businessUnitId: null,
        roles: membershipRoles,
        enabled: true,
        authProvider: 'default',
        created: new Date(),
      });
    }

    if (typeof (user as any).markModified === 'function') (user as any).markModified('memberships');
    await user.save().then();

    return organization;
  }

  /**
   * Removes a member's membership for this organization. Memberships for other
   * organizations (or other clients) are left untouched.
   */
  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async removeMember(
    id: string,
    userId: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    const organization = await this.loadOrganizationForAdministration(id, executionContext);
    const user = await this.loadMember(userId);
    const clientId = this.resolvePartnerId(executionContext);
    const organizationId = `${organization._id}`;

    const memberships: any[] = Array.isArray(user.memberships) ? [...(user.memberships as any[])] : [];
    const remaining = memberships.filter(
      (membership) =>
        !(
          membership &&
          membership.clientId &&
          `${membership.clientId}` === clientId &&
          membership.organizationId &&
          `${membership.organizationId}` === organizationId
        )
    );

    if (remaining.length !== memberships.length) {
      (user as any).memberships = remaining;
      if (typeof (user as any).markModified === 'function') (user as any).markModified('memberships');
      await user.save().then();
    }

    return organization;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async uploadOrganizationImage(
    id: string,
    file: Reactory.Service.IFile,
    imageType: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {

    if (!id) {
      throw new ApiError('Cannot upload image for null id')
    }

    // Part of the published service interface, so it is reachable from plugins
    // as well as resolvers: the org-scoped check must run here, not only in the
    // coarse `@roles` decorator.
    this.assertOrgAdmin(id, executionContext || this.context);

    const organization: Reactory.Models.IOrganizationDocument = await Organization.findById(id).then();

    if (!organization) throw new ApiError(`Organization with id ${id} not found`);

    const reactoryFile: Reactory.Models.IReactoryFile = await this.uploadOrganizationFile(
      organization,
      file,
      imageType as 'logo' | 'avatar',
      executionContext
    );

    if (!reactoryFile || !reactoryFile.alias) {
      throw new ApiError(`Could not store the ${imageType} for organization ${id}`);
    }

    if (imageType === 'logo') organization.logo = reactoryFile.alias;
    if (imageType === 'avatar') organization.avatar = reactoryFile.alias;

    // Persist before returning: the caller (and any subsequent read) must see
    // the alias, and an unanswered save would resolve the promise first.
    await organization.save();

    return organization;
  }

  // ---- Branding / theme operations (ORG-004) ----
  //
  // Themes are stored on the organization exactly like they are on a
  // ReactoryClient (`themes: [Mixed]`, `theme` is a name pointer), so all
  // behaviour lives in the shared `ThemeService`. Org-scoped authorisation is
  // enforced by `assertOrgAdmin` (ORG-005) in every mutation below; the
  // `@roles` decorators remain as a cheap first gate.

  private themeService(executionContext?: Reactory.Server.IReactoryContext): ThemeService {
    return new ThemeService(executionContext || this.context);
  }

  /**
   * Loads the organization used as a theme holder. Deliberately unprojected:
   * `themes` and `theme` must be present on the document.
   */
  private async findThemeHolder(orgId: string): Promise<Reactory.Models.IOrganizationDocument> {
    if (!orgId || ObjectId.isValid(orgId) === false) {
      throw new ApiError(`param id is not a valid ${orgId}`);
    }

    const organization = await Organization.findById(orgId).then();
    if (!organization) {
      throw new OrganizationNotFoundError(`Organization with the id ${orgId} could not be found`, orgId);
    }

    return organization;
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async saveTheme(
    orgId: string,
    theme: any,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    this.assertOrgAdmin(orgId, executionContext || this.context);
    const organization = await this.findThemeHolder(orgId);
    return this.themeService(executionContext).saveTheme(organization as any, theme);
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async setActiveTheme(
    orgId: string,
    themeName: string,
    mode?: string | null,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    this.assertOrgAdmin(orgId, executionContext || this.context);
    const organization = await this.findThemeHolder(orgId);
    return this.themeService(executionContext).setActiveTheme(organization as any, themeName, mode);
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async deleteTheme(
    orgId: string,
    themeName: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    this.assertOrgAdmin(orgId, executionContext || this.context);
    const organization = await this.findThemeHolder(orgId);
    return this.themeService(executionContext).deleteTheme(organization as any, themeName);
  }

  @roles(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])
  async publishThemeCss(
    orgId: string,
    themeName: string,
    css: string,
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<boolean> {
    this.assertOrgAdmin(orgId, executionContext || this.context);
    const organization = await this.findThemeHolder(orgId);
    return this.themeService(executionContext).publishThemeCss(themeName, css, organization as any);
  }

  async getThemeCss(themeName: string): Promise<string> {
    return this.themeService().getThemeCss(themeName);
  }

  @roles(['USER'])
  async getOrganizationsForLoggedInUser(
    search: string,
    sort: string,
    direction: string = 'asc',
    executionContext?: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument[]> {
    const { user, partner } = this.resolveExecutionContext(executionContext);
    const sortByf = sort || 'name';

    // Sort by the requested field *and* direction. The previous implementation
    // passed the direction string ('asc' / 'desc') to `.sort()` as if it were a
    // field name, so the admin branch sorted by a non-existent field and the
    // membership branch ignored the direction entirely (ORG-005).
    const sortOption: Record<string, 1 | -1> = {
      [sortByf]: direction === 'desc' ? -1 : 1,
    };
  
    if (user.hasAnyRole(partner._id) === false) return [];

    if (
      user.hasRole(partner._id, 'ADMIN') === true ||
      user.hasRole(partner._id, 'DEVELOPER')
    ) {
      return Organization.find({}).sort(sortOption).then();
    }

    const _membershipOrganizationIds: any[] = [];
    user.memberships.forEach((membership) => {
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
      .sort(sortOption)
      .then();

  }

  @roles(['USER'])
  async getPagedOrganizationsForLoggedInUser(
    search: string,
    sort: string,
    direction: string = 'asc',
    paging: Reactory.Models.IPagingRequest,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<{ paging: Reactory.Models.IPagingResult; organizations: Reactory.Models.IOrganizationDocument[] }> {

    const { user, partner } = this.resolveExecutionContext(executionContext);
    const sortBy = sort || 'name';
    const page = paging?.page ?? 1;
    const pageSize = paging?.pageSize ?? 10;

    const result: {
      paging: Reactory.Models.IPagingResult;
      organizations: Reactory.Models.IOrganizationDocument[];
    } = {
      paging: { page, pageSize, total: 0, hasNext: false },
      organizations: [],
    };

    if (user.hasAnyRole(partner._id) === false) return result;

    let filter: Record<string, any> = {};

    const isAdmin =
      user.hasRole(partner._id, 'ADMIN') === true ||
      user.hasRole(partner._id, 'DEVELOPER') === true;

    if (!isAdmin) {
      const _membershipOrganizationIds: any[] = [];
      user.memberships.forEach((membership) => {
        if (
          membership.organizationId &&
          membership.clientId.equals(partner._id) &&
          _membershipOrganizationIds.indexOf(membership.organizationId) < 0
        ) {
          _membershipOrganizationIds.push(membership.organizationId);
        }
      });
      filter._id = { $in: _membershipOrganizationIds };
    }

    if (search && search.trim().length > 0) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const sortOption: Record<string, 1 | -1> = { [sortBy]: direction === 'desc' ? -1 : 1 };

    result.paging.total = await Organization.countDocuments(filter);
    result.organizations = await Organization.find(filter)
      .sort(sortOption)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .then();
    result.paging.hasNext = (page * pageSize) < result.paging.total;

    return result;
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
      public: 1,
      clients: 1,
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