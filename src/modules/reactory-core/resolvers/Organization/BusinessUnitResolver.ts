import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import { BusinessUnit, Organization, User } from '@reactory/server-modules/reactory-core/models';
import { OrganizationNotFoundError, BusinessUnitExistsError, ValidationError } from '@reactory/server-core/exceptions';

/**
 * The business unit surface added by ORG-020.
 *
 * Declared locally because the published `IReactoryOrganizationService`
 * interface ships in the packaged `reactory-core` types and predates these
 * operations - the same approach ORG-004 took for the theme methods. The
 * optional execution context is forwarded so the service's org-scoped
 * `assertOrgAdmin` check evaluates the caller, not whatever context the
 * singleton happened to be constructed with.
 */
export interface IBusinessUnitService {
  updateBusinessUnit(
    id: string,
    updates: any,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any>;
  deleteBusinessUnit(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any>;
  restoreBusinessUnit(
    id: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any>;
  pagedBusinessUnits(
    organizationId: string,
    filter?: any,
    paging?: Reactory.Models.IPagingRequest,
  ): Promise<{ paging: Reactory.Models.IPagingResult; businessUnits: any[] }>;
  addMemberToBusinessUnit(
    id: string,
    memberId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<boolean>;
  removeMemberFromBusinessUnit(
    id: string,
    memberId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<boolean>;
}

const ORGANIZATION_SERVICE_ID = 'core.OrganizationService@1.0.0';

/**
 * Cheap first gate for business unit administration. The service performs the
 * real check (`assertOrgAdmin` against the business unit's parent
 * organization); these roles only prove the caller holds *a* privileged role
 * somewhere.
 */
const BUSINESS_UNIT_ADMIN_ROLES = ['BUSINESS_UNIT_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'];

const businessUnitService = (context: Reactory.Server.IReactoryContext): IBusinessUnitService =>
  context.getService(ORGANIZATION_SERVICE_ID) as unknown as IBusinessUnitService;

/** Escapes a caller-supplied term so it can be used as a literal regex. */
const escapeRegExp = (term: string): string =>
  `${term}`.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`);

//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class BusinessUnitResolver {

  resolver: Reactory.Graph.IResolverStruct;

  // ---- BusinessUnit type property resolvers ----

  @property('BusinessUnit', 'id')
  id(bu: any) {
    return bu._id ? bu._id.toString() : null;
  }

  @property('BusinessUnit', 'organization')
  async organization(bu: any) {
    if (bu.organization) {
      return Organization.findById(bu.organization).then();
    }
    return null;
  }

  @property('BusinessUnit', 'owner')
  async owner(bu: any) {
    if (bu.owner) return User.findById(bu.owner).then();
    return null;
  }

  @property('BusinessUnit', 'members')
  async members(bu: any) {
    if (bu.members) {
      return Promise.all(bu.members.map((m: any) => User.findById(m).then()));
    }
    return [];
  }

  // ---- Queries ----

  /**
   * Business units for one organization. Soft-deleted units are excluded by
   * default (ORG-020): this query also feeds the options offered when a
   * membership is assigned, and a deleted unit must not be selectable there.
   */
  @query('businessUnitsForOrganization')
  async businessUnitsForOrganization(parent: any, args: any) {
    const { id, searchString } = args;
    const organization = await Organization.findById(id).then();
    if (organization) {
      const dbQuery: any = { organization: organization._id, deleted: { $ne: true } };
      const search = `${searchString || ''}`.trim();
      if (search.length > 0) {
        // Escape the term so a search containing '(' or '[' is a literal match
        // rather than an invalid regular expression thrown at the GraphQL layer.
        dbQuery.name = { $regex: escapeRegExp(search), $options: 'i' };
      }
      return BusinessUnit.find(dbQuery).then();
    }
    throw new OrganizationNotFoundError('Could not locate the organization with the given id', 'Organization');
  }

  @query('businessUnitWithId')
  async businessUnitWithId(parent: any, args: any) {
    const { id } = args;
    return BusinessUnit.findById(id).then();
  }

  /**
   * Paged, filterable list of an organization's business units (ORG-020).
   * Returns the same `{ paging, <collection> }` envelope as
   * `CorePagedOrganizations`, so the admin UI can reuse its table.
   */
  @query('pagedBusinessUnits')
  @roles(['USER'])
  async pagedBusinessUnits(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { organizationId, filter, paging } = args;
    return businessUnitService(context).pagedBusinessUnits(organizationId, filter, paging);
  }

  /**
   * Legacy paged query kept for existing consumers. It now excludes
   * soft-deleted units by default and understands
   * `filter.includeDeleted` / `filter.deletedOnly`, but retains its cross-
   * organization listing behaviour (an omitted `organizationId` lists all
   * organizations) so the existing contract does not change.
   */
  @query('ReactoryBusinessUnits')
  async ReactoryBusinessUnits(parent: any, args: any) {
    try {
      const { query } = args;
      const { paging, filter } = query || {};
      const dbQuery: any = {};

      if (filter) {
        if (filter.organizationId) dbQuery.organization = filter.organizationId;
        if (filter.name) dbQuery.name = new RegExp(filter.name, 'i');
        if (filter.search) {
          dbQuery.$or = [
            { name: new RegExp(filter.search, 'i') },
            { description: new RegExp(filter.search, 'i') },
          ];
        }
      }

      if (filter?.deletedOnly === true) {
        dbQuery.deleted = true;
      } else if (filter?.includeDeleted !== true) {
        dbQuery.deleted = { $ne: true };
      }

      const page = paging?.page || 1;
      const pageSize = paging?.pageSize || 25;
      const skip = (page - 1) * pageSize;
      const [businessUnits, total] = await Promise.all([
        BusinessUnit.find(dbQuery).sort({ name: 1 }).skip(skip).limit(pageSize).then(),
        BusinessUnit.countDocuments(dbQuery).then(),
      ]);
      return {
        __typename: 'ReactoryPagedBusinessUnits',
        businessUnits,
        paging: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
          hasNext: (page * pageSize) < total,
        },
      };
    } catch (err: any) {
      return {
        __typename: 'ReactoryBusinessUnitsQueryFailed',
        message: err.message || 'Failed to fetch business units',
        code: 'ERR_BUSINESS_UNITS_QUERY',
      };
    }
  }

  // ---- Mutations ----

  @mutation('createBusinessUnit')
  async createBusinessUnit(obj: any, args: any) {
    const { input } = args;
    if (input.organization) {
      const organization = await Organization.findById(input.organization).then();
      if (!organization) throw new OrganizationNotFoundError('Could not locate the organization with id in the input', 'Organization');
      const buExists = await BusinessUnit.count({ organization: organization._id, name: input.name }).then() === 1;
      if (buExists === true) throw new BusinessUnitExistsError('Could not create the business with that name as it already exists for the organization');
      let businessUnit = new BusinessUnit(input);
      businessUnit = await businessUnit.save().then();
      return businessUnit;
    }
    throw new ValidationError('Could not validate the input');
  }

  /**
   * Updates a business unit's identity fields. Delegates to
   * `OrganizationService.updateBusinessUnit`, which enforces the org-scoped
   * authorization and the "omit = unchanged, null/blank = clear" semantics.
   */
  @mutation('updateBusinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async updateBusinessUnit(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id, input } = args;
    return businessUnitService(context).updateBusinessUnit(id, input, context);
  }

  /** Soft-deletes a business unit. Never hard-deletes. */
  @mutation('deleteBusinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async deleteBusinessUnit(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id } = args;
    return businessUnitService(context).deleteBusinessUnit(id, context);
  }

  /** Clears a business unit's soft-delete flag. */
  @mutation('restoreBusinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async restoreBusinessUnit(parent: any, args: any, context: Reactory.Server.IReactoryContext) {
    const { id } = args;
    return businessUnitService(context).restoreBusinessUnit(id, context);
  }

  /**
   * Typo'd alias for `addMemberToBusinessUnit`. Kept because something may
   * still call it by this name; both delegate to the same service method.
   */
  @mutation('addMemberToBussinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async addMemberToBussinessUnit(parent: any, args: { id: any, memberId: any }, context: Reactory.Server.IReactoryContext) {
    return this.addMemberToBusinessUnit(parent, args, context);
  }

  @mutation('addMemberToBusinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async addMemberToBusinessUnit(parent: any, args: { id: any, memberId: any }, context: Reactory.Server.IReactoryContext) {
    const { id, memberId } = args;
    return businessUnitService(context).addMemberToBusinessUnit(id, memberId, context);
  }

  @mutation('removeMemberFromBusinessUnit')
  @roles(BUSINESS_UNIT_ADMIN_ROLES)
  async removeMemberFromBusinessUnit(parent: any, args: { id: any, memberId: any }, context: Reactory.Server.IReactoryContext) {
    const { id, memberId } = args;
    return businessUnitService(context).removeMemberFromBusinessUnit(id, memberId, context);
  }
}

export default BusinessUnitResolver;
