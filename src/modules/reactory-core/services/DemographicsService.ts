import { ObjectId } from 'mongodb';
import Reactory from '@reactorynet/reactory-core';
import {
  DemographicDefinition,
  DemographicValue,
  OrganizationDemographicsPolicy,
} from '@reactory/server-modules/reactory-core/models';
import validateDemographicValue from '@reactory/server-modules/reactory-core/utils/validateDemographicValue';
import ApiError, { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { service } from '@reactory/server-core/application/decorators/service';
import {
  DEMOGRAPHIC_CATEGORIES,
  DEMOGRAPHIC_REFERENCE_MODELS,
  DEMOGRAPHIC_VALUE_TYPES,
} from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';
import {
  ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS,
} from '@reactory/server-modules/reactory-core/models/demographics/OrganizationDemographicsPolicy';

/**
 * ORG-006: demographics configuration and value service.
 *
 * This is the single write path for `DemographicDefinition` and
 * `DemographicValue`. The resolver layer is deliberately thin; every guard
 * rail lives here so plugin and workflow callers get exactly the same
 * behaviour as the GraphQL surface.
 *
 * Authorization is organization-scoped, mirroring `OrganizationService`
 * (ORG-005): a coarse role check only proves the caller holds a role
 * *somewhere*, so every configuration mutation runs `assertOrgAdmin` against
 * the target organization, resolved from the caller's membership record and
 * never from document-level roles. Callers must pass their execution context
 * explicitly - the resolver does - so the check evaluates the caller rather
 * than whatever context the singleton happened to be constructed with.
 */

/** A definition as accepted by `save`. Mirrors `IDemographicDefinition`. */
export interface IDemographicDefinitionInput {
  id?: string;
  _id?: string;
  key?: string;
  title?: string;
  description?: string | null;
  icon?: string | null;
  category?: string;
  valueType?: string;
  schema?: Record<string, unknown> | null;
  options?: Array<{ key: string; label?: string; ordinal?: number; deprecated?: boolean }>;
  reference?: { model: string; multiple?: boolean } | null;
  widget?: {
    componentFqn?: string;
    componentProps?: Record<string, unknown>;
    componentPropsMap?: Record<string, string>;
  } | null;
  required?: boolean;
  multiValued?: boolean;
  sensitive?: boolean;
  searchable?: boolean;
  enabled?: boolean;
  ordinal?: number;
  roles?: string[];
  system?: boolean;
}

/** Filters accepted by `listValues`. */
export interface IDemographicValueFilter {
  user?: string;
  membership?: string;
  key?: string;
  definition?: string;
  value?: unknown;
  source?: string;
  verified?: boolean;
}

/** A value as accepted by `saveValue` / `saveValues`. */
export interface IDemographicValueInput {
  id?: string;
  user?: string;
  membership?: string | null;
  key?: string;
  definition?: string;
  value?: unknown;
  source?: string;
  verified?: boolean;
  effectiveFrom?: string | Date | null;
  effectiveTo?: string | Date | null;
}

/** A policy update. Every field is optional; omitted fields keep their value. */
export interface IDemographicsPolicyInput {
  selfServiceEnabled?: boolean;
  adminOnlyKeys?: string[];
  minimumAggregationGroupSize?: number;
  retentionDays?: number | null;
}

/** Shape returned by `getPolicy` when no policy document has been stored yet. */
export interface IOrganizationDemographicsPolicyDefaults {
  organization: string;
  selfServiceEnabled: boolean;
  adminOnlyKeys: string[];
  minimumAggregationGroupSize: number;
  retentionDays: number | null;
  deleted: boolean;
}

/** Paged value result, matching the `PagingResult` GraphQL type. */
export interface IDemographicValuePage {
  values: any[];
  paging: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

/** A single field-level validation failure. */
export interface IDemographicFieldError {
  path: string;
  message: string;
}

const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

@service({
  id: DEMOGRAPHICS_SERVICE_ID,
  name: 'ReactoryDemographicsService',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Organization demographics configuration and value service.',
  serviceType: 'demographics',
  lifeCycle: 'singleton',
})
export class DemographicsService {
  name: string = 'DemographicsService';
  nameSpace: string = 'core';
  version: string = '1.0.0';

  context: Reactory.Server.IReactoryContext;
  props: any;

  constructor(props: any, context: any) {
    this.context = context;
    this.props = props || {};
  }

  // ---------------------------------------------------------------------------
  // Execution context and authorization
  // ---------------------------------------------------------------------------

  /**
   * Resolves the execution context that owns this call. Callers should pass
   * their request context explicitly; `this.context` remains the fallback for
   * legacy call sites.
   */
  private resolveExecutionContext(
    executionContext?: Reactory.Server.IReactoryContext,
  ): Reactory.Server.IReactoryContext {
    const context = executionContext || this.context;
    if (!context) {
      throw new ApiError('An execution context is required to determine the acting user');
    }
    return context;
  }

  /** The acting user's id. Never silently falls back to a system user. */
  private resolveActorId(executionContext?: Reactory.Server.IReactoryContext): any {
    const { user } = this.resolveExecutionContext(executionContext);
    if (!user || !user._id) {
      throw new ApiError('An authenticated user is required to determine the acting user');
    }
    return user._id;
  }

  /** Roles are always evaluated against the caller's partner, never globally. */
  private resolvePartnerId(executionContext?: Reactory.Server.IReactoryContext): string {
    const { partner } = this.resolveExecutionContext(executionContext);
    if (!partner || !partner._id) {
      throw new InsufficientPermissions(
        'A partner (client) context is required to evaluate organization permissions',
      );
    }
    return `${partner._id}`;
  }

  /**
   * True when the caller holds `role` on exactly this organization.
   *
   * `user.hasRole(partnerId, role, organizationId)` is deliberately not used:
   * it ends with an unconditional document-level fallback, and user
   * provisioning copies membership roles onto the user document, so an
   * ORGANIZATION_ADMIN would pass for *every* organization. The membership is
   * the only authoritative source. Business-unit memberships and disabled
   * memberships confer nothing.
   */
  private hasOrganizationRole(
    user: Reactory.Models.IUserDocument,
    clientId: string,
    organizationId: string,
    role: string,
  ): boolean {
    const memberships: any[] = Array.isArray(user?.memberships)
      ? (user.memberships as any[])
      : [];

    return memberships.some((membership) => {
      if (!membership) return false;
      if (!membership.clientId || `${membership.clientId}` !== clientId) return false;
      if (!membership.organizationId || `${membership.organizationId}` !== organizationId) return false;
      if (membership.businessUnitId !== null && membership.businessUnitId !== undefined) {
        return false;
      }
      if (membership.enabled === false) return false;
      if (!Array.isArray(membership.roles)) return false;
      return membership.roles.includes(role);
    });
  }

  /**
   * Organization-scoped authorization. Admits a platform `ADMIN` for the
   * caller's partner or an `ORGANIZATION_ADMIN` holding the role on *this*
   * organization's membership. Unauthenticated callers, a missing partner and
   * an invalid organization id all throw - there is no fall-through, because a
   * permission check that passes on malformed input is worse than none.
   */
  private assertOrgAdmin(
    organizationId: string | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext,
  ): void {
    const context = this.resolveExecutionContext(executionContext);
    const { user } = context;

    if (!user || !user._id) {
      throw new InsufficientPermissions(
        'An authenticated user is required to administer an organization',
      );
    }

    if (!organizationId || ObjectId.isValid(organizationId as any) === false) {
      throw new ApiError(`param id is not a valid ${organizationId}`);
    }

    const partnerId = this.resolvePartnerId(context);

    if (user.hasRole(partnerId, 'ADMIN') === true) return;

    if (this.hasOrganizationRole(user, partnerId, `${organizationId}`, 'ORGANIZATION_ADMIN') === true) {
      return;
    }

    throw new InsufficientPermissions(
      `User [${user._id}] does not have permission to administer organization [${organizationId}]`,
      { organizationId: `${organizationId}`, partnerId },
    );
  }

  /**
   * Boolean form of `assertOrgAdmin` for read paths that have a legitimate
   * non-admin outcome (a member reading their own values). It never swallows a
   * malformed organization id: that is rejected before this helper is used.
   */
  private hasOrgAdmin(
    organizationId: string | ObjectId,
    executionContext?: Reactory.Server.IReactoryContext,
  ): boolean {
    try {
      this.assertOrgAdmin(organizationId, executionContext);
      return true;
    } catch (error) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Shared helpers
  // ---------------------------------------------------------------------------

  private assertValidOrganizationId(organizationId: string): void {
    if (!organizationId || ObjectId.isValid(organizationId) === false) {
      throw new ApiError(`param id is not a valid ${organizationId}`);
    }
  }

  private normalizeKey(value?: string | null): string | null {
    if (typeof value !== 'string') return null;
    const key = value.trim().toLowerCase();
    return key.length > 0 ? key : null;
  }

  /** Field-level rejection: the message stays short, the detail is in `meta.fields`. */
  private rejectInvalid(message: string, fields: IDemographicFieldError[], meta: Record<string, any> = {}): never {
    throw new ApiError(message, { ...meta, fields });
  }

  /**
   * Structural validation of a definition payload. Returns field-level errors
   * rather than one opaque string so the configuration form can highlight the
   * offending input.
   */
  private validateDefinition(input: IDemographicDefinitionInput, creating: boolean): IDemographicFieldError[] {
    const errors: IDemographicFieldError[] = [];

    if (creating && !this.normalizeKey(input.key)) {
      errors.push({ path: 'key', message: 'A key is required' });
    }

    if (creating || input.title !== undefined) {
      if (typeof input.title !== 'string' || input.title.trim().length === 0) {
        errors.push({ path: 'title', message: 'A title is required' });
      }
    }

    if (creating || input.valueType !== undefined) {
      if (typeof input.valueType !== 'string' ||
        (DEMOGRAPHIC_VALUE_TYPES as readonly string[]).includes(input.valueType) === false) {
        errors.push({
          path: 'valueType',
          message: `valueType must be one of: ${DEMOGRAPHIC_VALUE_TYPES.join(', ')}`,
        });
      }
    }

    if (input.category !== undefined &&
      (DEMOGRAPHIC_CATEGORIES as readonly string[]).includes(`${input.category}`) === false) {
      errors.push({
        path: 'category',
        message: `category must be one of: ${DEMOGRAPHIC_CATEGORIES.join(', ')}`,
      });
    }

    const valueType = input.valueType;
    const options = input.options;

    if ((valueType === 'enum' || valueType === 'multi-enum') && options !== undefined) {
      if (!Array.isArray(options) || options.length === 0) {
        errors.push({ path: 'options', message: 'Enum definitions require at least one option' });
      } else {
        const seen = new Set<string>();
        options.forEach((option, index) => {
          if (!option || typeof option.key !== 'string' || option.key.trim().length === 0) {
            errors.push({ path: `options[${index}].key`, message: 'An option key is required' });
            return;
          }
          const key = option.key.trim().toLowerCase();
          if (seen.has(key)) {
            errors.push({ path: `options[${index}].key`, message: `Duplicate option key '${option.key}'` });
          }
          seen.add(key);
        });
      }
    }

    if (valueType === 'reference' && input.reference !== undefined) {
      const model = input.reference && input.reference.model;
      if (!model || (DEMOGRAPHIC_REFERENCE_MODELS as readonly string[]).includes(`${model}`) === false) {
        errors.push({
          path: 'reference.model',
          message: `reference.model must be one of: ${DEMOGRAPHIC_REFERENCE_MODELS.join(', ')}`,
        });
      }
    }

    return errors;
  }

  /** Copies the supplied (non-undefined) fields onto a definition document. */
  private applyDefinitionUpdates(
    document: any,
    input: IDemographicDefinitionInput,
    actorId: any,
  ): void {
    const assign = (field: string, value: unknown) => {
      if (value !== undefined) document[field] = value;
    };

    assign('title', typeof input.title === 'string' ? input.title.trim() : input.title);
    assign('description', input.description);
    assign('icon', input.icon);
    assign('category', input.category);
    assign('valueType', input.valueType);
    assign('required', input.required);
    assign('multiValued', input.multiValued);
    assign('sensitive', input.sensitive);
    assign('searchable', input.searchable);
    assign('enabled', input.enabled);
    assign('ordinal', input.ordinal);
    assign('roles', input.roles);

    // `schema` is a reserved Mongoose document accessor; always go through
    // set()/get() on this model (see DemographicDefinition's own note).
    if (input.schema !== undefined) {
      document.set('schema', input.schema);
    }

    if (input.options !== undefined) {
      document.options = Array.isArray(input.options)
        ? input.options.map((option) => ({
            key: `${option.key}`.trim().toLowerCase(),
            label: option.label,
            ordinal: option.ordinal ?? 0,
            deprecated: option.deprecated === true,
          }))
        : [];
    }

    if (input.reference !== undefined) {
      document.reference = input.reference === null
        ? null
        : { model: input.reference.model, multiple: input.reference.multiple === true };
    }

    if (input.widget !== undefined) {
      document.widget = input.widget === null
        ? null
        : {
            componentFqn: input.widget.componentFqn,
            componentProps: input.widget.componentProps,
            componentPropsMap: input.widget.componentPropsMap,
          };
    }

    document.updatedBy = actorId;
  }

  /**
   * Loads a definition that belongs to this organization. Values may never be
   * written against another organization's definition, so the organization
   * scope is re-checked on the document even though the query already filters
   * on it.
   */
  private async resolveDefinition(
    organizationId: string,
    input: { key?: string; definition?: string },
  ): Promise<any> {
    this.assertValidOrganizationId(organizationId);
    const organization = new ObjectId(organizationId);

    let definition: any = null;

    if (input.definition) {
      if (ObjectId.isValid(input.definition) === false) {
        throw new ApiError(`param definition is not a valid ${input.definition}`);
      }
      definition = await DemographicDefinition.findOne({
        _id: new ObjectId(input.definition),
        organization,
        deleted: { $ne: true },
      }).then();
    } else {
      const key = this.normalizeKey(input.key);
      if (!key) throw new ApiError('A demographic definition key or id is required');
      definition = await DemographicDefinition.findOne({
        organization,
        key,
        deleted: { $ne: true },
      }).then();
    }

    if (!definition) {
      throw new ApiError(
        `Demographic definition [${input.definition || input.key}] was not found in organization [${organizationId}]`,
        { organizationId, key: input.key, definition: input.definition },
      );
    }

    if (!definition.organization || `${definition.organization}` !== `${organizationId}`) {
      throw new ApiError(
        `Demographic definition [${definition.key}] does not belong to organization [${organizationId}]`,
        { organizationId, key: definition.key },
      );
    }

    return definition;
  }

  private policyAllowsSelfService(policy: any): boolean {
    return !policy || policy.selfServiceEnabled !== false;
  }

  private isAdminOnlyKey(policy: any, key: string): boolean {
    const keys: string[] = Array.isArray(policy?.adminOnlyKeys) ? policy.adminOnlyKeys : [];
    return keys.map((candidate) => `${candidate}`.trim().toLowerCase()).includes(`${key}`.trim().toLowerCase());
  }

  // ---------------------------------------------------------------------------
  // Definitions
  // ---------------------------------------------------------------------------

  /**
   * Lists the organization's definitions, ordered for the configuration screen.
   * `includeDisabled` includes definitions an administrator has switched off;
   * soft-deleted definitions are never returned.
   */
  async list(
    organizationId: string,
    includeDisabled: boolean = false,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any[]> {
    // Reads are authenticated even though they are not administrator-only.
    this.resolveActorId(executionContext);
    this.assertValidOrganizationId(organizationId);

    const query: Record<string, any> = {
      organization: new ObjectId(organizationId),
      deleted: { $ne: true },
    };

    if (includeDisabled !== true) query.enabled = true;

    return DemographicDefinition.find(query)
      .sort({ ordinal: 1, title: 1 })
      .then();
  }

  /** Loads one definition by key. */
  async get(
    organizationId: string,
    key: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    this.resolveActorId(executionContext);
    this.assertValidOrganizationId(organizationId);
    const normalized = this.normalizeKey(key);
    if (!normalized) throw new ApiError('A demographic definition key is required');

    const definition = await DemographicDefinition.findOne({
      organization: new ObjectId(organizationId),
      key: normalized,
      deleted: { $ne: true },
    }).then();

    if (!definition) {
      throw new ApiError(
        `Demographic definition [${normalized}] was not found in organization [${organizationId}]`,
        { organizationId, key: normalized },
      );
    }

    return definition;
  }

  /**
   * Creates or updates a definition.
   *
   * Guard rails:
   * - the `key` is immutable once the definition exists;
   * - a `system` definition cannot change its `valueType` (nor drop the flag,
   *   which would otherwise be a two-step way around the first rule);
   * - the payload is validated before anything is written.
   */
  async save(
    organizationId: string,
    definition: IDemographicDefinitionInput,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    this.assertOrgAdmin(organizationId, executionContext);
    const organization = new ObjectId(organizationId);
    const actorId = this.resolveActorId(executionContext);
    const input: IDemographicDefinitionInput = definition || {};
    const key = this.normalizeKey(input.key);
    const identifier = input.id || input._id;

    let existing: any = null;

    if (identifier) {
      if (ObjectId.isValid(`${identifier}`) === false) {
        throw new ApiError(`param id is not a valid ${identifier}`);
      }
      existing = await DemographicDefinition.findOne({
        _id: new ObjectId(`${identifier}`),
        organization,
      }).then();
      if (!existing) {
        throw new ApiError(
          `Demographic definition [${identifier}] was not found in organization [${organizationId}]`,
          { organizationId, id: `${identifier}` },
        );
      }
    } else if (key) {
      existing = await DemographicDefinition.findOne({ organization, key }).then();
    }

    if (existing) {
      const existingKey = this.normalizeKey(existing.key);

      // A soft-deleted definition is retained (its values keep resolving) but
      // must not be silently revived by an ordinary save; the caller would not
      // see it in the listing afterwards. Creating it again would hit the
      // unique key index, so say exactly what happened instead.
      if (existing.deleted === true) {
        throw new ApiError(
          `Demographic definition [${existingKey}] has been deleted and cannot be updated`,
          { organizationId, key: existingKey },
        );
      }

      if (key && key !== existingKey) {
        throw new ApiError(
          `The key of demographic definition [${existingKey}] is immutable and cannot be changed to [${key}]`,
          { organizationId, key: existingKey, requestedKey: key },
        );
      }

      if (existing.system === true) {
        if (input.valueType !== undefined && input.valueType !== existing.valueType) {
          throw new ApiError(
            `System demographic definition [${existingKey}] cannot change its value type from [${existing.valueType}] to [${input.valueType}]`,
            { organizationId, key: existingKey, valueType: existing.valueType },
          );
        }
        if (input.system === false) {
          throw new ApiError(
            `System demographic definition [${existingKey}] cannot be converted to a user-defined definition`,
            { organizationId, key: existingKey },
          );
        }
      }

      const errors = this.validateDefinition(input, false);
      if (errors.length > 0) {
        this.rejectInvalid(`Demographic definition [${existingKey}] is not valid`, errors, {
          organizationId,
          key: existingKey,
        });
      }

      this.applyDefinitionUpdates(existing, input, actorId);
      await existing.save().then();
      return existing;
    }

    if (!key) throw new ApiError('A demographic definition key is required');

    const createInput: IDemographicDefinitionInput = { ...input, key };
    const errors = this.validateDefinition(createInput, true);
    if (errors.length > 0) {
      this.rejectInvalid('Demographic definition is not valid', errors, { organizationId, key });
    }

    const document: any = new DemographicDefinition({
      organization,
      key,
      createdBy: actorId,
      updatedBy: actorId,
      deleted: false,
    });

    this.applyDefinitionUpdates(document, createInput, actorId);
    await document.save().then();
    return document;
  }

  /**
   * Soft-deletes a definition. Definitions referenced by stored values are
   * retained: deleting them would orphan those values, so the caller is told
   * to disable the definition instead.
   */
  async remove(
    organizationId: string,
    key: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    this.assertOrgAdmin(organizationId, executionContext);
    const actorId = this.resolveActorId(executionContext);
    const definition = await this.get(organizationId, key, executionContext);

    const referencedValues = await DemographicValue.countDocuments({
      organization: new ObjectId(organizationId),
      definition: definition._id,
    }).then();

    if (referencedValues > 0) {
      throw new ApiError(
        `Demographic definition [${definition.key}] cannot be deleted because ${referencedValues} value(s) still reference it. Disable the definition instead.`,
        { organizationId, key: definition.key, referencedValues },
      );
    }

    definition.deleted = true;
    definition.updatedBy = actorId;
    await definition.save().then();
    return true;
  }

  /** Applies the supplied key order as the definitions' `ordinal`. */
  async reorder(
    organizationId: string,
    keys: string[],
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any[]> {
    this.assertOrgAdmin(organizationId, executionContext);
    const actorId = this.resolveActorId(executionContext);

    const normalized = (Array.isArray(keys) ? keys : [])
      .map((key) => this.normalizeKey(key))
      .filter((key): key is string => key !== null);

    if (normalized.length === 0) {
      throw new ApiError('At least one demographic definition key is required to reorder');
    }

    const documents: any[] = await DemographicDefinition.find({
      organization: new ObjectId(organizationId),
      key: { $in: normalized },
      deleted: { $ne: true },
    }).then();

    const byKey = new Map<string, any>(
      documents.map((document) => [this.normalizeKey(document.key), document]),
    );

    const missing = normalized.filter((key) => byKey.has(key) === false);
    if (missing.length > 0) {
      throw new ApiError(
        `Demographic definition(s) not found in organization [${organizationId}]: ${missing.join(', ')}`,
        { organizationId, missing },
      );
    }

    const ordered: any[] = [];
    for (let index = 0; index < normalized.length; index += 1) {
      const document = byKey.get(normalized[index]);
      document.ordinal = index;
      document.updatedBy = actorId;
      await document.save().then();
      ordered.push(document);
    }

    return ordered;
  }

  /** Enables or disables one definition without touching its values. */
  async setEnabled(
    organizationId: string,
    key: string,
    enabled: boolean,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    this.assertOrgAdmin(organizationId, executionContext);
    const actorId = this.resolveActorId(executionContext);
    const definition = await this.get(organizationId, key, executionContext);

    definition.enabled = enabled === true;
    definition.updatedBy = actorId;
    await definition.save().then();

    return definition;
  }

  // ---------------------------------------------------------------------------
  // Policy
  // ---------------------------------------------------------------------------

  /**
   * Returns the organization's policy. When none has been stored the defaults
   * are returned **without persisting** them, so reading the configuration
   * screen cannot create a row.
   */
  async getPolicy(
    organizationId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    // A member may read the policy; an anonymous caller may not.
    this.resolveActorId(executionContext);
    this.assertValidOrganizationId(organizationId);

    const stored = await OrganizationDemographicsPolicy.findOne({
      organization: new ObjectId(organizationId),
      deleted: { $ne: true },
    }).then();

    if (stored) return stored;

    const defaults: IOrganizationDemographicsPolicyDefaults = {
      organization: `${organizationId}`,
      selfServiceEnabled: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.selfServiceEnabled,
      adminOnlyKeys: [...ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.adminOnlyKeys],
      minimumAggregationGroupSize: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.minimumAggregationGroupSize,
      retentionDays: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.retentionDays,
      deleted: false,
    };

    return defaults;
  }

  /** Creates the policy on first write; every later write updates it in place. */
  async updatePolicy(
    organizationId: string,
    policy: IDemographicsPolicyInput,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    this.assertOrgAdmin(organizationId, executionContext);
    const input: IDemographicsPolicyInput = policy || {};

    const errors: IDemographicFieldError[] = [];

    if (input.adminOnlyKeys !== undefined && !Array.isArray(input.adminOnlyKeys)) {
      errors.push({ path: 'adminOnlyKeys', message: 'adminOnlyKeys must be an array of definition keys' });
    }

    if (input.minimumAggregationGroupSize !== undefined) {
      const size = input.minimumAggregationGroupSize;
      if (typeof size !== 'number' || Number.isInteger(size) === false || size < 1) {
        errors.push({
          path: 'minimumAggregationGroupSize',
          message: 'minimumAggregationGroupSize must be a whole number of at least 1',
        });
      }
    }

    if (input.retentionDays !== undefined && input.retentionDays !== null) {
      const days = input.retentionDays;
      if (typeof days !== 'number' || Number.isInteger(days) === false || days < 1) {
        errors.push({
          path: 'retentionDays',
          message: 'retentionDays must be a whole number of at least 1, or null to retain indefinitely',
        });
      }
    }

    if (errors.length > 0) {
      this.rejectInvalid('Demographics policy is not valid', errors, { organizationId });
    }

    let document: any = await OrganizationDemographicsPolicy.findOne({
      organization: new ObjectId(organizationId),
    }).then();

    if (!document) {
      document = new OrganizationDemographicsPolicy({
        organization: new ObjectId(organizationId),
        selfServiceEnabled: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.selfServiceEnabled,
        adminOnlyKeys: [],
        minimumAggregationGroupSize: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.minimumAggregationGroupSize,
        retentionDays: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.retentionDays,
        deleted: false,
      });
    }

    if (input.selfServiceEnabled !== undefined) {
      document.selfServiceEnabled = input.selfServiceEnabled === true;
    }

    if (input.adminOnlyKeys !== undefined) {
      document.adminOnlyKeys = Array.from(new Set(
        (input.adminOnlyKeys || [])
          .filter((key) => typeof key === 'string' && key.trim().length > 0)
          .map((key) => key.trim().toLowerCase()),
      ));
    }

    if (input.minimumAggregationGroupSize !== undefined) {
      document.minimumAggregationGroupSize = input.minimumAggregationGroupSize;
    }

    if (input.retentionDays !== undefined) {
      document.retentionDays = input.retentionDays;
    }

    await document.save().then();
    return document;
  }

  // ---------------------------------------------------------------------------
  // Values
  // ---------------------------------------------------------------------------

  /**
   * Organization-wide value listing. Always requires an organization
   * administrator: this is the reporting/compliance surface and a plain member
   * has no business seeing another member's values.
   */
  async listValues(
    organizationId: string,
    filter: IDemographicValueFilter = {},
    paging?: Reactory.Models.IPagingRequest,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<IDemographicValuePage> {
    this.assertOrgAdmin(organizationId, executionContext);

    const query: Record<string, any> = { organization: new ObjectId(organizationId) };
    const criteria: IDemographicValueFilter = filter || {};

    if (criteria.user) {
      if (ObjectId.isValid(criteria.user) === false) throw new ApiError(`param user is not a valid ${criteria.user}`);
      query.user = new ObjectId(criteria.user);
    }

    if (criteria.membership) {
      if (ObjectId.isValid(criteria.membership) === false) {
        throw new ApiError(`param membership is not a valid ${criteria.membership}`);
      }
      query.membership = new ObjectId(criteria.membership);
    }

    if (criteria.definition) {
      if (ObjectId.isValid(criteria.definition) === false) {
        throw new ApiError(`param definition is not a valid ${criteria.definition}`);
      }
      query.definition = new ObjectId(criteria.definition);
    } else if (criteria.key) {
      const key = this.normalizeKey(criteria.key);
      if (!key) throw new ApiError('A demographic definition key is required');
      query.key = key;
    }

    if (criteria.source) query.source = criteria.source;
    if (criteria.verified !== undefined) query.verified = criteria.verified === true;
    if (criteria.value !== undefined) query.value = criteria.value;

    const page = paging?.page && paging.page > 0 ? paging.page : 1;
    const pageSize = paging?.pageSize && paging.pageSize > 0 ? paging.pageSize : 25;

    const [values, total] = await Promise.all([
      DemographicValue.find(query)
        .sort({ key: 1, createdAt: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .then(),
      DemographicValue.countDocuments(query).then(),
    ]);

    return {
      values,
      paging: {
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total,
      },
    };
  }

  /**
   * Returns one user's values.
   *
   * Reading **another** user's values requires organization administration.
   * Reading your own values does not - including values for `sensitive`
   * definitions, which are your own PII and are exactly what the profile screen
   * renders. Organization-wide reads (`listValues`) and another user's values
   * are where the sensitive/administrator rule bites.
   */
  async getUserValues(
    organizationId: string,
    userId: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any[]> {
    this.assertValidOrganizationId(organizationId);
    const context = this.resolveExecutionContext(executionContext);
    const callerId = `${this.resolveActorId(context)}`;

    if (!userId || ObjectId.isValid(userId) === false) {
      throw new ApiError(`param userId is not a valid ${userId}`);
    }

    if (`${userId}` !== callerId) {
      this.assertOrgAdmin(organizationId, context);
    }

    return DemographicValue.find({
      organization: new ObjectId(organizationId),
      user: new ObjectId(userId),
    })
      .sort({ key: 1 })
      .then();
  }

  /** Writes one value, upserting the (organization, definition, user) document. */
  async saveValue(
    organizationId: string,
    input: IDemographicValueInput,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any> {
    const context = this.resolveExecutionContext(executionContext);
    const callerId = `${this.resolveActorId(context)}`;
    this.assertValidOrganizationId(organizationId);

    const payload: IDemographicValueInput = input || {};
    const targetUserId = payload.user ? `${payload.user}` : callerId;

    if (ObjectId.isValid(targetUserId) === false) {
      throw new ApiError(`param user is not a valid ${payload.user}`);
    }

    const isAdmin = this.hasOrgAdmin(organizationId, context);

    if (targetUserId !== callerId) {
      // Writing for somebody else is an administrative act, full stop.
      this.assertOrgAdmin(organizationId, context);
    }

    const definition = await this.resolveDefinition(organizationId, payload);

    if (isAdmin === false) {
      if (definition.enabled === false) {
        throw new ApiError(
          `Demographic definition [${definition.key}] is disabled and cannot be updated`,
          { organizationId, key: definition.key },
        );
      }

      const policy = await this.getPolicy(organizationId, context);

      if (this.policyAllowsSelfService(policy) === false) {
        throw new InsufficientPermissions(
          `Self-service demographics are disabled for organization [${organizationId}]`,
          { organizationId, key: definition.key },
        );
      }

      if (this.isAdminOnlyKey(policy, definition.key)) {
        throw new InsufficientPermissions(
          `Demographic definition [${definition.key}] can only be updated by an organization administrator`,
          { organizationId, key: definition.key },
        );
      }
    }

    const validation = validateDemographicValue(definition, payload.value);
    if (validation.valid === false) {
      this.rejectInvalid(
        `Invalid value for demographic [${definition.key}]`,
        validation.errors,
        { organizationId, key: definition.key, user: targetUserId },
      );
    }

    return this.persistValue({
      organizationId,
      definition,
      userId: targetUserId,
      membershipId: payload.membership || null,
      input: payload,
      actorId: this.resolveActorId(context),
      isAdmin,
      callerId,
    });
  }

  /**
   * Bulk write. Every payload is validated before anything is written, so a
   * bad row cannot leave the batch half-applied. Field-level errors carry the
   * index of the offending value (`values[2].value`).
   */
  async saveValues(
    organizationId: string,
    values: IDemographicValueInput[],
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any[]> {
    this.assertOrgAdmin(organizationId, executionContext);
    const context = this.resolveExecutionContext(executionContext);
    const actorId = this.resolveActorId(context);
    const inputs = Array.isArray(values) ? values : [];

    if (inputs.length === 0) return [];

    const prepared: Array<{ definition: any; input: IDemographicValueInput; userId: string }> = [];
    const errors: IDemographicFieldError[] = [];

    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index] || {};
      const userId = input.user ? `${input.user}` : `${actorId}`;

      if (ObjectId.isValid(userId) === false) {
        errors.push({ path: `values[${index}].user`, message: `'${input.user}' is not a valid user id` });
        continue;
      }

      const definition = await this.resolveDefinition(organizationId, input);
      const validation = validateDemographicValue(definition, input.value);

      if (validation.valid === false) {
        validation.errors.forEach((error) => {
          errors.push({
            path: `values[${index}]${error.path ? `.${error.path}` : ''}`,
            message: error.message,
          });
        });
      }

      prepared.push({ definition, input, userId });
    }

    if (errors.length > 0) {
      this.rejectInvalid('One or more demographic values are invalid', errors, { organizationId });
    }

    return Promise.all(prepared.map((entry) => this.persistValue({
      organizationId,
      definition: entry.definition,
      userId: entry.userId,
      membershipId: entry.input.membership || null,
      input: entry.input,
      actorId,
      isAdmin: true,
      callerId: `${actorId}`,
    })));
  }

  /** Deletes one value document for a user (defaults to the caller). */
  async deleteValue(
    organizationId: string,
    key: string,
    userId?: string,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<boolean> {
    this.assertValidOrganizationId(organizationId);
    const context = this.resolveExecutionContext(executionContext);
    const callerId = `${this.resolveActorId(context)}`;
    const targetUserId = userId ? `${userId}` : callerId;

    if (ObjectId.isValid(targetUserId) === false) {
      throw new ApiError(`param userId is not a valid ${userId}`);
    }

    const isAdmin = this.hasOrgAdmin(organizationId, context);

    if (targetUserId !== callerId) {
      this.assertOrgAdmin(organizationId, context);
    } else if (isAdmin === false) {
      const policy = await this.getPolicy(organizationId, context);
      if (this.policyAllowsSelfService(policy) === false) {
        throw new InsufficientPermissions(
          `Self-service demographics are disabled for organization [${organizationId}]`,
          { organizationId },
        );
      }
    }

    const definition = await this.resolveDefinition(organizationId, { key });

    if (isAdmin === false && this.isAdminOnlyKey(await this.getPolicy(organizationId, context), definition.key)) {
      throw new InsufficientPermissions(
        `Demographic definition [${definition.key}] can only be modified by an organization administrator`,
        { organizationId, key: definition.key },
      );
    }

    const result: any = await DemographicValue.deleteOne({
      organization: new ObjectId(organizationId),
      definition: definition._id,
      user: new ObjectId(targetUserId),
    }).then();

    return result?.deletedCount > 0;
  }

  /**
   * The `MySaveDemographics` write path.
   *
   * There is no `user` parameter: the actor is always the caller. A payload
   * that names a different user is rejected rather than silently rewritten, so
   * a client cannot believe it wrote somebody else's value. Self-service is
   * refused when the organization policy disables it, and per-key
   * `adminOnlyKeys` restrictions are honoured.
   */
  async saveSelfServiceValues(
    organizationId: string,
    values: IDemographicValueInput[],
    membershipId?: string | null,
    executionContext?: Reactory.Server.IReactoryContext,
  ): Promise<any[]> {
    this.assertValidOrganizationId(organizationId);
    const context = this.resolveExecutionContext(executionContext);
    const callerId = `${this.resolveActorId(context)}`;
    const policy = await this.getPolicy(organizationId, context);

    if (this.policyAllowsSelfService(policy) === false) {
      throw new InsufficientPermissions(
        `Self-service demographics are disabled for organization [${organizationId}]`,
        { organizationId },
      );
    }

    const inputs = Array.isArray(values) ? values : [];
    if (inputs.length === 0) return [];

    const prepared: Array<{ definition: any; input: IDemographicValueInput }> = [];
    const errors: IDemographicFieldError[] = [];

    for (let index = 0; index < inputs.length; index += 1) {
      const input = inputs[index] || {};

      if (input.user && `${input.user}` !== callerId) {
        throw new InsufficientPermissions(
          'MySaveDemographics can only write values for the authenticated user',
          { organizationId, callerId, requestedUser: `${input.user}` },
        );
      }

      if (input.source && input.source !== 'user') {
        throw new ApiError(
          `MySaveDemographics cannot set the value source to [${input.source}]`,
          { organizationId, callerId, source: input.source },
        );
      }

      const definition = await this.resolveDefinition(organizationId, input);

      if (definition.enabled === false) {
        errors.push({
          path: `values[${index}].key`,
          message: `Demographic definition [${definition.key}] is disabled`,
        });
        continue;
      }

      if (this.isAdminOnlyKey(policy, definition.key)) {
        errors.push({
          path: `values[${index}].key`,
          message: `Demographic definition [${definition.key}] can only be updated by an organization administrator`,
        });
        continue;
      }

      const validation = validateDemographicValue(definition, input.value);
      if (validation.valid === false) {
        validation.errors.forEach((error) => {
          errors.push({
            path: `values[${index}]${error.path ? `.${error.path}` : ''}`,
            message: error.message,
          });
        });
      }

      prepared.push({ definition, input });
    }

    if (errors.length > 0) {
      this.rejectInvalid('One or more demographic values are invalid', errors, { organizationId });
    }

    return Promise.all(prepared.map((entry) => this.persistValue({
      organizationId,
      definition: entry.definition,
      userId: callerId,
      membershipId: membershipId || entry.input.membership || null,
      input: entry.input,
      actorId: callerId,
      isAdmin: false,
      callerId,
    })));
  }

  /**
   * Single upsert path for a value document. `key` and `valueType` are
   * snapshotted from the definition so historical values keep resolving after
   * a rename or retype.
   */
  private async persistValue(options: {
    organizationId: string;
    definition: any;
    userId: string;
    membershipId?: string | null;
    input: IDemographicValueInput;
    actorId: any;
    isAdmin: boolean;
    callerId: string;
  }): Promise<any> {
    const { organizationId, definition, userId, membershipId, input, actorId, isAdmin, callerId } = options;
    const organization = new ObjectId(organizationId);

    let membership: ObjectId | null = null;
    if (membershipId) {
      if (ObjectId.isValid(`${membershipId}`) === false) {
        throw new ApiError(`param membership is not a valid ${membershipId}`);
      }
      membership = new ObjectId(`${membershipId}`);
    }

    const source = isAdmin === true && `${userId}` !== `${callerId}`
      ? (input.source || 'admin')
      : (input.source || 'user');

    const existing: any = await DemographicValue.findOne({
      organization,
      definition: definition._id,
      user: new ObjectId(userId),
    }).then();

    if (existing) {
      existing.key = definition.key;
      existing.valueType = definition.valueType;
      existing.value = input.value;
      existing.source = source;
      existing.updatedBy = actorId;
      if (input.verified !== undefined) existing.verified = input.verified === true;
      if (input.effectiveFrom !== undefined) {
        existing.effectiveFrom = input.effectiveFrom === null ? null : new Date(input.effectiveFrom);
      }
      if (input.effectiveTo !== undefined) {
        existing.effectiveTo = input.effectiveTo === null ? null : new Date(input.effectiveTo);
      }
      if (membership) existing.membership = membership;

      await existing.save().then();
      return existing;
    }

    const document: any = new DemographicValue({
      organization,
      user: new ObjectId(userId),
      membership,
      definition: definition._id,
      key: definition.key,
      valueType: definition.valueType,
      value: input.value,
      source,
      verified: input.verified === true,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      updatedBy: actorId,
    });

    await document.save().then();
    return document;
  }
}

export const DemographicsServiceDefinition: Reactory.Service.IReactoryServiceDefinition<DemographicsService> = {
  id: DEMOGRAPHICS_SERVICE_ID,
  name: 'ReactoryDemographicsService',
  nameSpace: 'core',
  version: '1.0.0',
  description: 'Organization demographics configuration and value service.',
  serviceType: 'demographics',
  dependencies: [],
  service: (props: Reactory.Service.IReactoryServiceProps, context: any) => {
    return new DemographicsService(props, context);
  },
};

export default DemographicsServiceDefinition;
