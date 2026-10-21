import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

import DemographicDefinition, {
  DEMOGRAPHIC_CATEGORIES,
  DEMOGRAPHIC_REFERENCE_MODELS,
  DEMOGRAPHIC_VALUE_TYPES,
} from '../demographics/DemographicDefinition';
import DemographicValue, { DEMOGRAPHIC_VALUE_SOURCES } from '../demographics/DemographicValue';
import OrganizationDemographicSettings from '../demographics/OrganizationDemographicsSettings';
import LegacyDemographic from '../demographics/Demographic';
import AgeDemographic from '../demographics/AgeDemographic';
import {
  ModelDefinitions,
  DemographicDefinition as RegisteredDefinition,
  DemographicValue as RegisteredValue,
} from '../index';

const objectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

type SchemaIndex = [Record<string, 1 | -1>, { unique?: boolean }];

/**
 * Mongoose 7 types `Schema#indexes()` as a flat record even though it returns
 * `[fields, options]` tuples at runtime. A JSON round-trip gives us the real
 * runtime shape without an `any` cast.
 */
const schemaIndexes = <T>(model: mongoose.Model<T>): SchemaIndex[] =>
  JSON.parse(JSON.stringify(model.schema.indexes()));

const indexKeys = <T>(model: mongoose.Model<T>): string[] =>
  schemaIndexes(model).map(([fields]) => JSON.stringify(fields));

const indexFor = <T>(model: mongoose.Model<T>, fields: Record<string, 1 | -1>) => {
  const wanted = JSON.stringify(fields);
  return schemaIndexes(model).find(([indexFields]) => JSON.stringify(indexFields) === wanted);
};

