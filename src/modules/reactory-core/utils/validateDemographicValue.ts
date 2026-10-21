import Ajv, { ErrorObject, Schema, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  DEMOGRAPHIC_REFERENCE_MODELS,
  DEMOGRAPHIC_VALUE_TYPES,
  IDemographicDefinition,
} from '../models/demographics/DemographicDefinition';

/**
 * ORG-003: validation for demographic values.
 *
 * A definition is the contract for a value document, so this helper is the one
 * place that answers "is this value acceptable for this definition?". It is
 * deliberately database-free: a `reference` definition only has its id shape
 * checked, never resolved. Callers that need referential integrity do that
 * themselves.
 *
 * Rules, in order:
 *  1. `required`   - null/undefined is rejected for required definitions.
 *  2. `multiValued` - an array is required when true, and arrays are rejected
 *                     when false. Two types store an array as their *single*
 *                     value: `valueType: 'array'` and a `reference` with
 *                     `multiple: true`.
 *  3. value type   - scalar shape checks per `valueType`.
 *  4. enum options - membership of the option keys.
 *  5. reference    - id shape of the model reference(s).
 *  6. schema       - JSON Schema validation via ajv when `schema` is present.
 *
 * Input: the definition may be a plain object, a lean document or a hydrated
 * Mongoose document. Document fields are read through `get()` where the
 * document accessor differs from the stored value (notably `schema`).
 */

export interface IDemographicValidationError {
  /** Dotted path into the value, e.g. `address.city`, `[0]`, `aliases[2]`. */
  path: string;
  message: string;
}

export interface IDemographicValidationResult {
  valid: boolean;
  errors: IDemographicValidationError[];
}

/**
 * Structural subset of a definition that the validator needs. Accepts a plain
 * object, a lean document or a hydrated Mongoose document for the definition.
 */
export type DemographicDefinitionInput = Partial<IDemographicDefinition> | null | undefined;

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);

/**
 * Compiled validators are cached by schema text: a demographic definition is
 * validated once per saved value, so recompiling the same schema on every
 * keystroke/save would be wasted work.
 */
const schemaCache = new Map<string, { validate?: ValidateFunction; error?: string }>();

const HEX_OBJECT_ID = /^[0-9a-fA-F]{24}$/;

const isSupportedValueType = (valueType: string): boolean =>
  (DEMOGRAPHIC_VALUE_TYPES as readonly string[]).includes(valueType);

const isSupportedReferenceModel = (model: string): boolean =>
  (DEMOGRAPHIC_REFERENCE_MODELS as readonly string[]).includes(model);

/**
 * Shape-only id check: a 24 character hex string, a BSON/ObjectId instance
 * (anything exposing `toHexString`) or an object/document carrying a valid
 * `_id`. Nothing is looked up.
 */
export function isDemographicReferenceId(value: unknown): boolean {
  if (value === null || value === undefined) return false;

  if (typeof value === 'string') return HEX_OBJECT_ID.test(value);

  if (typeof value === 'object') {
    const candidate = value as { toHexString?: unknown; _id?: unknown };
    if (typeof candidate.toHexString === 'function') return true;
    if (candidate._id !== undefined) return isDemographicReferenceId(candidate._id);
  }

  return false;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

/**
 * Read a definition field from a plain/lean object *or* a hydrated Mongoose
 * document.
 *
 * `schema` must be read this way, never as `definition.schema`:
 * `DemographicDefinition` persists the JSON Schema in a path called `schema`
 * and restores Mongoose's `Document#schema` accessor on the model prototype so
 * Mongoose internals keep working (see the model's own note). On a hydrated
 * document `definition.schema` is therefore the compiled Mongoose Schema - a
 * circular structure - not the JSON Schema.
 */
const readDefinitionPath = (definition: DemographicDefinitionInput, path: string): unknown => {
  const candidate = definition as { get?: (name: string) => unknown } | null | undefined;
  if (candidate && typeof candidate.get === 'function') return candidate.get(path);
  return (definition as Record<string, unknown> | null | undefined)?.[path];
};

/**
 * A compiled Mongoose `Schema` is a plain-looking object, so `isPlainObject()`
 * alone would let it through to `JSON.stringify` (which throws on its circular
 * graph). Detect it structurally to fail deterministically instead.
 */
const isMongooseSchemaLike = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as {
    constructor?: { name?: string };
    paths?: unknown;
    path?: unknown;
  };

  if (candidate.constructor?.name === 'Schema') return true;

  return (
    typeof candidate.paths === 'object' &&
    candidate.paths !== null &&
    typeof candidate.path === 'function'
  );
};

