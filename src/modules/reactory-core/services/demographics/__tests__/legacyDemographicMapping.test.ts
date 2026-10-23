import {
  LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS,
  LEGACY_ENUM_ALIASES,
  LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS,
  LEGACY_SETTINGS_DEFINITION_MAP,
  LEGACY_USER_DEMOGRAPHIC_FIELDS,
  isLegacyId,
  legacyIdString,
  mapLegacyValue,
  normalizeLegacyToken,
  splitLegacyTokens,
} from '../legacyDemographicMapping';
import { BASE_DEMOGRAPHIC_TEMPLATES } from '../baseDemographicTemplates';

/**
 * ORG-040: dedicated suite for `legacyDemographicMapping`.
 *
 * The mapping module decides what a legacy value *means* in the new model, and
 * every documented decision the ticket calls out lives here (the eight booleans,
 * `age -> dateOfBirth`, `teams -> team`, the legacy `operationalGroup` trap).
 * Each branch of `mapLegacyValue` is exercised, including the refusals, because
 * a refusal that silently became a write would be a data-quality defect.
 */

const template = (key: string) => {
  const found = BASE_DEMOGRAPHIC_TEMPLATES.find((entry) => entry.key === key);
  if (!found) throw new Error(`Missing base template ${key}`);
  return found;
};

const definition = (key: string, overrides: Record<string, any> = {}): any => {
  const entry = template(key);
  return {
    key: entry.key.toLowerCase(),
    title: entry.title,
    valueType: entry.valueType,
    options: entry.options ? entry.options.map((option) => ({ ...option })) : undefined,
    reference: entry.reference ? { ...entry.reference } : undefined,
    multiValued: entry.multiValued === true,
    required: entry.required,
    enabled: entry.enabled,
    ...overrides,
  };
};

describe('legacy mapping tables (ORG-040)', () => {
  it('maps all eight OrganizationDemographicsSettings booleans, age to dateOfBirth', () => {
    expect(LEGACY_SETTINGS_DEFINITION_MAP.map((mapping) => mapping.legacyField)).toEqual([
      'age', 'gender', 'race', 'region', 'position', 'operationalGroup', 'businessUnit', 'teams',
    ]);

    const byField = LEGACY_SETTINGS_DEFINITION_MAP.reduce<Record<string, string>>((accumulator, mapping) => {
      accumulator[mapping.legacyField] = mapping.definitionKey;
      return accumulator;
    }, {});

    // `age` is dateOfBirth (the legacy model stores dob); `teams` is singular.
    expect(byField.age).toBe('dateOfBirth');
    expect(byField.teams).toBe('team');
    expect(byField.gender).toBe('gender');
    expect(byField.race).toBe('race');
    expect(byField.region).toBe('region');
    expect(byField.position).toBe('position');
    expect(byField.operationalGroup).toBe('operationalGroup');
    expect(byField.businessUnit).toBe('businessUnit');
  });

  it('maps every mapped definition key to a seeded base template', () => {
    const keys = new Set(BASE_DEMOGRAPHIC_TEMPLATES.map((entry) => entry.key.toLowerCase()));

    [
      ...LEGACY_SETTINGS_DEFINITION_MAP,
      ...LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS,
      ...LEGACY_USER_DEMOGRAPHIC_FIELDS,
    ].forEach((mapping) => {
      expect(keys.has(mapping.definitionKey.toLowerCase())).toBe(true);
    });
  });

  it('maps the nine PersonalDemographic value fields and the seven UserDemographics ones', () => {
    expect(LEGACY_PERSONAL_DEMOGRAPHIC_FIELDS.map((mapping) => mapping.legacyField)).toEqual([
      'race', 'dob', 'gender', 'pronoun', 'position', 'region', 'operationalGroup', 'businessUnit', 'team',
    ]);
    expect(LEGACY_USER_DEMOGRAPHIC_FIELDS.map((mapping) => mapping.legacyField)).toEqual([
      'gender', 'race', 'position', 'operationalGroup', 'region', 'businessUnit', 'team',
    ]);
    // UserDemographics has no dob and no pronoun.
    expect(LEGACY_USER_DEMOGRAPHIC_FIELDS.some((mapping) => mapping.legacyField === 'dob')).toBe(false);
    expect(LEGACY_USER_DEMOGRAPHIC_FIELDS.some((mapping) => mapping.legacyField === 'pronoun')).toBe(false);
  });

  it('knows which UserDemographics columns are refs to the legacy Demographic collection', () => {
    expect([...LEGACY_DEMOGRAPHIC_REFERENCE_FIELDS].sort()).toEqual(
      ['gender', 'operationalGroup', 'position', 'race'],
    );
  });

  it('exposes the documented synonym table only for ambiguous abbreviations', () => {
    expect(Object.keys(LEGACY_ENUM_ALIASES).sort()).toEqual(['gender', 'pronoun']);
    expect(LEGACY_ENUM_ALIASES.gender.m).toBe('male');
    expect(LEGACY_ENUM_ALIASES.gender.f).toBe('female');
  });
});