describe('DemographicDefinition model (ORG-003)', () => {
  it('round-trips every definition field', () => {
    const organization = objectId();
    const createdBy = objectId();
    const updatedBy = objectId();
    const createdAt = new Date('2026-01-02T03:04:05.000Z');
    const updatedAt = new Date('2026-02-03T04:05:06.000Z');

    const doc = new DemographicDefinition({
      organization,
      key: 'Employment-Type',
      title: 'Employment type',
      description: 'How the person is employed',
      icon: 'badge',
      category: 'employment',
      valueType: 'enum',
      schema: {
        type: 'string',
        enum: ['permanent', 'contract'],
      },
      options: [
        { key: 'permanent', label: 'Permanent', ordinal: 1, deprecated: false },
        { key: 'contract', label: 'Contract', ordinal: 2, deprecated: true },
      ],
      reference: { model: 'BusinessUnit', multiple: true },
      widget: {
        componentFqn: 'core.DemographicSelect@1.0.0',
        componentProps: { variant: 'outlined' },
        componentPropsMap: { 'definition.options': 'options' },
      },
      required: true,
      multiValued: true,
      sensitive: true,
      searchable: true,
      enabled: false,
      ordinal: 7,
      roles: ['ADMIN', 'ORGANIZATION_ADMIN'],
      system: true,
      deleted: true,
      createdBy,
      updatedBy,
      createdAt,
      updatedAt,
    });

    expect(doc.validateSync()).toBeUndefined();

    // Plain-object view, as returned by `toObject()` / a Mongo read.
    const plain = JSON.parse(JSON.stringify(doc.toObject()));

    expect(String(plain.organization)).toBe(String(organization));
    // `key` is normalised to a slug (lower case, trimmed).
    expect(plain.key).toBe('employment-type');
    expect(plain.title).toBe('Employment type');
    expect(plain.description).toBe('How the person is employed');
    expect(plain.icon).toBe('badge');
    expect(plain.category).toBe('employment');
    expect(plain.valueType).toBe('enum');
    expect(plain.schema).toEqual({ type: 'string', enum: ['permanent', 'contract'] });
    expect(plain.options).toHaveLength(2);
    expect(plain.options[0]).toEqual({
      key: 'permanent',
      label: 'Permanent',
      ordinal: 1,
      deprecated: false,
    });
    expect(plain.options[1].deprecated).toBe(true);
    expect(plain.reference).toEqual({ model: 'BusinessUnit', multiple: true });
    expect(plain.widget.componentFqn).toBe('core.DemographicSelect@1.0.0');
    expect(plain.widget.componentProps).toEqual({ variant: 'outlined' });
    expect(plain.widget.componentPropsMap).toEqual({ 'definition.options': 'options' });
    expect(plain.required).toBe(true);
    expect(plain.multiValued).toBe(true);
    expect(plain.sensitive).toBe(true);
    expect(plain.searchable).toBe(true);
    expect(plain.enabled).toBe(false);
    expect(plain.ordinal).toBe(7);
    expect(plain.roles).toEqual(['ADMIN', 'ORGANIZATION_ADMIN']);
    expect(plain.system).toBe(true);
    expect(plain.deleted).toBe(true);
    expect(String(plain.createdBy)).toBe(String(createdBy));
    expect(String(plain.updatedBy)).toBe(String(updatedBy));
    expect(plain.createdAt).toBe(createdAt.toISOString());
    expect(plain.updatedAt).toBe(updatedAt.toISOString());

    // Values survive re-hydration from the persisted representation.
    const rehydrated = new DemographicDefinition(plain);
    expect(rehydrated.get('organization')).toEqual(organization);
    expect(rehydrated.get('key')).toBe('employment-type');
    expect(rehydrated.get('schema')).toEqual({ type: 'string', enum: ['permanent', 'contract'] });
    expect(rehydrated.get('options')[1].key).toBe('contract');
    expect(rehydrated.get('reference').model).toBe('BusinessUnit');
    expect(rehydrated.get('widget').componentPropsMap).toEqual({ 'definition.options': 'options' });
    expect(rehydrated.get('roles')).toEqual(['ADMIN', 'ORGANIZATION_ADMIN']);
  });

  it('applies defaults and accepts a null organization as a global template', () => {
    const doc = new DemographicDefinition({
      organization: null,
      key: 'gender',
      title: 'Gender',
      valueType: 'enum',
      options: [{ key: 'female', label: 'Female' }],
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('organization')).toBeNull();
    expect(doc.get('category')).toBe('personal');
    expect(doc.get('required')).toBe(false);
    expect(doc.get('multiValued')).toBe(false);
    expect(doc.get('sensitive')).toBe(false);
    expect(doc.get('searchable')).toBe(false);
    expect(doc.get('enabled')).toBe(true);
    expect(doc.get('ordinal')).toBe(0);
    expect(doc.get('roles')).toEqual([]);
    expect(doc.get('system')).toBe(false);
    expect(doc.get('deleted')).toBe(false);

    // Defaults also cover a definition that omits `organization` entirely.
    const withoutOrganization = new DemographicDefinition({
      key: 'age',
      title: 'Age',
      valueType: 'number',
    });
    expect(withoutOrganization.validateSync()).toBeUndefined();
    expect(withoutOrganization.get('organization')).toBeNull();
  });

  it('rejects definitions that omit required fields or use unsupported enums', () => {
    const missingKey = new DemographicDefinition({ title: 'No key', valueType: 'string' });
    expect(missingKey.validateSync().message).toContain('key');

    const missingTitle = new DemographicDefinition({ key: 'no-title', valueType: 'string' });
    expect(missingTitle.validateSync().message).toContain('title');

    const missingType = new DemographicDefinition({ key: 'no-type', title: 'No type' });
    expect(missingType.validateSync().message).toContain('valueType');

    const badType = new DemographicDefinition({
      key: 'bad-type',
      title: 'Bad type',
      valueType: 'colour',
    });
    expect(badType.validateSync().message).toContain('valueType');

    const badCategory = new DemographicDefinition({
      key: 'bad-category',
      title: 'Bad category',
      valueType: 'string',
      category: 'mystery',
    });
    expect(badCategory.validateSync().message).toContain('category');

    const badReference = new DemographicDefinition({
      key: 'bad-reference',
      title: 'Bad reference',
      valueType: 'reference',
      reference: { model: 'Organization', multiple: false },
    });
    expect(badReference.validateSync().message).toContain('reference.model');
  });

  it('keeps the JSON Schema reachable through get/set despite the reserved path name', () => {
    const doc = new DemographicDefinition({ key: 'reserved', title: 'Reserved', valueType: 'object' });
    const jsonSchema: Record<string, unknown> = {
      type: 'object',
      properties: { line1: { type: 'string' } },
    };

    doc.set('schema', jsonSchema);

    expect(doc.get('schema')).toEqual(jsonSchema);
    // Mongoose internals still need a usable `Document#schema`.
    expect(doc.schema).toBe(DemographicDefinition.schema);

    const hydrated = DemographicDefinition.hydrate({
      key: 'reserved-2',
      title: 'Reserved 2',
      valueType: 'object',
      schema: jsonSchema,
    });

    expect(hydrated.get('schema')).toEqual(jsonSchema);
    expect(hydrated.schema).toBe(DemographicDefinition.schema);
    expect(hydrated.validateSync()).toBeUndefined();
  });

  it('declares the definition lookup and uniqueness indexes', () => {
    const uniqueKey = indexFor(DemographicDefinition, { organization: 1, key: 1 });
    expect(uniqueKey).toBeDefined();
    expect(uniqueKey[1].unique).toBe(true);

    expect(indexKeys(DemographicDefinition)).toContain(JSON.stringify({ organization: 1, deleted: 1 }));
  });

  it('exposes the documented enum vocabularies', () => {
    expect([...DEMOGRAPHIC_CATEGORIES]).toEqual([
      'personal',
      'employment',
      'organizational',
      'compliance',
    ]);
    expect([...DEMOGRAPHIC_VALUE_TYPES]).toEqual([
      'string',
      'number',
      'boolean',
      'date',
      'enum',
      'multi-enum',
      'object',
      'array',
      'reference',
    ]);
    expect([...DEMOGRAPHIC_REFERENCE_MODELS]).toEqual([
      'BusinessUnit',
      'Team',
      'Region',
      'OperationalGroup',
      'User',
    ]);
  });
});

describe('DemographicValue model (ORG-003)', () => {
  it('round-trips every value field', () => {
    const organization = objectId();
    const user = objectId();
    const membership = objectId();
    const definition = objectId();
    const updatedBy = objectId();
    const effectiveFrom = new Date('2026-03-01T00:00:00.000Z');
    const effectiveTo = new Date('2026-12-31T00:00:00.000Z');

    const doc = new DemographicValue({
      organization,
      user,
      membership,
      definition,
      key: 'Languages',
      value: ['en', 'af'],
      valueType: 'multi-enum',
      source: 'import',
      verified: true,
      effectiveFrom,
      effectiveTo,
      updatedBy,
    });

    expect(doc.validateSync()).toBeUndefined();

    const plain = JSON.parse(JSON.stringify(doc.toObject()));

    expect(String(plain.organization)).toBe(String(organization));
    expect(String(plain.user)).toBe(String(user));
    expect(String(plain.membership)).toBe(String(membership));
    expect(String(plain.definition)).toBe(String(definition));
    // `key` is a snapshot of the definition key, normalised like the definition.
    expect(plain.key).toBe('languages');
    expect(plain.value).toEqual(['en', 'af']);
    expect(plain.valueType).toBe('multi-enum');
    expect(plain.source).toBe('import');
    expect(plain.verified).toBe(true);
    expect(plain.effectiveFrom).toBe(effectiveFrom.toISOString());
    expect(plain.effectiveTo).toBe(effectiveTo.toISOString());
    expect(String(plain.updatedBy)).toBe(String(updatedBy));

    const rehydrated = new DemographicValue(plain);
    expect(rehydrated.get('value')).toEqual(['en', 'af']);
    expect(rehydrated.get('key')).toBe('languages');
    expect(rehydrated.get('source')).toBe('import');
  });

  it('applies defaults for optional lifecycle fields', () => {
    const doc = new DemographicValue({
      organization: objectId(),
      user: objectId(),
      definition: objectId(),
      key: 'gender',
      value: 'female',
      valueType: 'enum',
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('membership')).toBeNull();
    expect(doc.get('source')).toBe('user');
    expect(doc.get('verified')).toBe(false);
    expect(doc.get('effectiveFrom')).toBeNull();
    expect(doc.get('effectiveTo')).toBeNull();
  });

  it('rejects documents without organization, user, definition or key', () => {
    const missingOrganization = new DemographicValue({
      user: objectId(),
      definition: objectId(),
      key: 'gender',
    });
    expect(missingOrganization.validateSync().message).toContain('organization');

    const missingUser = new DemographicValue({
      organization: objectId(),
      definition: objectId(),
      key: 'gender',
    });
    expect(missingUser.validateSync().message).toContain('user');

    const missingDefinition = new DemographicValue({
      organization: objectId(),
      user: objectId(),
      key: 'gender',
    });
    expect(missingDefinition.validateSync().message).toContain('definition');

    const missingKey = new DemographicValue({
      organization: objectId(),
      user: objectId(),
      definition: objectId(),
    });
    expect(missingKey.validateSync().message).toContain('key');

    const badSource = new DemographicValue({
      organization: objectId(),
      user: objectId(),
      definition: objectId(),
      key: 'gender',
      source: 'guess',
    });
    expect(badSource.validateSync().message).toContain('source');

    const badType = new DemographicValue({
      organization: objectId(),
      user: objectId(),
      definition: objectId(),
      key: 'gender',
      valueType: 'colour',
    });
    expect(badType.validateSync().message).toContain('valueType');
  });

  it('declares the uniqueness and reporting indexes', () => {
    const uniqueValue = indexFor(DemographicValue, { organization: 1, definition: 1, user: 1 });
    expect(uniqueValue).toBeDefined();
    expect(uniqueValue[1].unique).toBe(true);

    const keys = indexKeys(DemographicValue);
    expect(keys).toContain(JSON.stringify({ organization: 1, definition: 1, value: 1 }));
    expect(keys).toContain(JSON.stringify({ organization: 1, user: 1 }));
  });

  it('exposes the documented value sources', () => {
    expect([...DEMOGRAPHIC_VALUE_SOURCES]).toEqual(['user', 'admin', 'import', 'api']);
  });
});

describe('Demographic model registration (ORG-003)', () => {
  it('registers DemographicDefinition and DemographicValue as core models', () => {
    const registered = new Map(ModelDefinitions.map((definition) => [definition.name, definition]));

    const definition = registered.get('DemographicDefinition');
    expect(definition).toBeDefined();
    expect(definition.component).toBe(DemographicDefinition);
    expect(definition.component).toBe(RegisteredDefinition);
    expect(definition.stem).toBe('demographic-definition');
    expect(definition.nameSpace).toBe('core');
    expect(definition.tags).toContain('demographic');

    const value = registered.get('DemographicValue');
    expect(value).toBeDefined();
    expect(value.component).toBe(DemographicValue);
    expect(value.component).toBe(RegisteredValue);
    expect(value.stem).toBe('demographic-value');
    expect(value.nameSpace).toBe('core');
    expect(value.tags).toContain('demographic');
  });

  it('uses the documented collection names', () => {
    expect(DemographicDefinition.collection.name).toBe('reactory_demographic_definitions');
    expect(DemographicValue.collection.name).toBe('reactory_demographic_values');
  });
});

describe('Legacy demographics models (ORG-003 deprecation)', () => {
  it('keeps the three legacy models registered', () => {
    const registered = new Map(ModelDefinitions.map((definition) => [definition.name, definition]));

    expect(registered.get('Demographic').component).toBe(LegacyDemographic);
    expect(registered.get('AgeDemographic').component).toBe(AgeDemographic);
    expect(registered.get('OrganizationDemographicSettings').component).toBe(
      OrganizationDemographicSettings,
    );
  });

  it('leaves the legacy schemas untouched', () => {
    expect(Object.keys(LegacyDemographic.schema.paths)).toEqual(
      expect.arrayContaining(['organization', 'title', 'type', 'key', 'icon', 'deleted']),
    );
    expect(Object.keys(AgeDemographic.schema.paths)).toEqual(
      expect.arrayContaining(['organization', 'title', 'ageStart', 'ageEnd', 'deleted']),
    );

    const settingsPaths = Object.keys(OrganizationDemographicSettings.schema.paths);
    expect(settingsPaths).toEqual(
      expect.arrayContaining([
        'organization',
        'age',
        'gender',
        'race',
        'region',
        'position',
        'operationalGroup',
        'businessUnit',
        'teams',
        'deleted',
      ]),
    );
  });

  it('marks the legacy models @deprecated and points at the new models', () => {
    const fileFor = (name: string): string =>
      fs.readFileSync(path.join(__dirname, '..', 'demographics', name), 'utf8');

    for (const file of [
      'Demographic.ts',
      'AgeDemographic.ts',
      'OrganizationDemographicsSettings.ts',
    ]) {
      const source = fileFor(file);
      expect(source).toContain('@deprecated');
      expect(source).toContain('DemographicDefinition');
      expect(source).toContain('DemographicValue');
    }
  });
});
