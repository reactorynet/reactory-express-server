import mongoose from 'mongoose';

import {
  validateDemographicValue,
  isDemographicReferenceId,
} from '../validateDemographicValue';
import type { DemographicDefinitionInput } from '../validateDemographicValue';
import DemographicDefinition from '../../models/demographics/DemographicDefinition';

const objectId = (): string => new mongoose.Types.ObjectId().toHexString();

const definition = (
  overrides: Partial<NonNullable<DemographicDefinitionInput>>,
): NonNullable<DemographicDefinitionInput> => ({
  key: 'test',
  title: 'Test',
  valueType: 'string',
  multiValued: false,
  ...overrides,
});

describe('validateDemographicValue — definition guard', () => {
  it('rejects a missing definition', () => {
    const result = validateDemographicValue(null, 'value');

    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('');
    expect(result.errors[0].message).toMatch(/definition is required/i);
  });
});

describe('validateDemographicValue — multiValued cardinality', () => {
  it('accepts an array for a multi-valued definition', () => {
    const result = validateDemographicValue(
      definition({ multiValued: true, valueType: 'string' }),
      ['a', 'b'],
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejects a scalar for a multi-valued definition', () => {
    const result = validateDemographicValue(
      definition({ multiValued: true, valueType: 'string' }),
      'a',
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: '',
        message: expect.stringMatching(/must be an array/i),
      }),
    ]);
  });

  it('rejects an array for a single-valued definition', () => {
    const result = validateDemographicValue(definition({ valueType: 'string' }), ['a']);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: '',
        message: expect.stringMatching(/must not be an array/i),
      }),
    ]);
  });

  it('accepts an array for a single-valued `array` definition', () => {
    // `valueType: 'array'` stores an array as its single value; only other
    // types treat an array as a cardinality violation.
    const result = validateDemographicValue(
      definition({ valueType: 'array', multiValued: false }),
      [1, 2, 3],
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('reports the index of the offending item in a multi-valued array', () => {
    const result = validateDemographicValue(
      definition({ multiValued: true, valueType: 'number' }),
      [1, 'two', 3],
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: '[1]', message: expect.stringMatching(/finite number/i) }),
    ]);
  });
});

describe('validateDemographicValue — required', () => {
  it('rejects null and undefined for required definitions', () => {
    const requiredDefinition = definition({ valueType: 'string', required: true });

    expect(validateDemographicValue(requiredDefinition, null).valid).toBe(false);
    expect(validateDemographicValue(requiredDefinition, undefined).valid).toBe(false);
    expect(validateDemographicValue(requiredDefinition, null).errors[0]).toEqual(
      expect.objectContaining({ path: '', message: expect.stringMatching(/required/i) }),
    );
  });

  it('allows null and undefined for optional definitions', () => {
    expect(validateDemographicValue(definition({ required: false }), null).valid).toBe(true);
    expect(validateDemographicValue(definition({ required: false }), undefined).valid).toBe(true);
  });
});

describe('validateDemographicValue — value types', () => {
  it('accepts values that match their declared type', () => {
    expect(validateDemographicValue(definition({ valueType: 'string' }), 'abc').valid).toBe(true);
    expect(validateDemographicValue(definition({ valueType: 'number' }), 42).valid).toBe(true);
    expect(validateDemographicValue(definition({ valueType: 'boolean' }), false).valid).toBe(true);
    expect(validateDemographicValue(definition({ valueType: 'date' }), new Date()).valid).toBe(true);
    expect(
      validateDemographicValue(definition({ valueType: 'date' }), '2026-01-02T03:04:05.000Z').valid,
    ).toBe(true);
    expect(
      validateDemographicValue(definition({ valueType: 'object' }), { city: 'Cape Town' }).valid,
    ).toBe(true);
  });

  it('rejects values that do not match their declared type', () => {
    expect(validateDemographicValue(definition({ valueType: 'number' }), '42').valid).toBe(false);
    expect(validateDemographicValue(definition({ valueType: 'boolean' }), 'true').valid).toBe(false);
    expect(validateDemographicValue(definition({ valueType: 'date' }), 'not-a-date').valid).toBe(
      false,
    );
    expect(validateDemographicValue(definition({ valueType: 'object' }), 'not-an-object').valid).toBe(
      false,
    );
    expect(validateDemographicValue(definition({ valueType: 'object' }), ['a']).valid).toBe(false);
  });

  it('rejects an unsupported value type', () => {
    const result = validateDemographicValue(definition({ valueType: 'colour' as never }), 'red');

    expect(result.valid).toBe(false);
    expect(result.errors[0].path).toBe('valueType');
  });
});