describe('isLegacyId / legacyIdString (ORG-040)', () => {
  const hex = '665f0c1a2b3c4d5e6f708192';

  it('accepts a 24-hex string, a bson ObjectId and a document carrying _id', () => {
    expect(isLegacyId(hex)).toBe(true);
    expect(isLegacyId(hex.toUpperCase())).toBe(true);
    expect(isLegacyId({ toHexString: () => hex })).toBe(true);
    expect(isLegacyId({ _id: hex })).toBe(true);
  });

  it('rejects null, undefined, short strings and objects without an id', () => {
    expect(isLegacyId(null)).toBe(false);
    expect(isLegacyId(undefined)).toBe(false);
    expect(isLegacyId('')).toBe(false);
    expect(isLegacyId('not-an-id')).toBe(false);
    expect(isLegacyId(42)).toBe(false);
    expect(isLegacyId({ title: 'no id here' })).toBe(false);
  });

  it('normalises every accepted representation to a string', () => {
    expect(legacyIdString(hex)).toBe(hex);
    expect(legacyIdString(`  ${hex}  `)).toBe(hex);
    expect(legacyIdString({ toHexString: () => hex })).toBe(hex);
    expect(legacyIdString({ _id: { toHexString: () => hex } })).toBe(hex);
    expect(legacyIdString(null)).toBeNull();
    expect(legacyIdString(undefined)).toBeNull();
    expect(legacyIdString('   ')).toBeNull();
    expect(legacyIdString({ title: 'nope' })).toBeNull();
    expect(legacyIdString(12)).toBeNull();
  });
});

describe('normalizeLegacyToken / splitLegacyTokens (ORG-040)', () => {
  it('lower-cases, trims and slugifies', () => {
    expect(normalizeLegacyToken('  Prefer not to say ')).toBe('prefer-not-to-say');
    expect(normalizeLegacyToken('Prefer_to_say')).toBe('prefer-to-say');
    expect(normalizeLegacyToken('She / Her')).toBe('she-her');
    expect(normalizeLegacyToken('65+')).toBe('65+');
    expect(normalizeLegacyToken('Black & White')).toBe('black-and-white');
    expect(normalizeLegacyToken('--leading-and-trailing--')).toBe('leading-and-trailing');
    expect(normalizeLegacyToken(null)).toBe('null');
  });

  it('splits multi-value strings on the import separators', () => {
    expect(splitLegacyTokens('African, Coloured')).toEqual(['African', 'Coloured']);
    expect(splitLegacyTokens('African;Coloured|Indian')).toEqual(['African', 'Coloured', 'Indian']);
    expect(splitLegacyTokens(['African', 'Indian'])).toEqual(['African', 'Indian']);
    expect(splitLegacyTokens(',,,')).toEqual([]);
    expect(splitLegacyTokens('   ')).toEqual([]);
    expect(splitLegacyTokens(42)).toEqual([]);
    expect(splitLegacyTokens(null)).toEqual([]);
  });
});

