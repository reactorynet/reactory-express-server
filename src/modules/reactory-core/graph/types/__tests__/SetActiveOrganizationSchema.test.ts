/**
 * Schema-level contract for `Mutation.setActiveOrganization`.
 *
 * The PWA ships a document for this mutation
 * (`reactory-pwa-client/src/api/graphql/index.ts`) but the server field never
 * existed, so the document could not execute. This test works on the shipped
 * SDL rather than on a copy of it:
 *
 *   1. the field is declared with the required shape - a non-null
 *      `organizationId: String!` returning `Organization`, guarded by `@auth`;
 *   2. the field really executes: a minimal executable schema is built from the
 *      real `setActiveOrganization` declaration and the real `Organization`
 *      type, and the client's selection (`id`, `name`, `logo`) resolves off an
 *      organization document using the real `Organization.id` resolver;
 *   3. the trap is gone: the resolver-less `setOrganizationForUser` declaration
 *      is removed, and `UpdateUserInput` has no `organization` field, so
 *      `setActiveOrganization` is the only write path for the active
 *      organization.
 *
 * `Mutation.setOrganizationForUser` was declared with no resolver anywhere in
 * the server. It was removed rather than implemented: it means "assign a user
 * to an organization" (a membership write, already served by
 * `ReactoryCoreCreateUserMembership` and `OrganizationService.addMember`) and it
 * took the target user id as an argument, which is exactly the cross-user
 * confusion this mutation must not have.
 */
import fs from 'fs';
import path from 'path';
import {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  parse,
  print,
  visit,
  graphql,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import MergeGraphResolvers from '@reactory/server-core/utils/graph/mergeResolver';
import OrganizationResolver from '../../../resolvers/Organization/Organization';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => ({
  Organization: {},
  BusinessUnit: {},
  User: {},
}));

const typesDir = path.resolve(__dirname, '..');
const userSdlPath = path.join(typesDir, 'User/User.graphql');
const organizationSdlPath = path.join(typesDir, 'Organization/Organization.graphql');

const userDocument: DocumentNode = parse(fs.readFileSync(userSdlPath, 'utf-8'));
const organizationDocument: DocumentNode = parse(fs.readFileSync(organizationSdlPath, 'utf-8'));

const OBJECT_KINDS = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION];

/** Every field declared on `Mutation` - in the type definition or an extension. */
const mutationFields = (document: DocumentNode): Map<string, FieldDefinitionNode> => {
  const fields = new Map<string, FieldDefinitionNode>();
  document.definitions.forEach((definition: DefinitionNode) => {
    if (OBJECT_KINDS.indexOf(definition.kind) < 0) return;
    const object = definition as ObjectTypeDefinitionNode | ObjectTypeExtensionNode;
    if (object.name.value !== 'Mutation') return;
    (object.fields || []).forEach((field) => fields.set(field.name.value, field));
  });
  return fields;
};

const namedType = (type: any): string | undefined =>
  type.kind === Kind.NON_NULL_TYPE || type.kind === Kind.LIST_TYPE
    ? namedType(type.type)
    : type.name.value;

const declaredType = (document: DocumentNode, name: string): DefinitionNode | undefined =>
  document.definitions.find(
    (definition: any) => definition.name && definition.name.value === name,
  );

const fields = mutationFields(userDocument);

const setActiveOrganization = fields.get('setActiveOrganization');

/** Referenced type names in a definition, so the fragment can stub what it needs. */
const referencedNames = (definition: ASTNode): string[] => {
  const names = new Set<string>();
  visit(definition as any, {
    NamedType: (node: any) => names.add(node.name.value),
  });
  return Array.from(names);
};

const BUILT_IN = ['String', 'Int', 'Float', 'Boolean', 'ID'];

/**
 * Type defs for the executable check: the real `Organization` declaration and
 * the real `setActiveOrganization` field, plus a scalar stub for every other
 * name they mention. Nothing under test is restated here.
 */
