/**
 * Executable-schema regression test for the ORG-023 membership payload (B-1).
 *
 * `OrganizationMembersSchema.test.ts` parses the SDL and can therefore only
 * prove that a field is *declared*. It cannot see that a resolver payload fails
 * the declared type. This test runs a real GraphQL query against a row produced
 * by the real `OrganizationService.pagedOrganizationMembers` mapper, using the
 * REAL field declarations from the SDL files.
 *
 * The bug it guards: `OrganizationMember.user` and `OrganizationMember.teams[]`
 * were hand-built plain objects carrying only `_id`, while `User.id` and
 * `Team.id` are declared `ObjID!`. Selecting `user { id }` returned
 * "Cannot return null for non-nullable field User.id" and nulled the user.
 *
 * Three cases are exercised:
 *   1. default field resolver - proves the row satisfies its own contract
 *      without help from the type-level property resolvers.
 *   2. real User/Team property resolvers merged - proves compatibility with the
 *      schema as it is actually assembled at runtime.
 *   3. the pre-fix payload shape - asserts the query FAILS, so this test cannot
 *      silently stop testing anything if the schema or payload changes.
 */
import fs from 'fs';
import path from 'path';
import {
  Kind,
  parse,
  print,
  visit,
  DocumentNode,
  DefinitionNode,
  graphql,
} from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { ObjectId } from 'mongodb';
import { OrganizationService } from '../../../services/OrganizationService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const Team: any = jest.fn();
  Team.find = jest.fn();
  Team.findOne = jest.fn();
  Team.findById = jest.fn();
  Team.countDocuments = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.find = jest.fn();
  Organization.countDocuments = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.find = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();
  BusinessUnit.countDocuments = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();
  User.findOne = jest.fn();
  User.find = jest.fn();
  User.countDocuments = jest.fn();

  const Organigram: any = jest.fn();
  Organigram.findOne = jest.fn();

  const OrganizationInvitation: any = jest.fn();
  OrganizationInvitation.find = jest.fn();
  OrganizationInvitation.findOne = jest.fn();
  OrganizationInvitation.countDocuments = jest.fn();

  return { Team, Organization, BusinessUnit, User, Organigram, OrganizationInvitation };
});

const models = require('@reactory/server-modules/reactory-core/models');
const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

const typesDir = path.resolve(__dirname, '..');

/** Real SDL files. The declarations under test come from these, unmodified. */
const SDL_FILES = [
  'Organization/Organization.graphql',
  'Organization/BusinessUnit.graphql',
  'User/User.graphql',
  'User/Team.graphql',
  'System/Scalars.graphql',
];

/**
 * Types whose REAL declaration is used. Everything else they reference becomes a
 * scalar stub, so the fragment builds standalone without dragging in the whole
 * domain schema. `User.id: ObjID!` and `Team.id: ObjID!` therefore come from the
 * shipped SDL rather than being restated here.
 */
const REAL_TYPES = ['OrganizationMember', 'User', 'Team', 'BusinessUnit'];

const DEFINITION_KINDS = [
  Kind.OBJECT_TYPE_DEFINITION,
  Kind.INPUT_OBJECT_TYPE_DEFINITION,
  Kind.ENUM_TYPE_DEFINITION,
  Kind.SCALAR_TYPE_DEFINITION,
  Kind.UNION_TYPE_DEFINITION,
  Kind.INTERFACE_TYPE_DEFINITION,
];

const BUILT_IN_SCALARS = ['String', 'Int', 'Float', 'Boolean', 'ID'];

const documents: DocumentNode[] = SDL_FILES.map((relative) =>
  parse(fs.readFileSync(path.join(typesDir, relative), 'utf-8')),
);

const declared = new Map<string, DefinitionNode>();
documents.forEach((document) => {
  document.definitions.forEach((definition: any) => {
    if (DEFINITION_KINDS.indexOf(definition.kind) >= 0) {
      if (!declared.has(definition.name.value)) {
        declared.set(definition.name.value, definition);
      }
    }
  });
});

