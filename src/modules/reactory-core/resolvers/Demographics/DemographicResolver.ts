import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query, mutation, property } from '@reactory/server-core/models/graphql/decorators/resolver';

/**
 * ORG-006: organization demographics resolvers.
 *
 * Every method is a thin delegation to `DemographicsService`. The service owns
 * the guard rails (org-scoped `assertOrgAdmin`, key/system immutability, value
 * validation, self-service policy) and receives the resolver's execution
 * context explicitly so those checks evaluate the caller, not the singleton's
 * construction-time context. The `@roles` decorators are only the coarse first
 * gate; `OrganizationDemographicValues` is the one read that is also
 * administrator-only at the service level.
 *
 * CRITICAL CONTRACT: `OrganizationDemographicDefinitions` stays a top-level
 * query with this exact name and an `organizationId` argument. The merged
 * organization-management plugin (ORG-010) already calls it and treats a
 * schema rejection as "not implemented yet".
 */

export interface IDemographicsService {
  list(organizationId: string, includeDisabled?: boolean, executionContext?: Reactory.Server.IReactoryContext): Promise<any[]>;
  get(organizationId: string, key: string, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  save(organizationId: string, definition: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  remove(organizationId: string, key: string, executionContext?: Reactory.Server.IReactoryContext): Promise<boolean>;
  reorder(organizationId: string, keys: string[], executionContext?: Reactory.Server.IReactoryContext): Promise<any[]>;
  setEnabled(organizationId: string, key: string, enabled: boolean, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  getPolicy(organizationId: string, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  updatePolicy(organizationId: string, policy: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  listValues(organizationId: string, filter?: any, paging?: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  getUserValues(organizationId: string, userId: string, executionContext?: Reactory.Server.IReactoryContext): Promise<any[]>;
  saveValue(organizationId: string, value: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  saveValues(organizationId: string, values: any[], executionContext?: Reactory.Server.IReactoryContext): Promise<any[]>;
  deleteValue(organizationId: string, key: string, userId?: string, executionContext?: Reactory.Server.IReactoryContext): Promise<boolean>;
  saveSelfServiceValues(organizationId: string, values: any[], membershipId?: string | null, executionContext?: Reactory.Server.IReactoryContext): Promise<any[]>;
  aggregate(organizationId: string, definitionKeys?: string[] | null, filter?: any, executionContext?: Reactory.Server.IReactoryContext): Promise<any>;
  aggregateCsv(organizationId: string, definitionKeys?: string[] | null, filter?: any, executionContext?: Reactory.Server.IReactoryContext): Promise<string>;
}

const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

/** Members may read the configuration and maintain their own values. */
const READ_ROLES = ['USER'];

/** Configuration and organization-wide value writes. */
const CONFIG_ROLES = ['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'];

const demographicsService = (context: Reactory.Server.IReactoryContext): IDemographicsService =>
  context.getService(DEMOGRAPHICS_SERVICE_ID) as unknown as IDemographicsService;

/** Resolves an `id` / `_id` pair to a stable string for the GraphQL `id` field. */
const resolveId = (obj: any): string | null => {
  const value = obj?.id ?? obj?._id;
  return value === undefined || value === null ? null : `${value}`;
};

//@ts-ignore - this has to be called without the () as this throws an error in the decorator
@resolver
class DemographicResolver {

  resolver: Reactory.Graph.IResolverStruct;

  // ---------------------------------------------------------------------------
  // Property resolvers
  // ---------------------------------------------------------------------------

  /**
   * `id` is a Mongoose virtual, not a stored path; lean documents have only
   * `_id`. Resolve both to the string the schema promises.
   */
  @property('DemographicDefinition', 'id')
  definitionId(obj: any): string | null {
    return resolveId(obj);
  }

  @property('DemographicValue', 'id')
  valueId(obj: any): string | null {
    return resolveId(obj);
  }

  @property('OrganizationDemographicsPolicy', 'id')
  policyId(obj: any): string | null {
    return resolveId(obj);
  }

  /**
   * `schema` is a reserved Mongoose document accessor. The model restores it on
   * the prototype, so `doc.schema` is the compiled Mongoose Schema, not the
   * persisted JSON Schema. Always read the data through `get('schema')`.
   */
  @property('DemographicDefinition', 'schema')
  definitionSchema(obj: any): any {
    if (!obj) return null;
    if (typeof obj.get === 'function') return obj.get('schema');
    return obj.schema;
  }

  /**
   * `Organization.demographicsPolicy` is not stored on the organization; it is
   * the organization's policy document (or defaults when none exists yet).
   * A member may read it - the configuration screen and the self-service form
   * both need to know whether self-service is enabled.
   */
  @property('Organization', 'demographicsPolicy')
  @roles(READ_ROLES)
  async organizationPolicy(obj: any, _params: any, context: Reactory.Server.IReactoryContext) {
    if (obj && obj.demographicsPolicy !== undefined && obj.demographicsPolicy !== null) {
      return obj.demographicsPolicy;
    }

    const organizationId = resolveId(obj);
    if (!organizationId) return null;

    return demographicsService(context).getPolicy(organizationId, context);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  @query('OrganizationDemographicDefinitions')
  @roles(READ_ROLES)
  async listDefinitions(
    _obj: any,
    params: { organizationId: string; includeDisabled?: boolean | null },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).list(
      params.organizationId,
      params.includeDisabled === true,
      context,
    );
  }

  @query('OrganizationDemographicDefinition')
  @roles(READ_ROLES)
  async getDefinition(
    _obj: any,
    params: { organizationId: string; key: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).get(params.organizationId, params.key, context);
  }

  @query('OrganizationDemographicValues')
  @roles(CONFIG_ROLES)
  async listValues(
    _obj: any,
    params: { organizationId: string; filter?: any; paging?: any },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).listValues(
      params.organizationId,
      params.filter || {},
      params.paging || {},
      context,
    );
  }

  @query('MyDemographics')
  @roles(READ_ROLES)
  async myDemographics(
    _obj: any,
    params: { organizationId: string; membershipId?: string | null },
    context: Reactory.Server.IReactoryContext,
  ) {
    // The caller is always the subject. `membershipId` is accepted for
    // multi-organization members but never selects another user.
    return demographicsService(context).getUserValues(
      params.organizationId,
      `${context.user._id}`,
      context,
    );
  }

  /**
   * ORG-035: aggregate report.
   *
   * `@roles` here is only the coarse gate. The service re-checks the caller
   * with its org-scoped `assertOrgAdmin`, which is what stops an administrator
   * of organization A from reading B's distributions.
   */
  @query('OrganizationDemographicAggregates')
  @roles(CONFIG_ROLES)
  async demographicAggregates(
    _obj: any,
    params: {
      organizationId: string;
      definitionKeys?: string[] | null;
      filter?: any;
    },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).aggregate(
      params.organizationId,
      params.definitionKeys || [],
      params.filter || {},
      context,
    );
  }

  /**
   * ORG-035: CSV export of the aggregate report.
   *
   * A query rather than a mutation: it reads and changes nothing, is
   * idempotent and safe to retry. It delegates to `aggregateCsv`, which itself
   * calls `aggregate`, so the export cannot bypass the authorization,
   * suppression or audit path used by the JSON query.
   */
  @query('OrganizationDemographicAggregatesCsv')
  @roles(CONFIG_ROLES)
  async demographicAggregatesCsv(
    _obj: any,
    params: {
      organizationId: string;
      definitionKeys?: string[] | null;
      filter?: any;
    },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).aggregateCsv(
      params.organizationId,
      params.definitionKeys || [],
      params.filter || {},
      context,
    );
  }

  // ---------------------------------------------------------------------------
  // Definition mutations
  // ---------------------------------------------------------------------------

  @mutation('OrganizationSaveDemographicDefinition')
  @roles(CONFIG_ROLES)
  async saveDefinition(
    _obj: any,
    params: { organizationId: string; definition: any },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).save(params.organizationId, params.definition, context);
  }

  @mutation('OrganizationDeleteDemographicDefinition')
  @roles(CONFIG_ROLES)
  async deleteDefinition(
    _obj: any,
    params: { organizationId: string; key: string },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).remove(params.organizationId, params.key, context);
  }

  @mutation('OrganizationReorderDemographicDefinitions')
  @roles(CONFIG_ROLES)
  async reorderDefinitions(
    _obj: any,
    params: { organizationId: string; keys: string[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).reorder(params.organizationId, params.keys, context);
  }

  @mutation('OrganizationSetDemographicEnabled')
  @roles(CONFIG_ROLES)
  async setDefinitionEnabled(
    _obj: any,
    params: { organizationId: string; key: string; enabled: boolean },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).setEnabled(
      params.organizationId,
      params.key,
      params.enabled === true,
      context,
    );
  }

  // ---------------------------------------------------------------------------
  // Policy
  // ---------------------------------------------------------------------------

  @mutation('OrganizationUpdateDemographicsPolicy')
  @roles(CONFIG_ROLES)
  async updatePolicy(
    _obj: any,
    params: { organizationId: string; policy: any },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).updatePolicy(
      params.organizationId,
      params.policy || {},
      context,
    );
  }

  // ---------------------------------------------------------------------------
  // Value mutations
  // ---------------------------------------------------------------------------

  @mutation('OrganizationSaveDemographicValue')
  @roles(CONFIG_ROLES)
  async saveValue(
    _obj: any,
    params: { organizationId: string; value: any },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).saveValue(params.organizationId, params.value, context);
  }

  @mutation('OrganizationBulkSaveDemographicValues')
  @roles(CONFIG_ROLES)
  async bulkSaveValues(
    _obj: any,
    params: { organizationId: string; values: any[] },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).saveValues(
      params.organizationId,
      params.values || [],
      context,
    );
  }

  @mutation('OrganizationDeleteDemographicValue')
  @roles([...CONFIG_ROLES, ...READ_ROLES])
  async deleteValue(
    _obj: any,
    params: { organizationId: string; key: string; user?: string | null },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).deleteValue(
      params.organizationId,
      params.key,
      params.user || undefined,
      context,
    );
  }

  @mutation('MySaveDemographics')
  @roles(READ_ROLES)
  async saveMyDemographics(
    _obj: any,
    params: { organizationId: string; values: any[]; membershipId?: string | null },
    context: Reactory.Server.IReactoryContext,
  ) {
    return demographicsService(context).saveSelfServiceValues(
      params.organizationId,
      params.values || [],
      params.membershipId || null,
      context,
    );
  }
}

export default DemographicResolver;
