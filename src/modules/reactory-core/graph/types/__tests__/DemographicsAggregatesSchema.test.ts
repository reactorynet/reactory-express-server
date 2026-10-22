import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import CoreTypeDefinitions from '../index';

/**
 * Schema-level assertions for the ORG-035 aggregate surface.
 *
 * Pins the query names/signatures the reporting UI and the CSV export rely on,
 * and pins the *shape* of the privacy contract: the report must expose the
 * applied threshold and an explicit percentage denominator, and the CSV export
 * must be a Query (`String!`) rather than a Mutation.
 */
const typesDir = path.resolve(__dirname, '..');
const sdl = fs.readFileSync(path.join(typesDir, 'Demographics/Demographics.graphql'), 'utf-8');

const collectFields = (typeName: string): Record<string, FieldDefinitionNode> => {
  const fields: Record<string, FieldDefinitionNode> = {};

  parse(sdl).definitions.forEach((definition) => {
    if (
      (definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.OBJECT_TYPE_EXTENSION) &&
      definition.name.value === typeName
    ) {
      (definition.fields || []).forEach((field) => {
        fields[field.name.value] = field;
      });
    }
  });

  return fields;
};

const typeOf = (fields: Record<string, FieldDefinitionNode>, fieldName: string): string => {
  const field = fields[fieldName];
  if (!field) throw new Error(`Expected field "${fieldName}" to exist`);
  return print(field.type as TypeNode);
};

const argTypes = (
  fields: Record<string, FieldDefinitionNode>,
  fieldName: string,
): Record<string, string> => {
  const field = fields[fieldName];
  if (!field) throw new Error(`Expected field "${fieldName}" to exist`);
  return (field.arguments || []).reduce<Record<string, string>>((result, argument) => {
    result[argument.name.value] = print(argument.type as TypeNode);
    return result;
  }, {});
};

describe('Demographics aggregate GraphQL surface (ORG-035)', () => {
  it('composes with the rest of the core schema', () => {
    const schema = makeExecutableSchema({ typeDefs: CoreTypeDefinitions, resolvers: {} });
    const queryFields = schema.getQueryType().getFields();

    expect(queryFields.OrganizationDemographicAggregates).toBeDefined();
    expect(`${queryFields.OrganizationDemographicAggregates.type}`).toBe(
      'DemographicAggregateReport!',
    );
    expect(queryFields.OrganizationDemographicAggregatesCsv).toBeDefined();
    expect(`${queryFields.OrganizationDemographicAggregatesCsv.type}`).toBe('String!');

    expect(schema.getType('DemographicAggregateReport')).toBeDefined();
    expect(schema.getType('DemographicDefinitionAggregate')).toBeDefined();
    expect(schema.getType('DemographicAggregateBucket')).toBeDefined();
    expect(schema.getType('DemographicAggregateFilter')).toBeDefined();
  });

  it('declares the aggregate queries with the agreed arguments', () => {
    const queries = collectFields('Query');

    const expectedArguments = {
      organizationId: 'String!',
      definitionKeys: '[String!]',
      filter: 'DemographicAggregateFilter',
    };

    expect(argTypes(queries, 'OrganizationDemographicAggregates')).toEqual(expectedArguments);
    expect(argTypes(queries, 'OrganizationDemographicAggregatesCsv')).toEqual(expectedArguments);
  });

  it('exposes the CSV export as a query, never a mutation', () => {
    // An export reads and changes nothing. A mutation would imply a write,
    // need write-side guards and defeat caching. This assertion exists so the
    // decision cannot be silently reversed.
    expect(collectFields('Query').OrganizationDemographicAggregatesCsv).toBeDefined();
    expect(collectFields('Mutation')).not.toHaveProperty('OrganizationDemographicAggregatesCsv');
  });

  it('returns the applied threshold, an explicit denominator and the suppression count', () => {
    const report = collectFields('DemographicAggregateReport');
    expect(typeOf(report, 'minimumAggregationGroupSize')).toBe('Int!');
    expect(typeOf(report, 'filter')).toBe('DemographicAggregateFilterEcho!');

    const definition = collectFields('DemographicDefinitionAggregate');
    expect(typeOf(definition, 'suppressed')).toBe('Boolean!');
    expect(typeOf(definition, 'suppressedCohorts')).toBe('Int');
    expect(typeOf(definition, 'cohortTotal')).toBe('Int!');
    expect(typeOf(definition, 'percentageDenominator')).toBe('Int!');
    expect(typeOf(definition, 'denominatorKind')).toBe('String!');
    expect(typeOf(definition, 'sensitive')).toBe('Boolean!');
    expect(typeOf(definition, 'buckets')).toBe('[DemographicAggregateBucket!]!');
  });

  it('makes suppressedCohorts nullable, so a suppressed definition discloses no cohort count', () => {
    // This nullability IS the privacy guarantee, not an oversight. If the field
    // were `Int!`, a definition whose every bucket was withheld would report a
    // count of withheld buckets, which distinguishes it from a definition
    // nobody answered and reveals that the definition has answers at all.
    const definition = collectFields('DemographicDefinitionAggregate');

    expect(typeOf(definition, 'suppressed')).toBe('Boolean!');
    expect(typeOf(definition, 'suppressedCohorts')).toBe('Int');
  });

  it('offers the documented filter fields', () => {
    const filter = parse(sdl).definitions.find(
      (definition) =>
        definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION &&
        definition.name.value === 'DemographicAggregateFilter',
    ) as any;

    expect(filter).toBeDefined();

    const fields = (filter.fields || []).reduce((result: Record<string, string>, field: any) => {
      result[field.name.value] = print(field.type as TypeNode);
      return result;
    }, {});

    expect(fields).toEqual({
      businessUnit: 'String',
      team: 'String',
      region: 'String',
      effectiveFrom: 'Date',
      effectiveTo: 'Date',
    });
  });
});