describe('validateDemographicValue — enum options', () => {
  const gender = definition({
    key: 'gender',
    valueType: 'enum',
    options: [
      { key: 'female', label: 'Female', ordinal: 1 },
      { key: 'male', label: 'Male', ordinal: 2 },
      { key: 'other', label: 'Other', ordinal: 3, deprecated: true },
    ],
  });

  it('accepts a value that is one of the option keys', () => {
    expect(validateDemographicValue(gender, 'female')).toEqual({ valid: true, errors: [] });
  });

  it('still accepts a deprecated option so existing data stays valid', () => {
    expect(validateDemographicValue(gender, 'other').valid).toBe(true);
  });

  it('rejects a value outside the option keys with a field-level message', () => {
    const result = validateDemographicValue(gender, 'unknown');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: '',
        message: expect.stringMatching(/not one of the allowed options/i),
      }),
    ]);
    expect(result.errors[0].message).toContain('female');
  });

  it('rejects an enum definition that declares no options', () => {
    const result = validateDemographicValue(definition({ valueType: 'enum', options: [] }), 'x');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'options', message: expect.stringMatching(/no options/i) }),
    ]);
  });

  it('validates every entry of a multi-enum value', () => {
    const languages = definition({
      key: 'languages',
      valueType: 'multi-enum',
      multiValued: true,
      options: [
        { key: 'en', label: 'English' },
        { key: 'af', label: 'Afrikaans' },
      ],
    });

    expect(validateDemographicValue(languages, ['en', 'af']).valid).toBe(true);

    const result = validateDemographicValue(languages, ['en', 'zz']);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: '[1]', message: expect.stringMatching(/allowed options/i) }),
    ]);
  });
});

describe('validateDemographicValue — JSON Schema', () => {
  const address = definition({
    key: 'address',
    valueType: 'object',
    schema: {
      type: 'object',
      required: ['city'],
      additionalProperties: false,
      properties: {
        city: { type: 'string' },
        age: { type: 'number', minimum: 18 },
      },
    },
  });

  it('accepts a value that satisfies the schema', () => {
    expect(validateDemographicValue(address, { city: 'Cape Town', age: 30 })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('reports schema violations with a field-level path', () => {
    const result = validateDemographicValue(address, { age: 12 });

    expect(result.valid).toBe(false);

    const paths = result.errors.map((error) => error.path);
    expect(paths).toContain('city');
    expect(paths).toContain('age');

    const cityError = result.errors.find((error) => error.path === 'city');
    expect(cityError.message).toMatch(/required/i);
  });

  it('reports type mismatches against the schema', () => {
    const result = validateDemographicValue(address, { city: 5 });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'city', message: 'must be of type string' }),
    ]);
  });

  it('reports unexpected properties against the schema', () => {
    const result = validateDemographicValue(address, { city: 'Cape Town', foo: true });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'foo', message: expect.stringMatching(/not an allowed property/i) }),
    ]);
  });

  it('validates each item of a multi-valued definition against the schema', () => {
    const result = validateDemographicValue(
      { ...address, multiValued: true },
      [{ city: 'Cape Town' }, { age: 22 }],
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.path)).toContain('[1].city');
  });

  it('applies the schema to values of any type', () => {
    const code = definition({
      key: 'nationality',
      valueType: 'string',
      schema: { type: 'string', pattern: '^[A-Z]{2}$' },
    });

    expect(validateDemographicValue(code, 'ZA').valid).toBe(true);
    expect(validateDemographicValue(code, 'za').valid).toBe(false);
  });

  it('uses ajv-formats when the schema declares a format', () => {
    const email = definition({
      key: 'contact-email',
      valueType: 'string',
      schema: { type: 'string', format: 'email' },
    });

    expect(validateDemographicValue(email, 'ops@acme.example').valid).toBe(true);
    expect(validateDemographicValue(email, 'not-an-email').valid).toBe(false);
  });

  it('reports an invalid JSON Schema instead of throwing', () => {
    const broken = definition({
      key: 'broken',
      valueType: 'object',
      schema: { type: 'nonsense-type' },
    });

    const result = validateDemographicValue(broken, { anything: true });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: 'schema',
        message: expect.stringMatching(/not a valid JSON Schema/i),
      }),
    ]);
  });
});

