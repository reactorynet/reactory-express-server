import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';

/**
 * Schema-level assertions for the ORG-023 membership surface.
 *
 * Parsing the SDL proves the contract (fields, arguments, return types and the
 * coarse `@auth` gate) without building the whole executable schema. The
 * org-scoped authorization behind it is covered in
 * `services/__tests__/OrganizationService.members.test.ts`.
 */
const typesDir = path.resolve(__dirname, '..');
const sdl = fs.readFileSync(path.join(typesDir, 'Organization/Organization.graphql'), 'utf-8');

const definitions = parse(sdl).definitions;

const fieldsOf = (typeName: string): Record<string, FieldDefinitionNode> => {
  const fields: Record<string, FieldDefinitionNode> = {};
  definitions.forEach((definition: any) => {
    if (
      (definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.OBJECT_TYPE_EXTENSION ||
        definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) &&
      definition.name.value === typeName
    ) {
      (definition.fields || []).forEach((field: any) => {
        fields[field.name.value] = field;
      });
    }
  });
  return fields;
};

const declaredType = (field: FieldDefinitionNode): string => print(field.type as TypeNode);

const argumentNames = (field: FieldDefinitionNode): string[] =>
  (field.arguments || []).map((argument) => argument.name.value);

const directiveRoles = (field: FieldDefinitionNode, directiveName: string): string[] | null => {
  const directive = (field.directives || []).find((item) => item.name.value === directiveName);
  if (!directive) return null;

  const argument = (directive.arguments || []).find((item) => item.name.value === 'roles');
  if (!argument || argument.value.kind !== Kind.LIST) return null;

  return argument.value.values.map((value: any) => value.value);
};

describe('Organization membership GraphQL surface (ORG-023)', () => {
  const queries = fieldsOf('Query');
  const mutations = fieldsOf('Mutation');

  describe('OrganizationMembers query', () => {
    it('is exposed with organizationId, filter and paging', () => {
      expect(queries.OrganizationMembers).toBeDefined();
      expect(argumentNames(queries.OrganizationMembers)).toEqual([
        'organizationId',
        'filter',
        'paging',
      ]);
      expect(declaredType(queries.OrganizationMembers)).toBe('PagedOrganizationMembers');
    });

    it('requires the organization administration roles (rows expose member PII)', () => {
      const roles = directiveRoles(queries.OrganizationMembers, 'auth');

      expect(roles).not.toBeNull();
      expect(roles).not.toContain('USER');
      expect(roles).toEqual(expect.arrayContaining(['ORGANIZATION_ADMIN', 'ADMIN']));
    });

    it('keeps CoreUsersForOrganization available (deprecated, not removed)', () => {
      expect(queries.CoreUsersForOrganization).toBeDefined();
      expect(declaredType(queries.CoreUsersForOrganization)).toBe('PagedUserResults');
      const deprecated = (queries.CoreUsersForOrganization.directives || []).find(
        (directive) => directive.name.value === 'deprecated',
      );
      expect(deprecated).toBeDefined();
    });
  });

  describe('membership-shaped envelope and row', () => {
    it('mirrors the paged envelope used by business units and teams', () => {
      const envelope = fieldsOf('PagedOrganizationMembers');

      expect(declaredType(envelope.paging)).toBe('PagingResult');
      expect(declaredType(envelope.members)).toBe('[OrganizationMember]');
    });

    it('carries membership data as well as the member identity', () => {
      const fields = fieldsOf('OrganizationMember');

      // member identity
      ['userId', 'user', 'email', 'firstName', 'lastName', 'avatar'].forEach((field) =>
        expect(fields[field]).toBeDefined(),
      );

      // membership data - the reason this query exists alongside the user-shaped one
      ['id', 'roles', 'enabled', 'status', 'businessUnit', 'businessUnitId', 'teamIds', 'teams', 'created', 'lastLogin', 'invited'].forEach(
        (field) => expect(fields[field]).toBeDefined(),
      );
    });
  });

  describe('OrganizationMemberFilter', () => {
    it('supports text search, role and enabled/status filters', () => {
      const fields = fieldsOf('OrganizationMemberFilter');

      ['search', 'role', 'enabled', 'status', 'includeDeactivated', 'deactivatedOnly', 'businessUnitId', 'teamId'].forEach(
        (field) => expect(fields[field]).toBeDefined(),
      );
    });
  });

  describe('mutations', () => {
    it('exposes inviteOrganizationMember returning the pending member', () => {
      expect(mutations.inviteOrganizationMember).toBeDefined();
      expect(argumentNames(mutations.inviteOrganizationMember)).toEqual([
        'id',
        'email',
        'roles',
        'businessUnitId',
      ]);
      expect(declaredType(mutations.inviteOrganizationMember)).toBe('OrganizationMember!');
      expect(directiveRoles(mutations.inviteOrganizationMember, 'auth')).toEqual([
        'ORGANIZATION_ADMIN',
        'ADMIN',
        'SYSTEM',
      ]);
    });

    it('exposes deactivateOrganizationMember as a soft state change', () => {
      expect(mutations.deactivateOrganizationMember).toBeDefined();
      expect(argumentNames(mutations.deactivateOrganizationMember)).toEqual(['id', 'userId']);
      expect(declaredType(mutations.deactivateOrganizationMember)).toBe('Organization!');
      expect(directiveRoles(mutations.deactivateOrganizationMember, 'auth')).toEqual([
        'ORGANIZATION_ADMIN',
        'ADMIN',
        'SYSTEM',
      ]);
    });

    it('keeps the ORG-005 membership mutations untouched', () => {
      ['addOrganizationMember', 'removeOrganizationMember', 'setOrganizationMemberRoles'].forEach(
        (mutation) => {
          expect(mutations[mutation]).toBeDefined();
          expect(directiveRoles(mutations[mutation], 'auth')).toEqual([
            'ORGANIZATION_ADMIN',
            'ADMIN',
            'SYSTEM',
          ]);
        },
      );
    });
  });
});