describe('mapLegacyValue refusals (ORG-040)', () => {
  it('refuses null, undefined and blank strings as empty values', () => {
    const gender = definition('gender');

    expect(mapLegacyValue(gender, null)).toMatchObject({ ok: false, reason: 'empty-value' });
    expect(mapLegacyValue(gender, undefined)).toMatchObject({ ok: false, reason: 'empty-value' });
    expect(mapLegacyValue(gender, '   ')).toMatchObject({ ok: false, reason: 'empty-value' });
  });

  it('refuses an enum value that matches no option and names the allowed keys', () => {
    const result = mapLegacyValue(definition('gender'), 'Martian');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unmapped-value');
    expect(result.detail).toMatch(/Martian/);
    expect(result.detail).toMatch(/female, male, non-binary, other, prefer-not-to-say/);
  });

  it('reports a definition with no options rather than accepting anything', () => {
    const result = mapLegacyValue({ key: 'gender', valueType: 'enum', options: [] }, 'male');

    expect(result).toMatchObject({ ok: false, reason: 'unmapped-value' });
    expect(result.detail).toMatch(/\(none\)/);
  });

  it('refuses several values for a single-valued enum', () => {
    const result = mapLegacyValue(definition('gender'), 'Male, Female');

    expect(result).toMatchObject({ ok: false, reason: 'unmapped-value' });
    expect(result.detail).toMatch(/Multiple values/);
  });

  it('refuses a separator-only multi-value string', () => {
    const result = mapLegacyValue(definition('race'), ', ,');

    expect(result).toMatchObject({ ok: false, reason: 'empty-value' });
  });

  it('refuses a string-typed object value with no title, name or key', () => {
    const result = mapLegacyValue(definition('position'), { id: 1 });

    expect(result).toMatchObject({ ok: false, reason: 'unmapped-value' });
    expect(result.detail).toMatch(/no title, name or key/);
  });
});

describe('mapLegacyValue enum resolution (ORG-040)', () => {
  it('matches on the exact option key and on its normalised form', () => {
    expect(mapLegacyValue(definition('gender'), 'male')).toEqual({ ok: true, value: 'male' });
    expect(mapLegacyValue(definition('gender'), 'Non Binary')).toEqual({ ok: true, value: 'non-binary' });
    expect(mapLegacyValue(definition('gender'), 'NON-BINARY')).toEqual({ ok: true, value: 'non-binary' });
  });

  it('matches on the display label so "Prefer not to say" lands on the option key', () => {
    expect(mapLegacyValue(definition('gender'), 'Prefer not to say')).toEqual({
      ok: true,
      value: 'prefer-not-to-say',
    });
    expect(mapLegacyValue(definition('pronoun'), 'She / her')).toEqual({ ok: true, value: 'she-her' });
    expect(mapLegacyValue(definition('pronoun'), 'He / him')).toEqual({ ok: true, value: 'he-him' });
    expect(mapLegacyValue(definition('pronoun'), 'They / them')).toEqual({ ok: true, value: 'they-them' });
  });

  it('applies the documented synonyms', () => {
    expect(mapLegacyValue(definition('gender'), 'M')).toEqual({ ok: true, value: 'male' });
    expect(mapLegacyValue(definition('gender'), 'Man')).toEqual({ ok: true, value: 'male' });
    expect(mapLegacyValue(definition('gender'), 'F')).toEqual({ ok: true, value: 'female' });
    expect(mapLegacyValue(definition('gender'), 'Woman')).toEqual({ ok: true, value: 'female' });
  });

  it('deduplicates repeated tokens and returns an array for multi-valued definitions', () => {
    const result = mapLegacyValue(definition('race'), 'African, african, Coloured');

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(['african', 'coloured']);
  });

  it('returns a single-element array for a multi-valued definition', () => {
    expect(mapLegacyValue(definition('race'), 'White')).toEqual({ ok: true, value: ['white'] });
  });

  it('derives the synonym table key from a definition key of any case', () => {
    // `definition()` returns lower-case keys; the mapper lowers the definition
    // key itself, so a document stored with camelCase still resolves synonyms.
    const result = mapLegacyValue({ ...definition('gender'), key: 'GeNdEr' }, 'F');

    expect(result).toEqual({ ok: true, value: 'female' });
  });

  it('ignores an alias that the definition no longer offers', () => {
    const withoutMale = definition('gender', {
      options: [{ key: 'female', label: 'Female' }],
    });

    const result = mapLegacyValue(withoutMale, 'M');

    expect(result).toMatchObject({ ok: false, reason: 'unmapped-value' });
  });

  it('ignores malformed option entries when building the option list', () => {
    const malformed = {
      key: 'gender',
      valueType: 'enum',
      options: [null, { label: 'No key' }, { key: 'female', label: 'Female' }],
    };

    expect(mapLegacyValue(malformed, 'Female')).toEqual({ ok: true, value: 'female' });
    expect(mapLegacyValue(malformed, 'Male')).toMatchObject({ ok: false, reason: 'unmapped-value' });
  });

  it('treats a non-array options field as an empty option list', () => {
    const result = mapLegacyValue({ key: 'gender', valueType: 'enum', options: 'female,male' }, 'female');

    expect(result).toMatchObject({ ok: false, reason: 'unmapped-value' });
  });
});

