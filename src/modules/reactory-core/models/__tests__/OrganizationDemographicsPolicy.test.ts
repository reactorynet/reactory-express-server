import mongoose from 'mongoose';

import OrganizationDemographicsPolicy, {
  ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS,
} from '../demographics/OrganizationDemographicsPolicy';
import { ModelDefinitions, OrganizationDemographicsPolicy as RegisteredPolicy } from '../index';

const objectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

type SchemaIndex = [Record<string, 1 | -1>, { unique?: boolean }];

/**
 * Mongoose 7 types `Schema#indexes()` as a flat record even though it returns
 * `[fields, options]` tuples at runtime. A JSON round-trip gives us the runtime
 * shape without an `any` cast.
 */
const schemaIndexes = (model: mongoose.Model<any>): SchemaIndex[] =>
  JSON.parse(JSON.stringify(model.schema.indexes()));

describe('OrganizationDemographicsPolicy model (ORG-006)', () => {
  it('round-trips every policy field', () => {
    const organization = objectId();

    const document = new OrganizationDemographicsPolicy({
      organization,
      selfServiceEnabled: false,
      adminOnlyKeys: ['employee-number', 'cost-centre'],
      minimumAggregationGroupSize: 10,
      retentionDays: 365,
      deleted: true,
    });

    expect(document.validateSync()).toBeUndefined();

    const plain = JSON.parse(JSON.stringify(document.toObject()));

    expect(String(plain.organization)).toBe(String(organization));
    expect(plain.selfServiceEnabled).toBe(false);
    expect(plain.adminOnlyKeys).toEqual(['employee-number', 'cost-centre']);
    expect(plain.minimumAggregationGroupSize).toBe(10);
    expect(plain.retentionDays).toBe(365);
    expect(plain.deleted).toBe(true);
  });

  it('applies the documented defaults', () => {
    const document = new OrganizationDemographicsPolicy({ organization: objectId() });

    expect(document.selfServiceEnabled).toBe(true);
    expect(document.adminOnlyKeys).toEqual([]);
    expect(document.minimumAggregationGroupSize).toBe(5);
    expect(document.retentionDays).toBeNull();
    expect(document.deleted).toBe(false);
  });

  it('exports the defaults as a frozen constant', () => {
    expect(ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS).toEqual({
      selfServiceEnabled: true,
      adminOnlyKeys: [],
      minimumAggregationGroupSize: 5,
      retentionDays: null,
    });
    expect(Object.isFrozen(ORGANIZATION_DEMOGRAPHICS_POLICY_DEFAULTS)).toBe(true);
  });

  it('requires an organization', () => {
    const document = new OrganizationDemographicsPolicy({});

    expect(document.validateSync()).toBeDefined();
  });

  it('rejects an aggregation group size below 1', () => {
    const document = new OrganizationDemographicsPolicy({
      organization: objectId(),
      minimumAggregationGroupSize: 0,
    });

    expect(document.validateSync()).toBeDefined();
  });

  it('rejects a negative retention period', () => {
    const document = new OrganizationDemographicsPolicy({
      organization: objectId(),
      retentionDays: -5,
    });

    expect(document.validateSync()).toBeDefined();
  });

  it('declares a unique index on organization', () => {
    const unique = schemaIndexes(OrganizationDemographicsPolicy).filter(
      ([fields, options]) =>
        Object.keys(fields).length === 1 && fields.organization === 1 && options?.unique === true,
    );

    expect(unique).toHaveLength(1);
  });

  it('uses the documented collection name', () => {
    expect(OrganizationDemographicsPolicy.collection.name).toBe(
      'reactory_organization_demographics_policies',
    );
  });

  it('is registered in the core model definitions', () => {
    const registered = new Map(ModelDefinitions.map((definition) => [definition.name, definition]));
    const definition = registered.get('OrganizationDemographicsPolicy');

    expect(definition).toBeDefined();
    expect(definition.component).toBe(OrganizationDemographicsPolicy);
    expect(definition.component).toBe(RegisteredPolicy);
    expect(definition.stem).toBe('organization-demographics-policy');
    expect(definition.nameSpace).toBe('core');
    expect(definition.version).toBe('1.0.0');
    expect(definition.tags).toContain('demographic');
  });

  it('is not mixed up with the deprecated boolean settings sheet', () => {
    const registered = new Map(ModelDefinitions.map((definition) => [definition.name, definition]));

    // Both exist; the legacy model is untouched and still registered.
    expect(registered.get('OrganizationDemographicsPolicy')).toBeDefined();
    expect(registered.get('OrganizationDemographicSettings')).toBeDefined();
    expect(registered.get('OrganizationDemographicsPolicy').component).not.toBe(
      registered.get('OrganizationDemographicSettings').component,
    );
  });
});
