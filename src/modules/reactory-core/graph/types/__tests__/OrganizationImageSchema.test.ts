import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';
import CoreTypeDefinitions from '../index';

/**
 * Schema-level assertions for the organization image upload mutation
 * (ORG-013a).
 *
 * The graph is assembled from these SDL files at startup; building the whole
 * schema in a unit test would drag in every core type. Parsing the relevant
 * files proves the three things that can regress: the mutation exists with the
 * agreed signature, it is guarded by the org-admin roles, and it can only be
 * built if the `Upload` scalar is declared by the system scalar definitions.
 */
const typesDir = path.resolve(__dirname, '..');

const readSdl = (relativePath: string): string =>
  fs.readFileSync(path.join(typesDir, `${relativePath}.graphql`), 'utf-8');

const organizationSdl = readSdl('Organization/Organization');
const scalarsSdl = readSdl('System/Scalars');

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

const argTypes = (fields: Record<string, FieldDefinitionNode>, fieldName: string): Record<string, string> => {
  const field = fields[fieldName];
  if (!field) throw new Error(`Expected field "${fieldName}" to exist`);
  return (field.arguments || []).reduce<Record<string, string>>((result, argument) => {
    result[argument.name.value] = print(argument.type as TypeNode);
    return result;
  }, {});
};

const authRoles = (fields: Record<string, FieldDefinitionNode>, fieldName: string): string[] | null => {
  const field = fields[fieldName];
  if (!field) throw new Error(`Expected field "${fieldName}" to exist`);

  const auth = (field.directives || []).find((directive) => directive.name.value === 'auth');
  if (!auth) return null;

  const roles = (auth.arguments || []).find((argument) => argument.name.value === 'roles');
  if (!roles || roles.value.kind !== Kind.LIST) return null;

  return roles.value.values.map((value: any) => value.value);
};

describe('Organization image GraphQL surface (ORG-013a)', () => {
  it('is loaded into the core schema build alongside the organization types', () => {
    expect(CoreTypeDefinitions.some((sdl) => sdl.indexOf('OrganizationUploadImage') >= 0)).toBe(true);

    // `Organization.graphql` references Upload without redeclaring it, so the
    // scalar definitions must load first.
    const scalarIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('scalar Upload') >= 0);
    const organizationIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('type Organization ') >= 0);

    expect(scalarIndex).toBeGreaterThanOrEqual(0);
    expect(organizationIndex).toBeGreaterThanOrEqual(0);
    expect(scalarIndex).toBeLessThan(organizationIndex);
  });

  it('declares the exact OrganizationUploadImage signature', () => {
    const mutations = collectFields(organizationSdl, 'Mutation');

    expect(argTypes(mutations, 'OrganizationUploadImage')).toEqual({
      id: 'String!',
      imageType: 'String!',
      file: 'Upload!',
    });
    expect(typeOf(mutations, 'OrganizationUploadImage')).toBe('Organization!');
  });

  it('guards the mutation with the organization administrator roles', () => {
    const mutations = collectFields(organizationSdl, 'Mutation');

    expect(authRoles(mutations, 'OrganizationUploadImage')).toEqual([
      'ORGANIZATION_ADMIN',
      'ADMIN',
      'SYSTEM',
    ]);
  });

  it('uses the Upload scalar declared by the system scalar definitions', () => {
    const uploadScalar = parse(scalarsSdl).definitions.find(
      (definition) => definition.kind === Kind.SCALAR_TYPE_DEFINITION && definition.name.value === 'Upload',
    );

    expect(uploadScalar).toBeDefined();
  });

  it('documents the imageType contract, persistence and org scoping', () => {
    const mutations = collectFields(organizationSdl, 'Mutation');
    // graphql-js exposes the block string as a StringValueNode.
    const description = (mutations.OrganizationUploadImage.description as any)?.value || '';

    expect(description).toContain('logo');
    expect(description).toContain('avatar');
    expect(description).toContain('persisted');
    expect(description).toContain('assertOrgAdmin');
  });

  it('returns the aliases on the Organization payload', () => {
    const fields = collectFields(organizationSdl, 'Organization');

    // The service writes these fields; the payload must be able to expose them.
    expect(typeOf(fields, 'logo')).toBe('String');
    expect(typeOf(fields, 'avatar')).toBe('String');
    expect(typeOf(fields, 'logoURL')).toBe('String');
    expect(typeOf(fields, 'avatarURL')).toBe('String');
  });
});
