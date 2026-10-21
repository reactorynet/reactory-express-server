import mongoose from 'mongoose';
import { DEMOGRAPHIC_VALUE_TYPES } from './DemographicDefinition';

const { ObjectId, Mixed } = mongoose.Schema.Types;

/**
 * ORG-003: organization-scoped demographic values.
 *
 * One document per (organization, definition, user); `value` holds an array
 * when the definition is `multiValued` (design decision D11). `key` and
 * `valueType` are snapshots of the definition at write time so that reports
 * and exports keep working if a definition is renamed or retyped.
 */

/** Who supplied the value. */
export const DEMOGRAPHIC_VALUE_SOURCES = ['user', 'admin', 'import', 'api'] as const;

export type DemographicValueSource = typeof DEMOGRAPHIC_VALUE_SOURCES[number];

export interface IDemographicValue {
  organization: mongoose.Types.ObjectId | string;
  user: mongoose.Types.ObjectId | string;
  membership?: mongoose.Types.ObjectId | string | null;
  definition: mongoose.Types.ObjectId | string;
  /** Snapshot of the definition key (reporting stability). */
  key: string;
  value?: unknown;
  /** Snapshot of the definition value type. */
  valueType?: (typeof DEMOGRAPHIC_VALUE_TYPES)[number];
  source?: DemographicValueSource;
  verified?: boolean;
  effectiveFrom?: Date | null;
  effectiveTo?: Date | null;
  updatedBy?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IDemographicValueDocument = mongoose.HydratedDocument<IDemographicValue>;

export const DemographicValueSchema = new mongoose.Schema({
  organization: {
    type: ObjectId,
    ref: 'Organization',
    required: true,
  },
  user: {
    type: ObjectId,
    ref: 'User',
    required: true,
  },
  // Optional but preferred for users that belong to more than one organization.
  membership: {
    type: ObjectId,
    ref: 'Membership',
    default: null,
  },
  definition: {
    type: ObjectId,
    ref: 'DemographicDefinition',
    required: true,
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  // Scalar, or an array when the definition is multi-valued.
  value: {
    type: Mixed,
    default: undefined,
  },
  valueType: {
    type: String,
    enum: DEMOGRAPHIC_VALUE_TYPES,
  },
  source: {
    type: String,
    enum: DEMOGRAPHIC_VALUE_SOURCES,
    default: 'user',
  },
  verified: {
    type: Boolean,
    default: false,
  },
  effectiveFrom: {
    type: Date,
    default: null,
  },
  effectiveTo: {
    type: Date,
    default: null,
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// A user has at most one value document per definition in an organization.
// Multi-valued definitions keep the array inside that single document, so the
// same constraint covers both cardinalities.
DemographicValueSchema.index({ organization: 1, definition: 1, user: 1 }, { unique: true });

// Aggregation/reporting: "who has value X for definition Y in organization Z".
DemographicValueSchema.index({ organization: 1, definition: 1, value: 1 });

// Profile reads: all values for one member of an organization.
DemographicValueSchema.index({ organization: 1, user: 1 });

const DemographicValue = mongoose.model<IDemographicValue>(
  'DemographicValue',
  DemographicValueSchema,
  'reactory_demographic_values',
);

export default DemographicValue;
