import { ObjectId } from 'mongodb';
import validateDemographicValue from '@reactory/server-modules/reactory-core/utils/validateDemographicValue';
import {
  DEMOGRAPHIC_CATEGORIES,
  DEMOGRAPHIC_REFERENCE_MODELS,
  DEMOGRAPHIC_VALUE_TYPES,
} from '@reactory/server-modules/reactory-core/models/demographics/DemographicDefinition';
import {
  BASE_DEMOGRAPHIC_TEMPLATES,
  BASE_DEMOGRAPHIC_TEMPLATE_KEYS,
  IBaseDemographicTemplate,
} from '../baseDemographicTemplates';

/**
 * ORG-030: the base template set is data, so the cheapest place to catch a
 * broken template is a pure test over the array. Nothing here touches a
 * database: the same `validateDemographicValue` the service uses on every value
 * write is applied to a representative value per template.
 */

/** The plan's (D9) base set, in order. */
const EXPECTED_KEYS = [
  'dateOfBirth',
  'ageBand',
  'gender',
  'pronoun',
  'race',
  'ethnicity',
  'nationality',
  'language',
  'disabilityStatus',
  'position',
  'employmentType',
  'region',
  'operationalGroup',
  'businessUnit',
  'team',
];

/** The four protected-characteristic fields the plan marks sensitive. */
const EXPECTED_SENSITIVE = ['race', 'ethnicity', 'nationality', 'disabilityStatus'];

const reference = (): string => new ObjectId().toHexString();

/**
 * One valid value per template. Keyed by template key and asserted to cover the
 * whole set below, so adding a template without a sample fails the suite rather
 * than silently skipping validation.
 */
const validSamples: Record<string, unknown> = {
  dateOfBirth: '1990-04-12',
  ageBand: '35-44',
  gender: 'female',
  pronoun: 'they-them',
  race: ['african', 'indian'],
  ethnicity: ['zulu', 'english'],
  nationality: 'South African',
  language: ['en', 'af'],
  disabilityStatus: 'no-disability',
  position: 'Software Engineer',
  employmentType: 'permanent',
  region: reference(),
  operationalGroup: reference(),
  businessUnit: reference(),
  team: reference(),
};

const byKey = (key: string): IBaseDemographicTemplate => {
  const template = BASE_DEMOGRAPHIC_TEMPLATES.find((candidate) => candidate.key === key);
  if (!template) throw new Error(`Template [${key}] is missing from the base set`);
  return template;
};

