import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * ORG-006: organization-level demographics policy.
 *
 * Design decision D4 calls for a thin, single-document policy per
 * organization. It deliberately does *not* replace
 * `OrganizationDemographicSettings` - that legacy model is a flat sheet of
 * eight booleans and is deprecated. This document holds only the settings
 * that govern how the demographic configuration and value surfaces behave:
 *
 * - `selfServiceEnabled` - members may maintain their own values
 *   (`MySaveDemographics`). When false only an organization administrator can
 *   write values.
 * - `adminOnlyKeys` - definition keys that are never self-service, even when
 *   `selfServiceEnabled` is true (for example a verified compliance flag).
 * - `minimumAggregationGroupSize` - the smallest cohort a report may return
 *   (k-anonymity). Consumed by ORG-035; stored here so the configuration UI
 *   and the aggregation pipeline share one source of truth.
 * - `retentionDays` - how long values are retained, or `null` for indefinite.
 *
 * The document is created on first write; a read with no stored document
 * returns the defaults without persisting anything, so an organization that
 * never touches the demographics screen leaves no orphan rows behind.
 */

export interface IOrganizationDemographicsPolicy {
  organization: mongoose.Types.ObjectId | string;
  selfServiceEnabled?: boolean;
  adminOnlyKeys?: string[];
  minimumAggregationGroupSize?: number;
  retentionDays?: number | null;
  deleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IOrganizationDemographicsPolicyDocument =
  mongoose.HydratedDocument<IOrganizationDemographicsPolicy>;

/**
 * Defaults applied to every policy read and write. Kept as a frozen constant
 * so the service and the GraphQL surface cannot drift, and so callers can
 * spread it into a fresh document without mutating it.
 */
export const ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS = Object.freeze({
  selfServiceEnabled: true,
  adminOnlyKeys: [] as string[],
  minimumAggregationGroupSize: 5,
  retentionDays: null as number | null,
});

export const OrganizationDemographicsPolicySchema = new mongoose.Schema(
  {
    organization: {
      type: ObjectId,
      ref: 'Organization',
      required: true,
    },
    // Members may maintain their own values.
    selfServiceEnabled: {
      type: Boolean,
      default: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.selfServiceEnabled,
    },
    // Definition keys restricted to administrators regardless of the flag above.
    adminOnlyKeys: {
      type: [String],
      default: (): string[] => [],
    },
    // k-anonymity floor for aggregation/reporting (ORG-035).
    minimumAggregationGroupSize: {
      type: Number,
      default: ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS.minimumAggregationGroupSize,
      min: 1,
    },
    // null = retain indefinitely.
    retentionDays: {
      type: Number,
      default: null,
      min: 1,
    },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Exactly one policy document per organization.
OrganizationDemographicsPolicySchema.index({ organization: 1 }, { unique: true });

const OrganizationDemographicsPolicy = mongoose.model<IOrganizationDemographicsPolicy>(
  'OrganizationDemographicsPolicy',
  OrganizationDemographicsPolicySchema,
  'reactory_organization_demographics_policies',
);

export default OrganizationDemographicsPolicy;
