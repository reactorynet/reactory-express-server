import mongoose from 'mongoose';
import Reactory from '@reactorynet/reactory-core';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Schema for IReactoryFeatureFlag - the definition/registry of a feature flag.
 * Each module registers its feature flags using this structure.
 */
export const ReactoryFeatureFlagSchema = new mongoose.Schema<Reactory.Server.IReactoryFeatureFlag>({
  nameSpace: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  version: {
    type: String,
    default: '1.0.0',
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  permissions: {
    viewer: [String],
    editor: [String],
    admin: [String],
  },
  form: String,
}, {
  timestamps: true,
});

/**
 * Schema for IReactoryFeatureFlagValue - a configured instance of a feature flag
 * bound to a specific partner/application. These are embedded in ReactoryClient.
 */
export const ReactoryFeatureFlagValueSchema = new mongoose.Schema(
  {
    /**
     * Reference to the feature flag definition. Can be stored as an ObjectId ref,
     * an FQN string, or an embedded document.
     */
    feature: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    /**
     * The partner / application this flag is scoped to.
     * If null, the flag applies to ALL partners.
     */
    partner: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'ReactoryClient',
      default: null,
    },
    /**
     * The organization this flag is scoped to.
     */
    organization: {
      type: ObjectId,
      ref: 'Organization',
      default: null,
    },
    /**
     * The business unit this flag is scoped to.
     */
    businessUnit: {
      type: ObjectId,
      ref: 'BusinessUnit',
      default: null,
    },
    /**
     * ISO 2-digit country codes for region-scoped flags
     */
    regions: [String],
    /**
     * Application roles that this flag applies to
     */
    roles: [String],
    /**
     * Specific users this flag applies to
     */
    users: [
      {
        type: mongoose.Schema.Types.Mixed,
        ref: 'User',
      },
    ],
    /**
     * Time zones this flag applies to
     */
    timezones: [String],
    /**
     * The value of the feature flag. Stored as mixed to support
     * boolean, string, number, or complex object values.
     */
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: false,
    },
    /**
     * Whether this feature flag instance is enabled.
     */
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false, // embedded document, no separate _id needed
  },
);

/**
 * Standalone ReactoryFeatureFlag model for registering and querying
 * the catalogue of available feature flags across all modules.
 */
const ReactoryFeatureFlagModel = mongoose.model<Reactory.Server.IReactoryFeatureFlag>(
  'ReactoryFeatureFlag',
  ReactoryFeatureFlagSchema,
  'reactory_feature_flags',
);

export const REACTORY_FEATURE_FLAG = 'ReactoryFeatureFlag';

export default ReactoryFeatureFlagModel;