describe('base demographic templates (ORG-030)', () => {
  it('defines exactly the documented base set, in seeding order', () => {
    expect([...BASE_DEMOGRAPHIC_TEMPLATE_KEYS]).toEqual(EXPECTED_KEYS);
    expect(BASE_DEMOGRAPHIC_TEMPLATES).toHaveLength(EXPECTED_KEYS.length);
  });

  it('has exactly one valid sample per template', () => {
    expect(Object.keys(validSamples).sort()).toEqual([...EXPECTED_KEYS].sort());
  });

  it('declares a unique, lower-case key and a unique ordinal for every template', () => {
    const keys = BASE_DEMOGRAPHIC_TEMPLATES.map((template) => template.key);
    const ordinals = BASE_DEMOGRAPHIC_TEMPLATES.map((template) => template.ordinal);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(ordinals).size).toBe(ordinals.length);

    // Keys are the plan's camelCase identifiers; the model lower-cases them on
    // write, so the persisted keys must still be unique.
    expect(new Set(keys.map((key) => key.toLowerCase())).size).toBe(keys.length);

    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      expect(template.key).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      expect(template.key).toBe(template.key.trim());
      expect(typeof template.ordinal).toBe('number');
      expect(template.ordinal).toBeGreaterThan(0);
    });

    // Ordinals must agree with array order so seeding order and display order
    // cannot drift apart.
    expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
  });

  it('marks every template as a system definition with the documented defaults', () => {
    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      expect(template.system).toBe(true);
      expect(template.title.trim().length).toBeGreaterThan(0);
      expect(template.description.trim().length).toBeGreaterThan(0);
      expect(typeof template.enabled).toBe('boolean');
      expect(typeof template.required).toBe('boolean');
      expect(typeof template.sensitive).toBe('boolean');
    });
  });

  it('enables the whole set and makes nothing required by default', () => {
    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      expect(template.enabled).toBe(true);
      expect(template.required).toBe(false);
    });
  });

  it('marks the protected characteristics sensitive and leaves the rest alone', () => {
    expect(BASE_DEMOGRAPHIC_TEMPLATES.filter((t) => t.sensitive).map((t) => t.key))
      .toEqual(EXPECTED_SENSITIVE);
  });

  it('uses only documented categories and value types', () => {
    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      expect(DEMOGRAPHIC_CATEGORIES).toContain(template.category);
      expect(DEMOGRAPHIC_VALUE_TYPES).toContain(template.valueType);
    });
  });

  it('gives every enum template a non-empty, unique option list', () => {
    BASE_DEMOGRAPHIC_TEMPLATES
      .filter((template) => template.valueType === 'enum' || template.valueType === 'multi-enum')
      .forEach((template) => {
        expect(Array.isArray(template.options)).toBe(true);
        const optionKeys = (template.options || []).map((option) => option.key);

        expect(optionKeys.length).toBeGreaterThan(0);
        expect(new Set(optionKeys).size).toBe(optionKeys.length);
        optionKeys.forEach((key) => expect(key).toBe(key.trim().toLowerCase()));
        (template.options || []).forEach((option) => {
          expect(typeof option.label).toBe('string');
          expect((option.label as string).trim().length).toBeGreaterThan(0);
        });
      });
  });

  it('does not carry options on non-enum templates', () => {
    BASE_DEMOGRAPHIC_TEMPLATES
      .filter((template) => template.valueType !== 'enum' && template.valueType !== 'multi-enum')
      .forEach((template) => expect(template.options).toBeUndefined());
  });

  it('gives every reference template a known model and no enum options', () => {
    BASE_DEMOGRAPHIC_TEMPLATES
      .filter((template) => template.valueType === 'reference')
      .forEach((template) => {
        expect(template.reference).toBeDefined();
        expect(DEMOGRAPHIC_REFERENCE_MODELS).toContain(template.reference?.model);
        expect(template.options).toBeUndefined();
      });

    // The four structural fields, pointing at the organization's own records.
    expect(
      BASE_DEMOGRAPHIC_TEMPLATES
        .filter((template) => template.valueType === 'reference')
        .map((template) => [template.key, template.reference?.model]),
    ).toEqual([
      ['region', 'Region'],
      ['operationalGroup', 'OperationalGroup'],
      ['businessUnit', 'BusinessUnit'],
      ['team', 'Team'],
    ]);
  });

  it('validates a representative value for every template', () => {
    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      const result = validateDemographicValue(template as any, validSamples[template.key]);

      expect({ key: template.key, errors: result.errors }).toEqual({ key: template.key, errors: [] });
      expect(result.valid).toBe(true);
    });
  });

  it('rejects a value outside an enum template\'s option list', () => {
    const result = validateDemographicValue(byKey('gender') as any, 'not-a-gender');

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.message).join(' ')).toMatch(/allowed options/i);
  });

  it('requires a collection for multi-enum templates', () => {
    expect(validateDemographicValue(byKey('language') as any, 'en').valid).toBe(false);
    expect(validateDemographicValue(byKey('language') as any, ['en']).valid).toBe(true);
  });

  it('rejects a malformed reference id', () => {
    const result = validateDemographicValue(byKey('businessUnit') as any, 'not-an-object-id');

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/BusinessUnit id/);
  });

  it('lets every sensitive enum answer "prefer not to say"', () => {
    BASE_DEMOGRAPHIC_TEMPLATES
      .filter((template) => template.sensitive && template.options)
      .forEach((template) => {
        expect((template.options || []).map((option) => option.key)).toContain('prefer-not-to-say');

        const sample = template.valueType === 'multi-enum' ? ['prefer-not-to-say'] : 'prefer-not-to-say';
        expect(validateDemographicValue(template as any, sample).valid).toBe(true);
      });
  });

  it('exposes the template list as read-only data', () => {
    // `ReadonlyArray` is compile-time only; freezing guards the runtime copy that
    // seeding iterates. Templates are frozen individually as well.
    BASE_DEMOGRAPHIC_TEMPLATES.forEach((template) => {
      expect(Object.isFrozen(template)).toBe(true);
    });
  });
});
