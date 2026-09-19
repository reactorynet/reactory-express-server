import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildSchema,
  buildClientSchema,
  parse,
  buildASTSchema,
  GraphQLObjectType,
  GraphQLNonNull,
} from 'graphql';
import Reactory from '@reactorynet/reactory-core';

import ReactoryGraphQLResolver from '../ReactoryGraphQLResolver';
import {
  setReactorySchema,
  getReactorySchema,
  clearReactorySchema,
} from '@reactory/server-core/graph/schemaRegistry';

/**
 * Tests for the GraphQL schema introspection capability that backs the GraphQL
 * editor's component view.
 *
 * Two things matter here:
 *
 *   1. It is reachable where a plain `__schema` operation is not. Apollo Server
 *      disables introspection outside development, so this resolver reads the
 *      in-process schema instead. That is the whole reason it exists.
 *   2. Its output is actually consumable by the client. The round-trip test
 *      feeds the server's `introspection` straight into `buildClientSchema` —
 *      the exact call the editor makes — so a change that quietly breaks the
 *      client is caught here, at the protocol boundary.
 */

const SDL_PATH = join(__dirname, '../../../graph/types/GraphQL/ReactoryGraphQL.graphql');

/**
 * The type-defs file uses `extend type Query/Mutation` and the custom `Any`
 * scalar, which only exist once the whole schema is assembled. Supply the
 * minimum base declarations so the fragment can be built standalone.
 */
const BASE_SDL = `
scalar Any

type Query {
  _placeholder: String
}

type Mutation {
  _placeholder: String
}
`;

const buildTestSchema = (sdl: string) => buildASTSchema(parse(`${BASE_SDL}\n${sdl}`));

const buildContext = (roles: string[]): Reactory.Server.IReactoryContext =>
  ({
    hasRole: (role: string) => roles.includes(role),
  }) as unknown as Reactory.Server.IReactoryContext;

const callResolver = (roles: string[] = ['DEVELOPER']) =>
  ReactoryGraphQLResolver.Query.ReactoryGraphQLSchema({}, {}, buildContext(roles));

const smallSchema = () =>
  buildSchema(`
    """A person."""
    type Person {
      id: ID!
      name: String
      role: Role
    }

    enum Role {
      ADMIN
      USER
    }

    type Query {
      person: Person
    }
  `);

afterEach(() => {
  clearReactorySchema();
});

describe('schema registry', () => {
  it('holds the schema it was given', () => {
    const schema = smallSchema();
    setReactorySchema(schema);

    expect(getReactorySchema()).toBe(schema);
  });

  it('is empty before anything registers a schema', () => {
    clearReactorySchema();
    expect(getReactorySchema()).toBeNull();
  });
});

describe('ReactoryGraphQLSchema resolver', () => {
  it('rejects a caller without the developer roles', async () => {
    setReactorySchema(smallSchema());

    await expect(callResolver(['USER'])).rejects.toThrow(
      /Unauthorized: GraphQL schema introspection requires the DEVELOPER or ADMIN role/,
    );
  });

  it('rejects an anonymous caller', async () => {
    setReactorySchema(smallSchema());

    await expect(callResolver(['ANON'])).rejects.toThrow(/Unauthorized/);
  });

  it('allows DEVELOPER', async () => {
    setReactorySchema(smallSchema());

    await expect(callResolver(['DEVELOPER'])).resolves.toBeDefined();
  });

  it('allows ADMIN', async () => {
    setReactorySchema(smallSchema());

    await expect(callResolver(['ADMIN'])).resolves.toBeDefined();
  });

  it('fails clearly when the schema has not compiled', async () => {
    clearReactorySchema();

    await expect(callResolver(['DEVELOPER'])).rejects.toThrow(/schema is not available/i);
  });

  it('returns introspection, SDL and a non-zero type count', async () => {
    setReactorySchema(smallSchema());

    const result: any = await callResolver(['DEVELOPER']);

    expect(result.introspection).toBeDefined();
    expect(result.introspection.__schema).toBeDefined();
    expect(result.introspection.__schema.types.length).toBeGreaterThan(0);

    expect(typeof result.sdl).toBe('string');
    expect(result.sdl).toContain('type Person');
    expect(result.sdl).toContain('enum Role');

    expect(result.typeCount).toBeGreaterThanOrEqual(3);

    expect(typeof result.compiledAt).toBe('string');
    expect(Number.isNaN(Date.parse(result.compiledAt))).toBe(false);
  });

  it('excludes built-in introspection types from the count', async () => {
    setReactorySchema(smallSchema());

    const result: any = await callResolver(['DEVELOPER']);
    const names: string[] = result.introspection.__schema.types.map((t: any) => t.name);

    expect(names).toContain('__Schema');
    expect(names).toContain('__Type');
    expect(result.typeCount).toBeLessThan(names.length);
  });

  it('round-trips: the server introspection is consumable by buildClientSchema', async () => {
    setReactorySchema(smallSchema());

    const result: any = await callResolver(['DEVELOPER']);

    // Exactly what the editor does with the response.
    const clientSchema = buildClientSchema(result.introspection);
    const person = clientSchema.getType('Person');

    expect(person).toBeDefined();
    expect(clientSchema.getQueryType()?.getFields().person).toBeDefined();

    // Field metadata must survive: the component view builds its form from it.
    const fields = (person as any).getFields();
    expect(fields.id.type.toString()).toBe('ID!');
    expect(fields.name.type.toString()).toBe('String');
    expect(fields.role.type.toString()).toBe('Role');
  });
});

describe('ReactoryGraphQL.graphql SDL', () => {
  const source = readFileSync(SDL_PATH, 'utf8');

  it('parses as valid GraphQL', () => {
    expect(() => parse(source)).not.toThrow();
  });

  it('declares ReactoryGraphQLSchema on the Query type', () => {
    const schema = buildTestSchema(source);
    const queryType = schema.getType('Query') as GraphQLObjectType;

    const field = queryType.getFields().ReactoryGraphQLSchema;
    expect(field).toBeDefined();
    expect(field.type.toString()).toBe('GraphQLSchemaInfo');
  });

  it('exposes introspection, sdl, typeCount and compiledAt', () => {
    const schema = buildTestSchema(source);
    const info = schema.getType('GraphQLSchemaInfo') as GraphQLObjectType;

    expect(Object.keys(info.getFields()).sort()).toEqual([
      'compiledAt',
      'introspection',
      'sdl',
      'typeCount',
    ]);
  });

  it('still declares the existing query and mutation execution fields', () => {
    // The editor depends on both; introspection must not have displaced them.
    const schema = buildTestSchema(source);
    const queryType = schema.getType('Query') as GraphQLObjectType;
    const mutationType = schema.getType('Mutation') as GraphQLObjectType;

    expect(queryType.getFields().ReactoryGraphQLQuery).toBeDefined();
    expect(mutationType.getFields().ReactoryGraphQLQuery).toBeDefined();
  });

  it('requires the query argument on the execution input', () => {
    const schema = buildTestSchema(source);
    const input = schema.getType('GraphQLQueryInput') as any;
    const queryField = input.getFields().query;

    expect(queryField.type).toBeInstanceOf(GraphQLNonNull);
    expect(queryField.type.toString()).toBe('String!');
  });
});
