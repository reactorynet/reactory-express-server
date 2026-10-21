import mongoose from 'mongoose';

const { ObjectId, Mixed } = mongoose.Schema.Types;

/**
 * ORG-003: organization-scoped demographic definitions.
 *
 * A definition describes *what* an organization tracks (for example "Gender",
 * "Employment type" or "Business unit"), how it is typed, validated and
 * rendered. Values live in `reactory_demographic_values` and reference the
 * definition by ObjectId, keeping the definition's `key` as a snapshot for
 * stable reporting.
 *
 * `organization: null` marks a global template definition that organizations
 * can copy/seed from (design decision D2 in the organization configuration
 * plan). Definitions are soft-deleted (`deleted`) rather than removed so that
 * historical values keep resolving.
 */

/** Grouping used by the configuration UI to order/partition definitions. */
export const DEMOGRAPHIC_CATEGORIES = [
  'personal',
  'employment',
  'organizational',
  'compliance',
] as const;

export type DemographicCategory = typeof DEMOGRAPHIC_CATEGORIES[number];

/** Storage/editing type of the value a definition captures. */
export const DEMOGRAPHIC_VALUE_TYPES = [
  'string',
  'number',
  'boolean',
  'date',
  'enum',
  'multi-enum',
  'object',
  'array',
  'reference',
] as const;

export type DemographicValueType = typeof DEMOGRAPHIC_VALUE_TYPES[number];

/** Model a `reference` definition may point at. */
export const DEMOGRAPHIC_REFERENCE_MODELS = [
  'BusinessUnit',
  'Team',
  'Region',
  'OperationalGroup',
  'User',
] as const;

export type DemographicReferenceModel = typeof DEMOGRAPHIC_REFERENCE_MODELS[number];

/** One choice of an `enum` / `multi-enum` definition. */
export interface IDemographicOption {
  key: string;
  label?: string;
  ordinal?: number;
  deprecated?: boolean;
}

/** Structural demographic binding (business unit, team, region, ...). */
export interface IDemographicReference {
  model: DemographicReferenceModel;
  multiple?: boolean;
}

/**
 * Optional custom input component. `componentPropsMap` maps context paths
 * (e.g. `definition.options`) onto the component's prop names, following the
 * existing Reactory `ui:props-map` convention (design decision D8).
 */
export interface IDemographicWidget {
  componentFqn?: string;
  componentProps?: Record<string, unknown>;
  componentPropsMap?: Record<string, string>;
}

/**
 * A demographic definition document.
 *
 * NOTE: `schema` is a reserved property name on a Mongoose document (it is the
 * document's own schema), so always address it with `document.get('schema')`
 * and `document.set('schema', ...)`.
 */
export interface IDemographicDefinition {
  organization?: mongoose.Types.ObjectId | string | null;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  category?: DemographicCategory;
  valueType: DemographicValueType;
  schema?: Record<string, unknown> | null;
  options?: IDemographicOption[] | mongoose.Types.DocumentArray<IDemographicOption>;
  reference?: IDemographicReference | null;
  widget?: IDemographicWidget | null;
  required?: boolean;
  multiValued?: boolean;
  sensitive?: boolean;
  searchable?: boolean;
  enabled?: boolean;
  ordinal?: number;
  roles?: string[];
  system?: boolean;
  deleted?: boolean;
  createdBy?: mongoose.Types.ObjectId | string;
  updatedBy?: mongoose.Types.ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Hydrated document for a definition. `schema` is deliberately typed as the
 * data field here; the Mongoose `Document#schema` accessor is restored on the
 * prototype below so internals keep working.
 */
export type IDemographicDefinitionDocument = mongoose.HydratedDocument<IDemographicDefinition>;

const DemographicOptionSchema = new mongoose.Schema<IDemographicOption>(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },
    label: String,
    ordinal: {
      type: Number,
      default: 0,
    },
    deprecated: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const DemographicReferenceSchema = new mongoose.Schema<IDemographicReference>(
  {
    model: {
      type: String,
      required: true,
      enum: DEMOGRAPHIC_REFERENCE_MODELS,
    },
    multiple: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const DemographicWidgetSchema = new mongoose.Schema<IDemographicWidget>(
  {
    componentFqn: String,
    componentProps: Mixed,
    componentPropsMap: Mixed,
  },
  { _id: false },
);

export const DemographicDefinitionSchema = new mongoose.Schema({
  // `null` = global template definition, not owned by any organization.
  organization: {
    type: ObjectId,
    ref: 'Organization',
    default: null,
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: String,
  icon: String,
  category: {
    type: String,
    enum: DEMOGRAPHIC_CATEGORIES,
    default: 'personal',
  },
  valueType: {
    type: String,
    enum: DEMOGRAPHIC_VALUE_TYPES,
    required: true,
  },
  // JSON Schema fragment. Used for `object`/`array` payloads and for extra
  // validation on any type (see utils/validateDemographicValue.ts).
  schema: {
    type: Mixed,
    default: undefined,
  },
  options: {
    type: [DemographicOptionSchema],
    default: undefined,
  },
  reference: {
    type: DemographicReferenceSchema,
    default: undefined,
  },
  widget: {
    type: DemographicWidgetSchema,
    default: undefined,
  },
  // Behavioural flags.
  required: {
    type: Boolean,
    default: false,
  },
  multiValued: {
    type: Boolean,
    default: false,
  },
  // PII marker: gates reporting/export and audit logging.
  sensitive: {
    type: Boolean,
    default: false,
  },
  searchable: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  ordinal: {
    type: Number,
    default: 0,
  },
  // Read/edit role restrictions for the configuration surface.
  roles: {
    type: [String],
    default: [],
  },
  // Seeded base definitions: an organization may rename/reorder/disable them
  // but must not change their value type.
  system: {
    type: Boolean,
    default: false,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// A definition key is unique per organization. Because `organization` is null
// for global templates, the same constraint also keeps the template library
// free of duplicate keys (null indexes as a value in MongoDB).
DemographicDefinitionSchema.index({ organization: 1, key: 1 }, { unique: true });

// Listing/filtering for the configuration screen excludes soft-deleted rows.
DemographicDefinitionSchema.index({ organization: 1, deleted: 1 });

const DemographicDefinition = mongoose.model<IDemographicDefinition>(
  'DemographicDefinition',
  DemographicDefinitionSchema,
  'reactory_demographic_definitions',
);

/**
 * Mongoose cannot compile a path called `schema`: `Document#schema` is used
 * internally (array casting, nested-path setters) and `$__setSchema()` skips
 * assigning it when a path with that name exists, leaving `doc.schema`
 * undefined. The persisted field has to be called `schema`, so we keep the path
 * and restore the document accessor on the prototype.
 *
 * Consequence for callers: read and write the JSON Schema through
 * `doc.get('schema')` / `doc.set('schema', ...)`, never `doc.schema`.
 */
Object.defineProperty(DemographicDefinition.prototype, 'schema', {
  configurable: true,
  enumerable: false,
  get(this: { $__schema?: mongoose.Schema }) {
    return this.$__schema;
  },
});

export default DemographicDefinition;