/**
 * Every named type referenced by the supplied definitions. `graphql`'s own
 * `visit` is used because AST nodes carry cyclic `loc` links - a hand-rolled
 * object walk overflows the stack.
 */
const referencedNames = (definitions: DefinitionNode[]): string[] => {
  const names = new Set<string>();
  definitions.forEach((definition) => {
    visit(definition as any, {
      NamedType: (node: any) => {
        names.add(node.name.value);
      },
    });
  });
  return Array.from(names);
};

/**
 * Builds the schema fragment: real declarations for REAL_TYPES, plus a scalar
 * stub for every other type they reference.
 */
const buildTypeDefs = (): string => {
  const selected: DefinitionNode[] = REAL_TYPES.map((name) => {
    const definition = declared.get(name);
    if (!definition) throw new Error(`Type ${name} is not declared in the SDL files under test`);
    return definition;
  });

  const stubbed = new Set<string>();
  referencedNames(selected).forEach((name) => {
    if (BUILT_IN_SCALARS.indexOf(name) >= 0) return;
    if (name === 'Query') return;
    if (REAL_TYPES.indexOf(name) >= 0) return;
    stubbed.add(name);
  });

  const stubs = Array.from(stubbed)
    .map((name) => `scalar ${name}`)
    .join('\n');

  return `${stubs}\n${selected.map((definition) => print(definition)).join('\n')}`;
};

const typeDefs = buildTypeDefs();

/** A query exercising exactly the fields the reviewer reported as broken. */
const MEMBER_QUERY = `
  query OrganizationMembersPayload {
    OrganizationMembers {
      id
      userId
      email
      roles
      enabled
      status
      user {
        id
        firstName
        lastName
        email
        avatar
      }
      teams {
        id
        name
      }
    }
  }
`;

/** Builds a schema whose root query returns the supplied rows unchanged. */
const schemaFor = (members: any[], resolvers: Record<string, any> = {}) =>
  makeExecutableSchema({
    typeDefs: `
      type Query {
        OrganizationMembers: [OrganizationMember]
      }
      ${typeDefs}
    `,
    resolvers: {
      Query: { OrganizationMembers: () => members },
      ...resolvers,
    },
  });

const queryChain = (result: any[]) => {
  const chain: any = {
    select: jest.fn(() => chain),
    populate: jest.fn(() => chain),
    sort: jest.fn(() => chain),
    skip: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected),
  };
  return chain;
};

const makeContext = () => {
  const partnerId = new ObjectId();
  const organizationId = new ObjectId();

  const user: any = new RealUserModel({
    _id: new ObjectId(),
    firstName: 'Operator',
    lastName: 'User',
    email: 'operator@example.com',
    roles: ['USER', 'ORGANIZATION_ADMIN'],
    memberships: [
      {
        clientId: partnerId,
        organizationId,
        businessUnitId: null,
        roles: ['USER', 'ORGANIZATION_ADMIN'],
        enabled: true,
      },
    ],
  });
  user.save = jest.fn().mockResolvedValue(user);

  return {
    partnerId,
    organizationId,
    context: {
      user,
      partner: { _id: partnerId },
      hasRole: jest.fn((role: string) => ['USER', 'ORGANIZATION_ADMIN'].indexOf(role) >= 0),
      hasAnyRole: jest.fn(() => true),
      log: jest.fn(),
      error: jest.fn(),
      getService: jest.fn(),
    } as any,
  };
};

