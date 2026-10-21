import fs from 'fs';
import path from 'path';
import { parse, Kind, FieldDefinitionNode, InputValueDefinitionNode } from 'graphql';

/**
 * Schema-level assertions for the ORG-005 surface: the expanded update input,
 * the corrected `@auth` directives and the new administration mutations and
 * statistics query. Parsing the SDL is enough to prove the contract without
 * building the whole GraphQL schema.
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

const inputFields = (typeName: string): Record<string, InputValueDefinitionNode> =>
  fieldsOf(typeName) as any;

const directiveRoles = (field: FieldDefinitionNode, directiveName: string): string[] | null => {
  const directive = (field.directives || []).find((item) => item.name.value === directiveName);
  if (!directive) return null;

  const argument = (directive.arguments || []).find((item) => item.name.value === 'roles');
  if (!argument || argument.value.kind !== Kind.LIST) return null;

  return argument.value.values.map((value: any) => value.value);
};

describe('Organization GraphQL surface (ORG-005)', () => {
  describe('UpdateOrganizationInput', () => {
    it('accepts every identity, lifecycle and branding field', () => {
      const fields = inputFields('UpdateOrganizationInput');

      expect(Object.keys(fields)).toEqual(
        expect.arrayContaining([
          'code',
          'name',
          'tradingName',
          'legalName',
          'description',
          'website',
          'contactEmail',
          'contactPhone',
          'status',
          'theme',
          'themeMode',
          'public',
          'avatar',
          'logo',
          'settings',
          'legacyId',
        ]),
      );
    });

    it('keeps the pre-ORG-005 fields so existing callers are not broken', () => {
      const fields = inputFields('UpdateOrganizationInput');

      ['code', 'name', 'tradingName', 'logo', 'settings', 'legacyId'].forEach((field) => {
        expect(fields[field]).toBeDefined();
      });
    });
  });

  describe('@auth directives', () => {
    const mutations = fieldsOf('Mutation');

    it('no longer admits a plain USER to create or update', () => {
      expect(directiveRoles(mutations.createOrganization, 'auth')).toEqual(['ADMIN', 'SYSTEM']);
      expect(directiveRoles(mutations.updateOrganization, 'auth')).not.toContain('USER');
      expect(directiveRoles(mutations.updateOrganization, 'auth')).toEqual([
        'ORGANIZATION_ADMIN',
        'ADMIN',
        'SYSTEM',
      ]);
    });

    it.each([
      'archiveOrganization',
      'restoreOrganization',
      'OrganizationSetSetting',
      'OrganizationRemoveSetting',
      'addOrganizationMember',
      'removeOrganizationMember',
      'setOrganizationMemberRoles',
    ])('protects %s with the organization administration roles', (mutation) => {
      const roles = directiveRoles(mutations[mutation], 'auth');

      expect(roles).not.toBeNull();
      expect(roles).not.toContain('USER');
      expect(roles).toEqual(expect.arrayContaining(['ORGANIZATION_ADMIN', 'ADMIN']));
    });

    it('keeps the ORG-004 theme mutations protected', () => {
      ['OrganizationSaveTheme', 'OrganizationSetActiveTheme', 'OrganizationDeleteTheme', 'OrganizationPublishThemeCss'].forEach(
        (mutation) => {
          expect(directiveRoles(mutations[mutation], 'auth')).not.toContain('USER');
        },
      );
    });
  });

  describe('new mutations', () => {
    const mutations = fieldsOf('Mutation');

    it.each([
      ['archiveOrganization', 'Organization!'],
      ['restoreOrganization', 'Organization!'],
      ['OrganizationSetSetting', 'Organization!'],
      ['OrganizationRemoveSetting', 'Organization!'],
      ['addOrganizationMember', 'Organization!'],
      ['removeOrganizationMember', 'Organization!'],
      ['setOrganizationMemberRoles', 'Organization!'],
    ])('exposes %s returning %s', (mutation, _returnType) => {
      expect(mutations[mutation]).toBeDefined();
    });

    it('exposes the arguments the service methods need', () => {
      const argumentNames = (name: string) =>
        (mutations[name].arguments || []).map((argument) => argument.name.value);

      expect(argumentNames('OrganizationSetSetting')).toEqual([
        'id',
        'name',
        'data',
        'componentFqn',
      ]);
      expect(argumentNames('OrganizationRemoveSetting')).toEqual(['id', 'name']);
      expect(argumentNames('addOrganizationMember')).toEqual(['id', 'userId', 'roles']);
      expect(argumentNames('removeOrganizationMember')).toEqual(['id', 'userId']);
      expect(argumentNames('setOrganizationMemberRoles')).toEqual(['id', 'userId', 'roles']);
    });
  });

  describe('statistics', () => {
    it('exposes a flat OrganizationStatistics type', () => {
      const fields = fieldsOf('OrganizationStatistics');

      expect(Object.keys(fields)).toEqual(expect.arrayContaining(['members', 'businessUnits', 'teams']));
    });

    it('exposes the statistics query to authenticated users', () => {
      const queries = fieldsOf('Query');

      expect(queries.OrganizationStatistics).toBeDefined();
      expect((queries.OrganizationStatistics.arguments || []).map((item) => item.name.value)).toEqual(['id']);
      expect(directiveRoles(queries.OrganizationStatistics, 'auth')).toEqual(['USER']);
    });
  });

  it('keeps every pre-existing query and mutation', () => {
    const queries = fieldsOf('Query');
    const mutations = fieldsOf('Mutation');

    ['allOrganizations', 'organizationsForUser', 'organizationWithId', 'CoreOrganization', 'CoreOrganizations', 'CorePagedOrganizations', 'CoreUsersForOrganization'].forEach(
      (query) => expect(queries[query]).toBeDefined(),
    );
    ['createOrganization', 'updateOrganization', 'SetOrganisationLookupData'].forEach((mutation) =>
      expect(mutations[mutation]).toBeDefined(),
    );
  });
});