describe('validateDemographicValue — hydrated DemographicDefinition documents', () => {
  // The validator advertises that it accepts a hydrated Mongoose document, and
  // that is the natural call site (a service holding a definition fetched from
  // Mongo). On such a document `doc.schema` is the Mongoose Schema, not the
  // JSON Schema, so the JSON Schema must be read through `doc.get('schema')`.
  it('accepts a hydrated definition that declares no JSON Schema', () => {
    const definition = DemographicDefinition.hydrate({
      key: 'gender',
      title: 'Gender',
      valueType: 'enum',
      options: [{ key: 'female' }, { key: 'male' }],
    });

    expect(validateDemographicValue(definition, 'female')).toEqual({ valid: true, errors: [] });
  });

  it('accepts a newly constructed definition document that declares no JSON Schema', () => {
    const definition = new DemographicDefinition({
      key: 'nickname',
      title: 'Nickname',
      valueType: 'string',
    });

    expect(validateDemographicValue(definition, 'Werner')).toEqual({ valid: true, errors: [] });
  });

  it('accepts a hydrated definition whose JSON Schema passes', () => {
    const definition = DemographicDefinition.hydrate({
      key: 'address',
      title: 'Address',
      valueType: 'object',
      schema: {
        type: 'object',
        required: ['city'],
        properties: { city: { type: 'string' } },
      },
    });

    expect(validateDemographicValue(definition, { city: 'Cape Town' })).toEqual({
      valid: true,
      errors: [],
    });
  });

  it('returns field-level paths when a hydrated JSON Schema fails', () => {
    const definition = DemographicDefinition.hydrate({
      key: 'address',
      title: 'Address',
      valueType: 'object',
      schema: {
        type: 'object',
        required: ['city'],
        properties: { city: { type: 'string' } },
      },
    });

    const result = validateDemographicValue(definition, { city: 5 });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'city', message: 'must be of type string' }),
    ]);

    const missing = validateDemographicValue(definition, {});
    expect(missing.errors.map((error) => error.path)).toContain('city');
  });

  it('validates the enum options of a hydrated definition', () => {
    const definition = DemographicDefinition.hydrate({
      key: 'gender',
      title: 'Gender',
      valueType: 'enum',
      options: [{ key: 'female' }, { key: 'male' }],
    });

    const result = validateDemographicValue(definition, 'unknown');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: '',
        message: expect.stringMatching(/not one of the allowed options/i),
      }),
    ]);
  });

  it('reports a Schema-like non-serialisable value in `schema` instead of throwing', () => {
    const definition: NonNullable<DemographicDefinitionInput> = {
      key: 'broken',
      title: 'Broken',
      valueType: 'object',
      // A Mongoose Schema is what `doc.schema` used to leak here.
      schema: DemographicDefinition.schema as unknown as Record<string, unknown>,
    };

    const result = validateDemographicValue(definition, { anything: true });

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: 'schema',
        message: expect.stringMatching(/not a JSON Schema object/i),
      }),
    ]);
  });

  it('reports a circular schema instead of throwing', () => {
    const circular: Record<string, unknown> = { type: 'object' };
    circular.self = circular;

    const result = validateDemographicValue(
      { key: 'circular', title: 'Circular', valueType: 'object', schema: circular },
      { anything: true },
    );

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: 'schema', message: expect.stringMatching(/not a JSON Schema object/i) }),
    ]);
  });
});

describe('validateDemographicValue — reference ids', () => {
  const businessUnit = definition({
    key: 'business-unit',
    valueType: 'reference',
    reference: { model: 'BusinessUnit', multiple: false },
  });

  it('accepts a hex ObjectId string', () => {
    expect(validateDemographicValue(businessUnit, objectId())).toEqual({ valid: true, errors: [] });
  });

  it('accepts an ObjectId instance and an object carrying _id', () => {
    expect(validateDemographicValue(businessUnit, new mongoose.Types.ObjectId()).valid).toBe(true);
    expect(validateDemographicValue(businessUnit, { _id: objectId() }).valid).toBe(true);
  });

  it('rejects a value that is not an id shape without touching the database', () => {
    const result = validateDemographicValue(businessUnit, 'engineering');

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: '', message: 'Value must be a BusinessUnit id' }),
    ]);
  });

  it('rejects an array when the reference is single-valued', () => {
    const result = validateDemographicValue(businessUnit, [objectId()]);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: '',
        message: expect.stringMatching(/must not be an array/i),
      }),
    ]);
  });

  it('accepts and checks an array when the reference is multiple', () => {
    const teams = definition({
      key: 'teams',
      valueType: 'reference',
      reference: { model: 'Team', multiple: true },
    });

    expect(validateDemographicValue(teams, [objectId(), objectId()]).valid).toBe(true);

    const result = validateDemographicValue(teams, [objectId(), 'nope']);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({ path: '[1]', message: 'Value must be a Team id' }),
    ]);

    expect(validateDemographicValue(teams, objectId()).valid).toBe(false);
  });

  it('rejects a reference definition with a missing or unsupported model', () => {
    const missing = validateDemographicValue(
      definition({ valueType: 'reference', reference: null }),
      objectId(),
    );
    expect(missing.errors[0].path).toBe('reference.model');

    const unsupported = validateDemographicValue(
      definition({
        valueType: 'reference',
        reference: { model: 'Organization' as never, multiple: false },
      }),
      objectId(),
    );
    expect(unsupported.errors[0].message).toMatch(/Unsupported reference model/i);
  });

  it('exposes the id shape helper', () => {
    expect(isDemographicReferenceId(objectId())).toBe(true);
    expect(isDemographicReferenceId(new mongoose.Types.ObjectId())).toBe(true);
    expect(isDemographicReferenceId({ _id: objectId() })).toBe(true);
    expect(isDemographicReferenceId('engineering')).toBe(false);
    expect(isDemographicReferenceId(undefined)).toBe(false);
    expect(isDemographicReferenceId(42)).toBe(false);
  });
});
