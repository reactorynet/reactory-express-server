import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import CoreTypeDefinitions from '../index';

/**
 * Schema-level assertions for the demographics surface (ORG-006).
 *
 * The two things that can silently break downstream work are the exact name and
 * signature of `OrganizationDemographicDefinitions` (Org-010's plugin calls it
 * and treats a schema rejection as "not implemented yet") and the
 * `Organization.demographicsPolicy` extension. Parsing the SDL is enough to
 * pin both without building the whole executable schema.
 */
const typesDir = path.resolve(__dirname, '..');

const readSdl = (relativePath: string): string =>
  fs.readFileSync(path.join(typesDir, `${relativePath}.graphql`), 'utf-8');

const demographicsSdl = readSdl('Demographics/Demographics');

const collectFields = (sdl: string, typeName: string): Record<string, FieldDefinitionNode> => {
  const fields: Record<string, FieldDefinitionNode> = {};

  parse(sdl).definitions.forEach((definition) => {
    if (
      (definition.kind === Kind.OBJECT_TYPE_DEFINITION || definition.kind === Kind.OBJECT_TYPE_EXTENSION) &&
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

const definedTypeNames = (sdl: string): string[] =>
  parse(sdl).definitions
    .filter(
      (definition) =>
        definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.ENUM_TYPE_DEFINITION ||
        definition.kind === Kind.SCALAR_TYPE_DEFINITION,
    )
    .map((definition: any) => definition.name.value);

describe('Demographics GraphQL surface (ORG-006)', () => {
  it('is loaded into the core schema build after the Organization base type', () => {
    const organizationIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('type Organization ') >= 0);
    const demographicsIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('OrganizationDemographicDefinitions') >= 0);

    expect(organizationIndex).toBeGreaterThanOrEqual(0);
    expect(demographicsIndex).toBeGreaterThanOrEqual(0);
    // The SDL extends `type Organization`, so the base must load first.
    expect(demographicsIndex).toBeGreaterThan(organizationIndex);
  });

  it('composes with every other core SDL file into an executable schema', () => {
    // The real graph is assembled from these SDL strings, so a name that is
    // only unique inside this file (or an extension that targets a type nobody
    // declares) would still fail here. This is the contract ORG-010 relies on.
    const schema = makeExecutableSchema({ typeDefs: CoreTypeDefinitions, resolvers: {} });

    const queryFields = schema.getQueryType().getFields();
    expect(queryFields.OrganizationDemographicDefinitions).toBeDefined();
    // Built schema types are GraphQLType instances, so they stringify rather
    // than printing as AST nodes.
    expect(`${queryFields.OrganizationDemographicDefinitions.type}`).toBe(
      '[DemographicDefinition!]!',
    );
    expect(queryFields.OrganizationDemographicDefinitions.args.map((argument) => argument.name)).toEqual([
      'organizationId',
      'includeDisabled',
    ]);

    const organizationFields = (schema.getType('Organization') as any).getFields();
    expect(organizationFields.demographicsPolicy).toBeDefined();
    expect(`${organizationFields.demographicsPolicy.type}`).toBe(
      'OrganizationDemographicsPolicy',
    );

    expect(schema.getMutationType().getFields().MySaveDemographics).toBeDefined();
  });

  it('keeps OrganizationDemographicDefinitions as a top-level query with the agreed signature', () => {
    const queries = collectFields(demographicsSdl, 'Query');

    expect(argTypes(queries, 'OrganizationDemographicDefinitions')).toEqual({
      organizationId: 'String!',
      includeDisabled: 'Boolean',
    });
    expect(typeOf(queries, 'OrganizationDemographicDefinitions')).toBe('[DemographicDefinition!]!');
  });

  it('exposes every demographic query', () => {
    const queries = collectFields(demographicsSdl, 'Query');

    expect(argTypes(queries, 'OrganizationDemographicDefinition')).toEqual({
      organizationId: 'String!',
      key: 'String!',
    });
    expect(typeOf(queries, 'OrganizationDemographicDefinition')).toBe('DemographicDefinition');

    expect(argTypes(queries, 'OrganizationDemographicValues')).toEqual({
      organizationId: 'String!',
      filter: 'DemographicValueFilter',
      paging: 'PagingRequest',
    });
    expect(typeOf(queries, 'OrganizationDemographicValues')).toBe('PagedDemographicValues');

    expect(argTypes(queries, 'MyDemographics')).toEqual({
      organizationId: 'String!',
      membershipId: 'String',
    });
    expect(typeOf(queries, 'MyDemographics')).toBe('[DemographicValue!]!');
  });

  it('exposes every demographic mutation', () => {
    const mutations = collectFields(demographicsSdl, 'Mutation');

    expect(argTypes(mutations, 'OrganizationSaveDemographicDefinition')).toEqual({
      organizationId: 'String!',
      definition: 'DemographicDefinitionInput!',
    });
    expect(typeOf(mutations, 'OrganizationSaveDemographicDefinition')).toBe('DemographicDefinition!');

    expect(argTypes(mutations, 'OrganizationDeleteDemographicDefinition')).toEqual({
      organizationId: 'String!',
      key: 'String!',
    });
    expect(typeOf(mutations, 'OrganizationDeleteDemographicDefinition')).toBe('Boolean!');

    expect(argTypes(mutations, 'OrganizationReorderDemographicDefinitions')).toEqual({
      organizationId: 'String!',
      keys: '[String!]!',
    });
    expect(typeOf(mutations, 'OrganizationReorderDemographicDefinitions')).toBe(
      '[DemographicDefinition!]!',
    );

    expect(argTypes(mutations, 'OrganizationSetDemographicEnabled')).toEqual({
      organizationId: 'String!',
      key: 'String!',
      enabled: 'Boolean!',
    });
    expect(typeOf(mutations, 'OrganizationSetDemographicEnabled')).toBe('DemographicDefinition!');

    expect(argTypes(mutations, 'OrganizationUpdateDemographicsPolicy')).toEqual({
      organizationId: 'String!',
      policy: 'OrganizationDemographicsPolicyInput!',
    });
    expect(typeOf(mutations, 'OrganizationUpdateDemographicsPolicy')).toBe(
      'OrganizationDemographicsPolicy!',
    );

    expect(argTypes(mutations, 'OrganizationSaveDemographicValue')).toEqual({
      organizationId: 'String!',
      value: 'DemographicValueInput!',
    });
    expect(typeOf(mutations, 'OrganizationSaveDemographicValue')).toBe('DemographicValue!');

    expect(argTypes(mutations, 'OrganizationBulkSaveDemographicValues')).toEqual({
      organizationId: 'String!',
      values: '[DemographicValueInput!]!',
    });
    expect(typeOf(mutations, 'OrganizationBulkSaveDemographicValues')).toBe('[DemographicValue!]!');

    expect(argTypes(mutations, 'OrganizationDeleteDemographicValue')).toEqual({
      organizationId: 'String!',
      key: 'String!',
      user: 'String',
    });
    expect(typeOf(mutations, 'OrganizationDeleteDemographicValue')).toBe('Boolean!');

    expect(argTypes(mutations, 'MySaveDemographics')).toEqual({
      organizationId: 'String!',
      values: '[DemographicValueInput!]!',
      membershipId: 'String',
    });
    expect(typeOf(mutations, 'MySaveDemographics')).toBe('[DemographicValue!]!');
  });

  it('declares the documented types and no accidental duplicates', () => {
    const names = parse(demographicsSdl).definitions
      .filter((definition) => definition.kind === Kind.OBJECT_TYPE_DEFINITION)
      .map((definition: any) => definition.name.value);

    expect(names).toEqual(
      expect.arrayContaining([
        'DemographicDefinition',
        'DemographicOption',
        'DemographicWidget',
        'DemographicValue',
        'PagedDemographicValues',
        'OrganizationDemographicsPolicy',
      ]),
    );

    // Object definitions appear exactly once each in this file.
    expect(new Set(names).size).toBe(names.length);
  });

  it('accepts the system flag on the definition input so ORG-030 can seed base definitions', () => {
    const input = parse(demographicsSdl).definitions.find(
      (definition) =>
        definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION &&
        definition.name.value === 'DemographicDefinitionInput',
    ) as any;

    expect(input).toBeDefined();

    const inputFields: FieldDefinitionNode[] = input.fields || [];
    const fields = inputFields.reduce((result: Record<string, string>, field) => {
      result[field.name.value] = print(field.type as TypeNode);
      return result;
    }, {});

    expect(fields.system).toBe('Boolean');
    expect(fields.valueType).toBe('String');
    expect(fields.options).toBe('[DemographicOptionInput!]');
  });

  it('extends Organization with demographicsPolicy', () => {
    const organizationFields = collectFields(demographicsSdl, 'Organization');

    expect(typeOf(organizationFields, 'demographicsPolicy')).toBe('OrganizationDemographicsPolicy');
  });

  it('reuses core scalars/paging instead of redeclaring them', () => {
    const defined = definedTypeNames(demographicsSdl);

    expect(defined).not.toContain('Any');
    expect(defined).not.toContain('Date');
    expect(defined).not.toContain('PagingResult');
    expect(defined).not.toContain('PagingRequest');
  });

  it('resolves every demographic type/input reference', () => {
    const defined = new Set(definedTypeNames(demographicsSdl));
    const knownCoreTypes = new Set(['Any', 'Date', 'PagingResult', 'PagingRequest', 'Organization']);

    const referenced = Array.from(
      new Set(
        (demographicsSdl.match(/\b(Demographic|PagedDemographic|OrganizationDemographics)[A-Za-z]*\b/g) || []) as string[],
      ),
    );

    expect(referenced.length).toBeGreaterThan(0);
    referenced.forEach((name) => {
      expect(defined.has(name) || knownCoreTypes.has(name)).toBe(true);
    });
  });
});
