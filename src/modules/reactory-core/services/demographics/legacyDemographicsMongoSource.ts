import { ObjectId } from 'mongodb';
import PersonalDemographic from '@reactory/server-modules/reactory-core/models/PersonalDemographic';
import UserDemographics from '@reactory/server-modules/reactory-core/models/UserDemographics';
import User from '@reactory/server-modules/reactory-core/models/User';
import BusinessUnit from '@reactory/server-modules/reactory-core/models/BusinessUnit';
import OperationalGroup from '@reactory/server-modules/reactory-core/models/OperationalGroup';
import Organization from '@reactory/server-modules/reactory-core/models/Organization';
import Region from '@reactory/server-modules/reactory-core/models/Region';
import Team from '@reactory/server-modules/reactory-core/models/Team';
import Demographic from '@reactory/server-modules/reactory-core/models/demographics/Demographic';
import DemographicDefinition from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';
import DemographicValue from '@reactory/server-modules/reactory-core/models/demographics/DemographicValue';
import OrganizationDemographicsSettings from '@reactory/server-modules/reactory-core/models/demographics/OrganizationDemographicsSettings';
import type {
  ILegacyDemographicsSource,
  ILegacyDemographicReference,
  ILegacyExistingValue,
  ILegacyMembershipRecord,
  ILegacyMigrationTarget,
  ILegacyMigrationValueInput,
  ILegacyOrganizationSettingsRecord,
  ILegacyPersonalDemographicRecord,
  ILegacyUserDemographicRecord,
  ILegacyUserMemberships,
} from '@reactory/server-modules/reactory-core/services/demographics/legacyDemographicsMigration';

/**
 * ORG-040: Mongo-backed read side and `DemographicsService` write side for the
 * legacy demographics migration.
 *
 * The legacy models are imported directly (not through the models barrel) so the
 * adapter only registers the collections it actually reads. Everything here is
 * read-only against `reactory_personal_demographics`,
 * `reactory_user_demographics`, `reactory_organization_demographic_settings`
 * and `reactory_demographics`; the only writes go through
 * `DemographicsService` via `createDemographicsServiceTarget`.
 */

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Valid, de-duplicated ObjectIds. De-duplicating matters: the engine builds its
 * organization list from several record sources, so the same id legitimately
 * appears more than once and there is no reason to ask Mongo for it twice.
 */
const toObjectIds = (ids: string[]): ObjectId[] => {
  const seen = new Set<string>();

  return (Array.isArray(ids) ? ids : [])
    .filter((id): id is string => typeof id === 'string' && ObjectId.isValid(id))
    .filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((id) => new ObjectId(id));
};

/**
 * Builds the read side over the live legacy collections.
 *
 * `listDefinitions` deliberately includes soft-deleted definitions: the engine
 * distinguishes "never seeded" from "an administrator deleted it" in the report,
 * and neither is a reason to write.
 */
export const createMongoLegacyDemographicsSource = (): ILegacyDemographicsSource => ({
  listPersonalDemographics: async (): Promise<ILegacyPersonalDemographicRecord[]> =>
    (await PersonalDemographic.find({}).lean().exec()) as any[],

  listUserDemographics: async (): Promise<ILegacyUserDemographicRecord[]> =>
    (await UserDemographics.find({}).lean().exec()) as any[],

  listOrganizationSettings: async (): Promise<ILegacyOrganizationSettingsRecord[]> =>
    (await OrganizationDemographicsSettings.find({ deleted: { $ne: true } }).lean().exec()) as any[],

  listUserMemberships: async (userIds: string[]): Promise<ILegacyUserMemberships[]> => {
    const ids = toObjectIds(userIds);
    if (ids.length === 0) return [];

    const users = await User.find({ _id: { $in: ids } }, { memberships: 1 }).lean().exec() as any[];

    return users.map((user) => ({
      userId: `${user._id}`,
      memberships: (Array.isArray(user.memberships) ? user.memberships : []) as ILegacyMembershipRecord[],
    }));
  },

  listDefinitions: async (organizationIds: string[]): Promise<any[]> => {
    const ids = toObjectIds(organizationIds);
    if (ids.length === 0) return [];
    return (await DemographicDefinition.find({ organization: { $in: ids } }).lean().exec()) as any[];
  },

  listExistingValues: async (
    organizationIds: string[],
    userIds: string[],
  ): Promise<ILegacyExistingValue[]> => {
    const organizations = toObjectIds(organizationIds);
    const users = toObjectIds(userIds);
    if (organizations.length === 0 || users.length === 0) return [];

    return (await DemographicValue.find(
      { organization: { $in: organizations }, user: { $in: users } },
      { organization: 1, user: 1, key: 1, value: 1 },
    ).lean().exec()) as any[];
  },

  listLegacyDemographicReferences: async (ids: string[]): Promise<ILegacyDemographicReference[]> => {
    const objectIds = toObjectIds(ids);
    if (objectIds.length === 0) return [];
    return (await Demographic.find(
      { _id: { $in: objectIds } },
      { type: 1, key: 1, title: 1 },
    ).lean().exec()) as any[];
  },

  findOperationalGroupByTitle: async (title: string): Promise<{ _id?: any } | null> => {
    if (typeof title !== 'string' || title.trim().length === 0) return null;
    const expression = new RegExp(`^${escapeRegularExpression(title.trim())}$`, 'i');
    return (await OperationalGroup.findOne({ title: expression }).lean().exec()) as any;
  },

  referenceExists: async (model: string, id: string): Promise<boolean> => {
    if (!ObjectId.isValid(id)) return false;
    const objectId = new ObjectId(id);

    const models: Record<string, any> = {
      BusinessUnit,
      OperationalGroup,
      Organization,
      Region,
      Team,
    };

    const candidate = models[model];
    if (!candidate) return false;

    const count = await candidate.countDocuments({ _id: objectId }).exec();
    return Number(count) > 0;
  },
});

/**
 * Adapts `DemographicsService` to the migration's write interface.
 *
 * Both methods require the operator's execution context: `saveValues` and
 * `setEnabled` run `assertOrgAdmin` per organization, which is exactly the guard
 * rail we want for a data migration.
 */
export const createDemographicsServiceTarget = (
  demographicsService: any,
  executionContext: any,
): ILegacyMigrationTarget => ({
  writeValues: async (organizationId: string, values: ILegacyMigrationValueInput[]): Promise<any> =>
    demographicsService.saveValues(organizationId, values, executionContext),
  setEnabled: async (organizationId: string, key: string, enabled: boolean): Promise<any> =>
    demographicsService.setEnabled(organizationId, key, enabled, executionContext),
});

export default createMongoLegacyDemographicsSource;