const buildTypeDefs = (): string => {
  if (!setActiveOrganization) throw new Error('Mutation.setActiveOrganization is not declared in User.graphql');

  const organization = declaredType(organizationDocument, 'Organization');
  if (!organization) throw new Error('type Organization is not declared in Organization.graphql');

  const declared = new Set(['Organization', 'Query', 'Mutation', 'AuthScope']);
  const stubs = new Set<string>();
  referencedNames(organization)
    .concat(referencedNames(setActiveOrganization))
    .forEach((name) => {
      if (BUILT_IN.indexOf(name) >= 0) return;
      if (declared.has(name)) return;
      stubs.add(name);
    });

  return `
    enum AuthScope { TENANT ORGANIZATION BUSINESS_UNIT }
    directive @auth(roles: [String] = ["USER"], scope: AuthScope = TENANT, orgArg: String, buArg: String) on OBJECT | FIELD_DEFINITION
    ${Array.from(stubs).map((name) => `scalar ${name}`).join('\n')}
    ${print(organization)}
    type Query { _schemaProbe: Boolean }
    type Mutation { _schemaProbe: Boolean }
    extend type Mutation { ${print(setActiveOrganization)} }
  `;
};

/**
 * The mutation the PWA sends. It is the client's document, with the one
 * difference the schema requires: `$organizationId` must be declared `String!`
 * because the argument is non-null. (The document currently in the client
 * declares `String`, which GraphQL rejects in a non-null position; see the
 * completion report.)
 */
const CLIENT_MUTATION = `
  mutation SetActiveOrganization($organizationId: String!) {
    setActiveOrganization(organizationId: $organizationId){
      id
      name
      logo
    }
  }
`;

const organizationId = new ObjectId();
const organizationDocumentRow = { _id: organizationId, name: 'Acme Holdings', logo: 'acme.png' };

const buildSchema = () => {
  const realOrganizationResolvers = (MergeGraphResolvers([OrganizationResolver]) as Record<string, any>)
    .Organization as any;

  return makeExecutableSchema({
    typeDefs: buildTypeDefs(),
    resolvers: {
      Query: { _schemaProbe: () => true },
      Mutation: {
        // The field under test resolves to the document the resolver returns.
        setActiveOrganization: () => organizationDocumentRow,
        _schemaProbe: () => true,
      },
      Organization: {
        // The real `Organization.id` resolver, selected by name.
        id: realOrganizationResolvers.id,
      },
    },
  });
};

describe('Mutation.setActiveOrganization schema contract', () => {
  it('is declared with a required organization id and returns an Organization', () => {
    expect(setActiveOrganization).toBeDefined();

    const argument = (setActiveOrganization.arguments || []).find((arg) => arg.name.value === 'organizationId');
    expect(argument).toBeDefined();
    expect(argument.type.kind).toBe(Kind.NON_NULL_TYPE);
    expect(namedType(argument.type)).toBe('String');

    expect(namedType(setActiveOrganization.type)).toBe('Organization');
  });

  it('is guarded by @auth for signed-in users', () => {
    const auth = (setActiveOrganization.directives || []).find((directive) => directive.name.value === 'auth');
    expect(auth).toBeDefined();

    const roles = auth.arguments.find((argument) => argument.name.value === 'roles');
    const values = (roles.value as any).values.map((value: any) => value.value);
    expect(values).toEqual(expect.arrayContaining(['USER', 'ADMIN']));
    expect(values).not.toContain('ANON');
  });

  it("executes the client's selection set against the shipped declarations", async () => {
    const result: any = await graphql({
      schema: buildSchema(),
      source: CLIENT_MUTATION,
      variableValues: { organizationId: `${organizationId}` },
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.setActiveOrganization).toEqual({
      id: `${organizationId}`,
      name: 'Acme Holdings',
      logo: 'acme.png',
    });
  });

  it('removes the resolver-less setOrganizationForUser declaration', () => {
    expect(fields.has('setOrganizationForUser')).toBe(false);
    expect(fs.readFileSync(userSdlPath, 'utf-8')).not.toMatch(/setOrganizationForUser/);
  });

  it('does not add a second write path through UpdateUserInput', () => {
    const updateUserInput = declaredType(userDocument, 'UpdateUserInput') as InputObjectTypeDefinitionNode;
    expect(updateUserInput).toBeDefined();

    const names = (updateUserInput.fields || []).map((field) => field.name.value);
    expect(names).toContain('businessUnit');
    expect(names).not.toContain('organization');
  });
});
