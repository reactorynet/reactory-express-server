import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';

/**
 * Schema-level assertions for the ORG-021 team surface. Parsing the SDL is
 * enough to prove the contract without building the whole GraphQL schema.
 */
const typesDir = path.resolve(__dirname, '..');
const sdl = fs.readFileSync(path.join(typesDir, 'User/Team.graphql'), 'utf-8');

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

/** Renders a field's declared type (e.g. `BusinessUnit`) for assertion. */
const declaredType = (field: FieldDefinitionNode): string =>
  print(field.type as TypeNode);

const directiveRoles = (field: FieldDefinitionNode, directiveName: string): string[] | null => {
  const directive = (field.directives || []).find((item) => item.name.value === directiveName);
  if (!directive) return null;

  const argument = (directive.arguments || []).find((item) => item.name.value === 'roles');
  if (!argument || argument.value.kind !== Kind.LIST) return null;

  return argument.value.values.map((value: any) => value.value);
};

describe('Team GraphQL surface (ORG-021)', () => {
  describe('Team', () => {
    it('exposes the business unit link and the soft-delete flag', () => {
      const fields = fieldsOf('Team');

      expect(fields.businessUnit).toBeDefined();
      expect(declaredType(fields.businessUnit)).toBe('BusinessUnit');
      expect(fields.deleted).toBeDefined();
      expect(declaredType(fields.deleted)).toBe('Boolean');
    });

    it('keeps the ORG-001 fields', () => {
      const fields = fieldsOf('Team');

      expect(Object.keys(fields)).toEqual(
        expect.arrayContaining([
          'id',
          'organization',
          'owner',
          'title',
          'name',
          'description',
          'avatar',
          'members',
          'createdAt',
          'updatedAt',
        ]),
      );
    });
  });

  describe('TeamInput', () => {
    it('carries owner and businessUnit alongside the existing fields', () => {
      const fields = fieldsOf('TeamInput');

      expect(declaredType(fields.owner)).toBe('String');
      expect(declaredType(fields.businessUnit)).toBe('String');
      expect(Object.keys(fields)).toEqual(
        expect.arrayContaining(['title', 'name', 'description', 'avatar', 'organization']),
      );
    });
  });

  describe('ReactoryTeamFilter', () => {
    it('supports filtering by business unit as well as organization and search', () => {
      const fields = fieldsOf('ReactoryTeamFilter');

      expect(declaredType(fields.businessUnitId)).toBe('String');
      expect(fields.search).toBeDefined();
      expect(fields.organization).toBeDefined();
      expect(fields.owner).toBeDefined();
      expect(fields.member).toBeDefined();
    });
  });

  describe('queries', () => {
    it('declares the paged team query with the ORG-020 envelope', () => {
      const pagedTeams = fieldsOf('Query').pagedTeams;
      expect(pagedTeams).toBeDefined();

      const args = (pagedTeams.arguments || []).map((argument) => argument.name.value);
      expect(args).toEqual(expect.arrayContaining(['organizationId', 'filter', 'paging']));
      expect(declaredType(pagedTeams)).toBe('PagedTeams');
      expect(directiveRoles(pagedTeams, 'auth')).toEqual(['USER']);
    });

    it('declares PagedTeams mirroring PagedBusinessUnits', () => {
      const fields = fieldsOf('PagedTeams');

      expect(declaredType(fields.paging)).toBe('PagingResult');
      expect(declaredType(fields.teams)).toBe('[Team]');
    });

    it('keeps every pre-existing query working', () => {
      const queries = fieldsOf('Query');

      expect(queries.teamsForOrganization).toBeDefined();
      expect(queries.team).toBeDefined();
      expect(queries.ReactoryTeam).toBeDefined();
      expect(queries.ReactoryTeams).toBeDefined();
    });
  });

  describe('mutations', () => {
    it('declares moveTeamToBusinessUnit with both ids required', () => {
      const move = fieldsOf('Mutation').moveTeamToBusinessUnit;
      expect(move).toBeDefined();

      const args: Record<string, string> = {};
      (move.arguments || []).forEach((argument: any) => {
        args[argument.name.value] = print(argument.type);
      });

      expect(args.id).toBe('String!');
      expect(args.businessUnitId).toBe('String!');
      expect(declaredType(move)).toBe('Team');
      expect(directiveRoles(move, 'auth')).toEqual(
        expect.arrayContaining(['ORGANIZATION_ADMIN', 'ADMIN']),
      );
    });

    it('keeps every pre-existing mutation working', () => {
      const mutations = fieldsOf('Mutation');

      expect(mutations.createTeam).toBeDefined();
      expect(mutations.updateTeam).toBeDefined();
      expect(mutations.addMemberToTeam).toBeDefined();
      expect(mutations.removeMemberFromTeam).toBeDefined();
      expect(mutations.deleteTeam).toBeDefined();
    });
  });
});