const isDateLike = (value: unknown): boolean => {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === 'string' || typeof value === 'number') {
    return !Number.isNaN(new Date(value).getTime());
  }
  return false;
};

const appendSegment = (path: string, segment: string): string => {
  if (/^\d+$/.test(segment)) return `${path}[${segment}]`;
  return path === '' ? segment : `${path}.${segment}`;
};

/** Translate an ajv JSON pointer (`/address/city`) into a dotted path. */
const pathFromPointer = (base: string, pointer: string): string =>
  pointer
    .split('/')
    .filter((segment) => segment.length > 0)
    .reduce((path, segment) => appendSegment(path, segment), base);

const messageForAjvError = (error: ErrorObject): string => {
  switch (error.keyword) {
    case 'required': {
      const missing = (error.params as { missingProperty?: string }).missingProperty;
      return missing ? `'${missing}' is required` : 'is required';
    }
    case 'additionalProperties': {
      const extra = (error.params as { additionalProperty?: string }).additionalProperty;
      return extra ? `'${extra}' is not an allowed property` : 'is not an allowed property';
    }
    case 'type': {
      const type = (error.params as { type?: string }).type;
      return type ? `must be of type ${type}` : 'has the wrong type';
    }
    default:
      return error.message ?? 'is invalid';
  }
};

const mapAjvError = (error: ErrorObject, basePath: string): IDemographicValidationError => {
  // `required` and `additionalProperties` errors point at the containing object;
  // report the offending property itself so callers get a field-level path.
  if (error.keyword === 'required') {
    const missing = (error.params as { missingProperty?: string }).missingProperty;
    if (missing) {
      return {
        path: pathFromPointer(basePath, `${error.instancePath}/${missing}`),
        message: messageForAjvError(error),
      };
    }
  }

  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty?: string }).additionalProperty;
    if (extra) {
      return {
        path: pathFromPointer(basePath, `${error.instancePath}/${extra}`),
        message: messageForAjvError(error),
      };
    }
  }

  return {
    path: pathFromPointer(basePath, error.instancePath),
    message: messageForAjvError(error),
  };
};

const NOT_A_SCHEMA_OBJECT = 'Definition schema is not a JSON Schema object';

/**
 * Cache key for a schema, or `undefined` when the value cannot be serialised
 * (circular structure, BigInt, a class instance such as a Mongoose Schema).
 * Never throws: the caller turns `undefined` into a field-level error.
 */
const schemaCacheKey = (schema: Record<string, unknown>): string | undefined => {
  try {
    const key = JSON.stringify(schema);
    return typeof key === 'string' ? key : undefined;
  } catch {
    return undefined;
  }
};

const compiledSchema = (schema: unknown): { validate?: ValidateFunction; error?: string } => {
  if (!isPlainObject(schema) || isMongooseSchemaLike(schema)) {
    return { error: NOT_A_SCHEMA_OBJECT };
  }

  const cacheKey = schemaCacheKey(schema);
  if (cacheKey === undefined) return { error: NOT_A_SCHEMA_OBJECT };

  const cached = schemaCache.get(cacheKey);
  if (cached) return cached;

  let entry: { validate?: ValidateFunction; error?: string };

  try {
    entry = { validate: ajv.compile(schema as Schema) };
  } catch (compileError) {
    const detail = compileError instanceof Error ? compileError.message : String(compileError);
    entry = { error: `Definition schema is not a valid JSON Schema: ${detail}` };
  }

  schemaCache.set(cacheKey, entry);
  return entry;
};

const validateEnumMembership = (
  options: IDemographicDefinition['options'],
  value: unknown,
  path: string,
  errors: IDemographicValidationError[],
): void => {
  const keys = Array.isArray(options)
    ? options
        .map((option) => option?.key)
        .filter((key): key is string => typeof key === 'string')
    : [];

  if (keys.length === 0) {
    errors.push({
      path: 'options',
      message: 'Enum definition has no options to validate against',
    });
    return;
  }

  if (typeof value !== 'string' && typeof value !== 'number') {
    errors.push({ path, message: 'Value must be one of the enum option keys' });
    return;
  }

  if (!keys.includes(String(value))) {
    errors.push({
      path,
      message: `'${String(value)}' is not one of the allowed options: ${keys.join(', ')}`,
    });
  }
};