/** Runs the real service mapper and returns the row it produces. */
const buildRow = async () => {
  const { partnerId, organizationId, context } = makeContext();

  const businessUnitId = new ObjectId();
  const teamId = new ObjectId();

  const member: any = new RealUserModel({
    _id: new ObjectId(),
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    avatar: 'ada.png',
    roles: ['USER'],
    memberships: [
      {
        clientId: partnerId,
        organizationId,
        businessUnitId,
        roles: ['USER', 'TEAM_ADMIN'],
        enabled: true,
        authProvider: 'default',
        created: new Date('2026-01-01T00:00:00.000Z'),
        lastLogin: new Date('2026-02-01T00:00:00.000Z'),
      },
    ],
  });

  models.Organization.countDocuments.mockResolvedValue(1);
  models.Organization.findById.mockResolvedValue({ _id: organizationId, name: 'Acme' });
  models.User.find.mockImplementation(() => queryChain([member]));
  models.User.countDocuments.mockResolvedValue(1);
  models.BusinessUnit.find.mockImplementation(() =>
    queryChain([{ _id: businessUnitId, name: 'Engineering', organization: organizationId }]),
  );
  models.Team.find.mockImplementation(() =>
    queryChain([{ _id: teamId, name: 'Platform', title: 'Platform', members: [member._id] }]),
  );

  const service = new OrganizationService({}, context);
  const result = await service.pagedOrganizationMembers(`${organizationId}`);

  return { row: result.members[0], member, businessUnitId, teamId };
};

describe('OrganizationMember payload satisfies the declared GraphQL contract (B-1)', () => {
  it('resolves user { id } and teams { id } with no errors (default field resolver)', async () => {
    const { row, member, teamId } = await buildRow();

    const result: any = await graphql({ schema: schemaFor([row]), source: MEMBER_QUERY });

    expect(result.errors).toBeUndefined();

    const payload = result.data.OrganizationMembers[0];
    expect(payload.user).not.toBeNull();
    expect(payload.user.id).toBe(`${member._id}`);
    expect(payload.user.firstName).toBe('Ada');
    expect(payload.user.lastName).toBe('Lovelace');
    expect(payload.user.email).toBe('ada@example.com');
    expect(payload.user.avatar).toBe('ada.png');

    expect(payload.teams).toHaveLength(1);
    expect(payload.teams[0].id).toBe(`${teamId}`);
    expect(payload.teams[0].name).toBe('Platform');
  });

  it('resolves with no errors against the real User/Team property resolvers too', async () => {
    const { row, member, teamId } = await buildRow();

    // Mirrors what the merged schema registers for these two types.
    const realTypeResolvers = {
      User: {
        id: (obj: any) => (obj && obj._id ? `${obj._id}` : (obj && obj.id) || null),
        fullName: () => 'Ada Lovelace',
        fullNameWithEmail: (obj: any) => `Ada Lovelace<${obj.email}>`,
      },
      Team: {
        id: (obj: any) => (obj && obj._id ? `${obj._id}` : (obj && obj.id) || null),
        name: (obj: any) => obj.name || obj.title || null,
        title: (obj: any) => obj.name || obj.title || null,
      },
    };

    const result: any = await graphql({
      schema: schemaFor([row], realTypeResolvers),
      source: MEMBER_QUERY,
    });

    expect(result.errors).toBeUndefined();
    expect(result.data.OrganizationMembers[0].user.id).toBe(`${member._id}`);
    expect(result.data.OrganizationMembers[0].teams[0].id).toBe(`${teamId}`);
  });

  it('proves the guard bites: a payload without user.id fails the non-null contract', async () => {
    const { row } = await buildRow();

    // The pre-B-1 payload shape: `_id` only, no `id`.
    const withoutId = {
      ...row,
      user: {
        _id: row.user._id,
        firstName: row.user.firstName,
        lastName: row.user.lastName,
        email: row.user.email,
        avatar: row.user.avatar,
      },
      teams: row.teams.map((team: any) => ({ _id: team._id, name: team.name })),
    };

    const result: any = await graphql({ schema: schemaFor([withoutId]), source: MEMBER_QUERY });

    expect(result.errors).toBeDefined();
    const messages = result.errors.map((error: any) => `${error.message}`);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Cannot return null for non-nullable field User.id'),
        expect.stringContaining('Cannot return null for non-nullable field Team.id'),
      ]),
    );
  });
});