describe('mapLegacyValue dates, references and strings (ORG-040)', () => {
  it('parses a date string and passes a Date through', () => {
    const parsed = mapLegacyValue(definition('dateOfBirth'), '1990-05-04');
    expect(parsed.ok).toBe(true);
    expect(parsed.value).toBeInstanceOf(Date);
    expect((parsed.value as Date).toISOString().slice(0, 10)).toBe('1990-05-04');

    const date = new Date('1981-12-31T00:00:00.000Z');
    expect(mapLegacyValue(definition('dateOfBirth'), date)).toEqual({ ok: true, value: date });
  });

  it('hands an unparseable date to the validator verbatim', () => {
    // The validator produces the canonical "Value must be a valid date" error;
    // the mapper must not invent a parallel error vocabulary.
    const result = mapLegacyValue(definition('dateOfBirth'), 'not-a-date');

    expect(result.ok).toBe(true);
    expect(result.value).toBe('not-a-date');
  });

  it('normalises reference ids, including bson/ObjectId-like objects', () => {
    const hex = '665f0c1a2b3c4d5e6f708192';

    expect(mapLegacyValue(definition('region'), hex)).toEqual({ ok: true, value: hex });
    expect(mapLegacyValue(definition('region'), ` ${hex} `)).toEqual({ ok: true, value: hex });
    expect(mapLegacyValue(definition('region'), { toHexString: () => hex })).toEqual({ ok: true, value: hex });
    expect(mapLegacyValue(definition('region'), { _id: hex })).toEqual({ ok: true, value: hex });
  });

  it('passes a malformed reference through so the validator reports it', () => {
    const result = mapLegacyValue(definition('region'), 'north');

    expect(result.ok).toBe(true);
    expect(result.value).toBe('north');
  });

  it('unwraps a string definition value from a document-like object', () => {
    expect(mapLegacyValue(definition('position'), { title: '  Engineer ' })).toEqual({ ok: true, value: 'Engineer' });
    expect(mapLegacyValue(definition('position'), { name: 'Architect' })).toEqual({ ok: true, value: 'Architect' });
    expect(mapLegacyValue(definition('position'), { key: 'engineer' })).toEqual({ ok: true, value: 'engineer' });
    expect(mapLegacyValue(definition('position'), ' Engineer ')).toEqual({ ok: true, value: 'Engineer' });
    expect(mapLegacyValue(definition('position'), 42)).toEqual({ ok: true, value: '42' });
  });

  it('passes other value types through unchanged', () => {
    expect(mapLegacyValue({ key: 'headcount', valueType: 'number' }, 42)).toEqual({ ok: true, value: 42 });
    expect(mapLegacyValue({ key: 'remote', valueType: 'boolean' }, true)).toEqual({ ok: true, value: true });
    // An unrecognised valueType falls through to the default branch.
    expect(mapLegacyValue({ key: 'weird', valueType: 'bogus' }, 'x')).toEqual({ ok: true, value: 'x' });
  });

  it('defaults to string handling when the definition has no valueType', () => {
    expect(mapLegacyValue({ key: 'position' }, 'Engineer')).toEqual({ ok: true, value: 'Engineer' });
  });
});