const validateReference = (
  definition: DemographicDefinitionInput,
  value: unknown,
  path: string,
  errors: IDemographicValidationError[],
): void => {
  const reference = definition?.reference;

  if (!reference || typeof reference !== 'object' || typeof reference.model !== 'string') {
    errors.push({
      path: 'reference.model',
      message: 'Reference definition must declare a model',
    });
    return;
  }

  if (!isSupportedReferenceModel(reference.model)) {
    errors.push({
      path: 'reference.model',
      message: `Unsupported reference model '${reference.model}'`,
    });
    return;
  }

  if (reference.multiple === true) {
    if (!Array.isArray(value)) {
      errors.push({ path, message: `Value must be an array of ${reference.model} ids` });
      return;
    }

    value.forEach((item, index) => {
      if (!isDemographicReferenceId(item)) {
        errors.push({
          path: `${path}[${index}]`,
          message: `Value must be a ${reference.model} id`,
        });
      }
    });
    return;
  }

  if (Array.isArray(value)) {
    errors.push({ path, message: `Value must be a single ${reference.model} id` });
    return;
  }

  if (!isDemographicReferenceId(value)) {
    errors.push({ path, message: `Value must be a ${reference.model} id` });
  }
};

const validateAgainstSchema = (
  definition: DemographicDefinitionInput,
  value: unknown,
  path: string,
  errors: IDemographicValidationError[],
): void => {
  const schema = readDefinitionPath(definition, 'schema');

  if (!isPlainObject(schema) || Object.keys(schema).length === 0) return;

  const compiled = compiledSchema(schema);

  if (compiled.error) {
    errors.push({ path: 'schema', message: compiled.error });
    return;
  }

  if (compiled.validate && compiled.validate(value) !== true) {
    (compiled.validate.errors ?? []).forEach((error) => errors.push(mapAjvError(error, path)));
  }
};

const validateSingleValue = (
  definition: DemographicDefinitionInput,
  valueType: string,
  value: unknown,
  path: string,
  errors: IDemographicValidationError[],
): void => {
  if (!isSupportedValueType(valueType)) {
    errors.push({
      path: 'valueType',
      message: `Unsupported demographic value type '${valueType}'`,
    });
    return;
  }

  switch (valueType) {
    case 'enum':
    case 'multi-enum':
      validateEnumMembership(definition?.options, value, path, errors);
      break;
    case 'reference':
      validateReference(definition, value, path, errors);
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push({ path, message: 'Value must be a finite number' });
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({ path, message: 'Value must be a boolean' });
      }
      break;
    case 'date':
      if (!isDateLike(value)) {
        errors.push({ path, message: 'Value must be a valid date' });
      }
      break;
    case 'object':
      if (!isPlainObject(value)) {
        errors.push({ path, message: 'Value must be an object' });
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ path, message: 'Value must be an array' });
      }
      break;
    case 'string':
    default:
      if (typeof value !== 'string') {
        errors.push({ path, message: 'Value must be a string' });
      }
      break;
  }

  // A definition may carry a JSON Schema for extra validation on any type.
  validateAgainstSchema(definition, value, path, errors);
};

/**
 * Validate a candidate value against a demographic definition.
 *
 * @param definition the definition (plain object, lean doc or Mongoose doc)
 * @param value      the candidate value; an array when `multiValued`
 */
export function validateDemographicValue(
  definition: DemographicDefinitionInput,
  value: unknown,
): IDemographicValidationResult {
  const errors: IDemographicValidationError[] = [];

  if (!definition || typeof definition !== 'object') {
    return {
      valid: false,
      errors: [{ path: '', message: 'A demographic definition is required' }],
    };
  }

  const valueType = typeof definition.valueType === 'string' ? definition.valueType : 'string';
  const multiValued = definition.multiValued === true;
  // An array is the *value* (rather than a collection of values) for `array`
  // definitions and for references that point at several records.
  const arrayIsSingleValue =
    valueType === 'array' ||
    (valueType === 'reference' && definition.reference?.multiple === true);

  if (value === undefined || value === null) {
    if (definition.required === true) {
      errors.push({ path: '', message: 'A value is required for this demographic' });
    }
    return { valid: errors.length === 0, errors };
  }

  if (multiValued) {
    if (!Array.isArray(value)) {
      errors.push({
        path: '',
        message: 'Value must be an array because the definition is multi-valued',
      });
    } else {
      value.forEach((item, index) =>
        validateSingleValue(definition, valueType, item, `[${index}]`, errors),
      );
    }
  } else if (Array.isArray(value) && !arrayIsSingleValue) {
    // Every other type rejects arrays when the definition is single-valued.
    errors.push({
      path: '',
      message: 'Value must not be an array because the definition is single-valued',
    });
  } else {
    validateSingleValue(definition, valueType, value, '', errors);
  }

  return { valid: errors.length === 0, errors };
}

export default validateDemographicValue;
