'use strict';
import Reactory from '@reactorynet/reactory-core';
import { IUserImportStruct } from './types';
import { BusinessUnit, Region, Team, OperationalGroup } from '@reactory/server-modules/reactory-core/models';
import { find } from 'lodash';
import validateDemographicValue from '@reactory/server-modules/reactory-core/utils/validateDemographicValue';
import {
  LEGACY_SETTINGS_DEFINITION_MAP,
  isLegacyId,
  legacyIdString,
  mapLegacyValue,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicMapping';
import type {
  ILegacyValueFieldMapping,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicMapping';
// Type-only import (erased): the concrete service takes an explicit execution
// context on its mutating methods.
import type { OrganizationService } from '@reactory/server-modules/reactory-core/services/OrganizationService';
import type { IDemographicValueInput } from '@reactory/server-modules/reactory-core/services/DemographicsService';

/**
 * ORG-040: retargeted user-demographics import processor.
 *
 * Before ORG-040 this processor called two GraphQL resolvers that no longer
 * exist in this repository (an organization-demographics-settings query and a
 * user-demographic mutation), so every import silently produced `null` data and
 * the write went through the legacy `UserService.setUserDemographics` path. It
 * now:
 *
 *  - reads the organization's collection switches from the ORG-003 definitions
 *    and the ORG-006 policy through `DemographicsService` (`list` + `getPolicy`),
 *    deriving the same eight booleans the legacy settings sheet exposed;
 *  - writes every value through `DemographicsService.saveValues`, which
 *    validates against the organization's definitions, snapshots `key`/
 *    `valueType`, and upserts on `(organization, definition, user)` so a
 *    re-import is idempotent.
 *
 * The structural import steps (business unit, team, region) are unchanged in
 * behaviour: the new `reference` definitions store ids, so the records still
 * have to exist before a value can point at them. The legacy
 * `reactory_demographics` find-or-create steps are gone: the seeded definitions
 * own their option lists now, and a value that does not match an option is
 * reported on the import row instead of creating a stray legacy document.
 */

const DEMOGRAPHICS_SERVICE_ID = 'core.DemographicsService@1.0.0';

/** The eight legacy switches plus the policy context that produced them. */
export interface IOrganizationDemographicsSettings {
  age: boolean;
  gender: boolean;
  race: boolean;
  region: boolean;
  position: boolean;
  operationalGroup: boolean;
  businessUnit: boolean;
  teams: boolean;
  /** ORG-006 policy: the member-facing self-service switch. */
  selfServiceEnabled: boolean;
  /** ORG-006 policy: definitions only an administrator may edit. */
  adminOnlyKeys: string[];
  /** Definition documents by lower-case key (for value mapping/validation). */
  definitions: Record<string, any>;
}

class UserDemographicsProcessor implements Reactory.Service.IProcessor {

  context: Reactory.Server.IReactoryContext;

  name: string = "UserDemographicsProcessor";
  nameSpace: string = "core";
  version: string = "1.0.0";

  props: any;

  fileService: Reactory.Service.IReactoryFileService;
  packageManager: Reactory.IReactoryImportPackageManager;
  organizationService: OrganizationService;
  demographicsService: any;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.context = context;
    this.props = props;
    const dependencies = props?.$dependencies || {};
    this.fileService = dependencies.fileService;
    this.organizationService = dependencies.organizationService;
    this.packageManager = props?.packman;

    if (dependencies.demographicsService) {
      this.demographicsService = dependencies.demographicsService;
    } else {
      try {
        this.demographicsService = context.getService(DEMOGRAPHICS_SERVICE_ID);
      } catch (error) {
        this.demographicsService = null;
      }
    }
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * The ORG-006 equivalent of the retired organization-demographics-settings
   * resolver.
   *
   * The eight legacy booleans were "does this organization collect field X?".
   * In the new model that is the definition's `enabled` flag, so the booleans are
   * derived from the organization's seeded definitions (disabled definitions
   * included, otherwise we could not tell "disabled" from "missing"). The policy
   * is read as well so the caller has the self-service switch and the
   * administrator-only keys the legacy resolver's consumers expected.
   *
   * A definition that does not exist is reported as `false` (do not import into
   * a field the organization has no definition for) rather than throwing: one
   * unseeded organization must not stop a file import for every other one.
   */
  getOrganizationDemographicsSettings = async (
    organizationId: string,
  ): Promise<IOrganizationDemographicsSettings> => {
    if (!this.demographicsService || typeof this.demographicsService.list !== 'function') {
      throw new Error(
        `DemographicsService [${DEMOGRAPHICS_SERVICE_ID}] is not available to the demographics import processor`,
      );
    }

    const [definitions, policy] = await Promise.all([
      this.demographicsService.list(organizationId, true, this.context),
      this.demographicsService.getPolicy(organizationId, this.context),
    ]);

    const byKey: Record<string, any> = {};
    (Array.isArray(definitions) ? definitions : []).forEach((definition: any) => {
      const key = `${definition?.key || ''}`.trim().toLowerCase();
      if (key.length > 0) byKey[key] = definition;
    });

    const settings: IOrganizationDemographicsSettings = {
      age: false,
      gender: false,
      race: false,
      region: false,
      position: false,
      operationalGroup: false,
      businessUnit: false,
      teams: false,
      selfServiceEnabled: policy?.selfServiceEnabled !== false,
      adminOnlyKeys: Array.isArray(policy?.adminOnlyKeys) ? policy.adminOnlyKeys.map((key: any) => `${key}`) : [],
      definitions: byKey,
    };

    LEGACY_SETTINGS_DEFINITION_MAP.forEach((mapping) => {
      // `byKey` is indexed by the stored (lower-case) definition key.
      const definition = byKey[`${mapping.definitionKey}`.toLowerCase()];
      // Missing definition => cannot import that field.
      (settings as any)[mapping.legacyField] = !!definition && definition.enabled !== false;
    });

    return settings;
  };

  /** Finds or creates the business units named on the import rows. */
  private async synchronizeBusinessUnits(
    output: any[],
    organizationId: string,
  ): Promise<void> {
    if (!output.some((row) => row?.demographics?.businessUnit)) return;

    const all_business_units: any[] = await BusinessUnit.find({ organization: organizationId }).then();

    for (const import_struct of output) {
      const { demographics } = import_struct;
      if (!demographics?.businessUnit) continue;

      const title = `${demographics.businessUnit}`.trim();
      if (title.length === 0) continue;

      let businessUnit = find(all_business_units, (candidate: any) => `${candidate.name}`.trim() === title);

      if (businessUnit === null || businessUnit === undefined) {
        this.context.log(
          `Business unit ${title} not found creating new entry`,
          {},
          'debug',
          'UserDemographicsProcessor',
        );
        businessUnit = await this.organizationService.createBusinessUnit(organizationId, title, this.context);
        all_business_units.push(businessUnit);
      }

      if (businessUnit?._id) demographics.businessUnit = businessUnit._id;
    }
  }

  /** Finds or creates the teams named on the import rows. */
  private async synchronizeTeams(
    output: any[],
    organizationId: string,
  ): Promise<void> {
    if (!output.some((row) => row?.demographics?.team)) return;

    const all_teams: any[] = await Team.find({ organization: organizationId }).then();

    for (const import_struct of output) {
      const { demographics } = import_struct;
      if (!demographics?.team) continue;

      const title = `${demographics.team}`.trim();
      if (title.length === 0) continue;

      let team = find(all_teams, (candidate: any) => `${candidate.name}`.trim() === title);

      if (team === null || team === undefined) {
        this.context.log(
          `Team ${title} not found creating new entry`,
          {},
          'debug',
          'UserDemographicsProcessor',
        );
        team = await this.organizationService.createTeam(organizationId, title, this.context);
        all_teams.push(team);
      }

      if (team?._id) demographics.team = team._id;
    }
  }

  /** Finds or creates the regions named on the import rows. */
  private async synchronizeRegions(
    output: any[],
    organizationId: string,
  ): Promise<void> {
    if (!output.some((row) => row?.demographics?.region)) return;

    const all_regions: any[] = await Region.find({ organization: organizationId }).then();

    for (const import_struct of output) {
      const { demographics } = import_struct;
      if (!demographics?.region) continue;

      const title = `${demographics.region}`.trim();
      if (title.length === 0) continue;

      if (isLegacyId(demographics.region)) continue; // already an id

      const key = `${title.toLowerCase()}::${organizationId}`;
      let region = find(all_regions, (candidate: any) => candidate.key === key);

      if (region === null || region === undefined) {
        region = new Region({ organization: organizationId, key, title });
        await region.save().then();
        all_regions.push(region);
      }

      if (region?._id) demographics.region = region._id;
    }
  }

  /**
   * Resolves an operational group id for a legacy import title.
   *
   * `OperationalGroup` has no organization column and no create method, so a
   * missing group is an import error on that row rather than a new global
   * record. Creating one would leak a record into every tenant.
   */
  private async resolveOperationalGroupId(title: string): Promise<string | null> {
    const trimmed = `${title || ''}`.trim();
    if (trimmed.length === 0) return null;

    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match: any = await OperationalGroup.findOne({
      title: new RegExp(`^${escaped}$`, 'i'),
    }).then();

    return legacyIdString(match?._id);
  }

  /**
   * Maps one legacy import field onto a value the definition accepts, returning
   * `null` when the field is absent or not writable. Validation failures are
   * pushed onto the import row so the operator sees the field and the reason.
   */
  private mapField(
    import_struct: IUserImportStruct,
    mapping: ILegacyValueFieldMapping,
    definition: any,
    enabled: boolean,
  ): { key: string; value: unknown } | null {
    const rawValue = (import_struct.demographics as any)?.[mapping.legacyField];

    // Order matters. A *supplied* value is checked against the organization's
    // configuration before the enabled flag is consulted, because the two
    // conditions mean different things:
    //   - no definition  -> the field is not tracked here at all; dropping the
    //                       value silently would lose data, so it is a row error.
    //   - enabled false  -> an administrator deliberately switched the field
    //                       off; skipping is the intended behaviour and must not
    //                       spam the import report.
    // Checking `enabled` first conflated the two and made the missing-definition
    // error unreachable (a missing definition forces enabled === false).
    if (rawValue === null || rawValue === undefined) return null;
    if (typeof rawValue === 'string' && rawValue.trim().length === 0) return null;

    if (!definition) {
      import_struct.errors.push(
        `Demographic definition [${mapping.definitionKey}] is not configured for this organization; ${mapping.legacyField} not imported`,
      );
      return null;
    }

    if (!enabled) return null;

    const mapped = mapLegacyValue(definition, rawValue);
    if (mapped.ok === false) {
      import_struct.errors.push(
        `Demographic ${mapping.legacyField} value '${rawValue}' was not imported: ${mapped.detail}`,
      );
      return null;
    }

    const validation = validateDemographicValue(definition, mapped.value);
    if (validation.valid === false) {
      const first = validation.errors[0];
      import_struct.errors.push(
        `Demographic ${mapping.legacyField} value '${rawValue}' was not imported: ${first?.path || '(value)'}: ${first?.message}`,
      );
      return null;
    }

    return { key: mapping.definitionKey, value: mapped.value };
  }

  /**
   * Writes every imported row through `DemographicsService.saveValues`.
   *
   * Each row is written independently: a bad row (unmapped enum option, missing
   * reference record, permission problem) is reported on that row and the rest
   * of the file still imports. That mirrors the old processor, which also kept
   * going past a failing user.
   */
  private async writeDemographics(
    output: any[],
    organizationId: string,
    settings: IOrganizationDemographicsSettings,
  ): Promise<void> {
    const mappings: ReadonlyArray<ILegacyValueFieldMapping> = [
      { legacyField: 'dob', definitionKey: 'dateOfBirth' },
      { legacyField: 'gender', definitionKey: 'gender' },
      { legacyField: 'race', definitionKey: 'race' },
      { legacyField: 'position', definitionKey: 'position' },
      { legacyField: 'region', definitionKey: 'region' },
      { legacyField: 'businessUnit', definitionKey: 'businessUnit' },
      { legacyField: 'team', definitionKey: 'team' },
      { legacyField: 'operationalGroup', definitionKey: 'operationalGroup' },
    ];

    const enablement: Record<string, boolean> = {
      dateOfBirth: settings.age,
      gender: settings.gender,
      race: settings.race,
      position: settings.position,
      region: settings.region,
      businessUnit: settings.businessUnit,
      team: settings.teams,
      operationalGroup: settings.operationalGroup,
    };

    for (const import_struct of output) {
      if (!import_struct?.user?.id) continue;
      if (`${import_struct.user.email || ''}`.indexOf('ERR') >= 0) continue;

      const values: IDemographicValueInput[] = [];

      for (const mapping of mappings) {
        const definition = settings.definitions[`${mapping.definitionKey}`.toLowerCase()];
        const enabled = enablement[mapping.definitionKey] === true;

        if (mapping.legacyField === 'operationalGroup') {
          const raw = (import_struct.demographics as any)?.operationalGroup;
          if (raw === null || raw === undefined || `${raw}`.trim().length === 0) continue;

          // Same distinction as `mapField`: a supplied value against an
          // unseeded definition is an error, a disabled definition is not.
          if (!definition) {
            import_struct.errors.push(
              `Demographic definition [operationalGroup] is not configured for this organization; operationalGroup not imported`,
            );
            continue;
          }

          if (!enabled) continue;

          const operationalGroupId = await this.resolveOperationalGroupId(`${raw}`);
          if (!operationalGroupId) {
            import_struct.errors.push(
              `Operational group '${raw}' was not imported: no OperationalGroup matches that title`,
            );
            continue;
          }

          const validation = validateDemographicValue(definition, operationalGroupId);
          if (validation.valid === false) {
            const first = validation.errors[0];
            import_struct.errors.push(
              `Demographic operationalGroup value '${raw}' was not imported: ${first?.path || '(value)'}: ${first?.message}`,
            );
            continue;
          }

          values.push({ user: import_struct.user.id, key: mapping.definitionKey, value: operationalGroupId, source: 'import' });
          continue;
        }

        const mapped = this.mapField(import_struct, mapping, definition, enabled);
        if (!mapped) continue;

        values.push({
          user: import_struct.user.id,
          key: mapped.key,
          value: mapped.value,
          source: 'import',
        });
      }

      if (values.length === 0) {
        import_struct.demographic_result = { data: { demographics: [] }, errors: [] };
        continue;
      }

      try {
        const saved = await this.demographicsService.saveValues(organizationId, values, this.context);

        import_struct.demographic_result = { data: { demographics: saved }, errors: [] };
        this.context.log(
          this.context.colors.green(
            `Demographics for user ${import_struct.user.email} written through DemographicsService`,
          ),
          {},
          'debug',
          'UserDemographicsProcessor',
        );
      } catch (error: any) {
        import_struct.errors.push(
          `Error while processing user demographic data ${import_struct.user.email}: ${error?.message || error}`,
        );
        import_struct.demographic_result = { errors: [error] };
      }
    }
  }

  /**
   * @param params - parameters can include row offset
   */
  async process(params: Reactory.Models.IProcessorParams, nextProcessor?: Reactory.Service.IProcessor): Promise<any> {

    const processorParams = params as any;
    const { file, import_package, process_index = 0, next, input = [], preview = false } = processorParams;
    let output: any[] = Array.isArray(input) ? [...input] : [];

    const { organization } = import_package || {};
    const organizationId = legacyIdString(organization?._id || organization?.id) || `${organization?._id || organization?.id || ''}`;

    if (preview === false && organizationId.length > 0) {
      // Structural records first: the new reference definitions store ids.
      await this.synchronizeBusinessUnits(output, organizationId);
      await this.synchronizeTeams(output, organizationId);
      await this.synchronizeRegions(output, organizationId);

      let settings: IOrganizationDemographicsSettings;
      try {
        settings = await this.getOrganizationDemographicsSettings(organizationId);
      } catch (error: any) {
        this.context.log(
          `Could not load demographics configuration for organization ${organizationId}: ${error?.message || error}`,
          { error },
          'error',
          'UserDemographicsProcessor',
        );
        settings = null;
      }

      if (settings) {
        await this.writeDemographics(output, organizationId, settings);
      } else {
        output.forEach((import_struct: IUserImportStruct) => {
          import_struct.errors = Array.isArray(import_struct.errors) ? import_struct.errors : [];
          import_struct.errors.push(
            `Demographics for user ${import_struct?.user?.email || 'unknown'} were not imported: the organization demographics configuration could not be loaded`,
          );
        });
      }
    }

    let $next: Reactory.Service.IProcessor = this.packageManager.getNextProcessor();

    if ($next !== null && $next.process) {
      output = await $next.process({ input: output, file, import_package, process_index: process_index + 1 }).then();
    }

    return output;
  }


  static dependencies: string[] = [
    'core.ReactoryFileService@1.0.0',
    'core.DemographicsService@1.0.0',
  ];
  static reactory = {
    id: 'core.UserFileImportProcessDemographics@1.0.0',
    nameSpace: 'core',
    name: 'UserFileImportProcessDemographics',
    version: '1.0.0',
    description: 'Reactory Service for importing demographics.',
    dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' },
      { id: "core.OrganizationService@1.0.0", alias: 'organizationService' },
      { id: 'core.DemographicsService@1.0.0', alias: 'demographicsService' },
    ],
    serviceType: 'data',
    service: (props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) => {
      return new UserDemographicsProcessor(props, context);
    }
  };
}

export default UserDemographicsProcessor;
