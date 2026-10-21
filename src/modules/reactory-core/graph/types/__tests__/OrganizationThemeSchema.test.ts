import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode, TypeNode } from 'graphql';
import CoreTypeDefinitions from '../index';

/**
 * Schema-level assertions for the organization theme surface (ORG-004).
 *
 * The graph is assembled from these SDL files at startup, but building the
 * whole schema in a unit test would drag in every core type. Parsing the
 * relevant files is enough to prove the three things that can regress:
 * the Organization fields exist, the mutations/query exist with the agreed
 * signatures, and the ApplicationTheme* types are reused rather than copied.
 */
const typesDir = path.resolve(__dirname, '..');

const readSdl = (relativePath: string): string =>
  fs.readFileSync(path.join(typesDir, `${relativePath}.graphql`), 'utf-8');

const organizationSdl = readSdl('Organization/Organization');
const applicationThemeSdl = readSdl('System/ReactoryClient/ApplicationTheme');
const enumsSdl = readSdl('System/ReactoryClient/ReactoryClientEnums');

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

const definedTypeNames = (sdl: string): string[] =>
  parse(sdl).definitions
    .filter(
      (definition) =>
        definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.ENUM_TYPE_DEFINITION,
    )
    .map((definition: any) => definition.name.value);

describe('Organization theme GraphQL surface (ORG-004)', () => {
  it('is loaded into the core schema build after the theme definitions', () => {
    const themeIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('type ApplicationTheme ') >= 0);
    const organizationIndex = CoreTypeDefinitions.findIndex((sdl) => sdl.indexOf('type Organization ') >= 0);

    expect(themeIndex).toBeGreaterThanOrEqual(0);
    expect(organizationIndex).toBeGreaterThanOrEqual(0);
    // The Organization SDL references ApplicationTheme* types without
    // redeclaring them, so their definitions must load first.
    expect(themeIndex).toBeLessThan(organizationIndex);
    expect(CoreTypeDefinitions.some((sdl) => sdl.indexOf('OrganizationSaveTheme') >= 0)).toBe(true);
  });

  it('exposes the theme fields on Organization', () => {
    const fields = collectFields(organizationSdl, 'Organization');

    expect(typeOf(fields, 'theme')).toBe('String');
    expect(typeOf(fields, 'themeMode')).toBe('ApplicationThemeModeType');
    expect(typeOf(fields, 'themes')).toBe('[ApplicationTheme]');
  });

  it('exposes the four theme mutations with the agreed signatures', () => {
    const mutations = collectFields(organizationSdl, 'Mutation');

    expect(argTypes(mutations, 'OrganizationSaveTheme')).toEqual({
      id: 'String!',
      theme: 'ApplicationThemeInput!',
    });
    expect(typeOf(mutations, 'OrganizationSaveTheme')).toBe('Organization!');

    expect(argTypes(mutations, 'OrganizationSetActiveTheme')).toEqual({
      id: 'String!',
      themeName: 'String!',
      mode: 'ApplicationThemeModeType',
    });
    expect(typeOf(mutations, 'OrganizationSetActiveTheme')).toBe('Organization!');

    expect(argTypes(mutations, 'OrganizationDeleteTheme')).toEqual({
      id: 'String!',
      themeName: 'String!',
    });
    expect(typeOf(mutations, 'OrganizationDeleteTheme')).toBe('Organization!');

    expect(argTypes(mutations, 'OrganizationPublishThemeCss')).toEqual({
      id: 'String!',
      themeName: 'String!',
      css: 'String!',
    });
    expect(typeOf(mutations, 'OrganizationPublishThemeCss')).toBe('Boolean!');
  });

  it('exposes the theme css query', () => {
    const queries = collectFields(organizationSdl, 'Query');

    expect(argTypes(queries, 'OrganizationThemeCss')).toEqual({ themeName: 'String!' });
    expect(typeOf(queries, 'OrganizationThemeCss')).toBe('String');
  });

  it('reuses the ApplicationTheme types instead of redeclaring them', () => {
    const organizationTypes = definedTypeNames(organizationSdl);
    expect(organizationTypes.filter((name) => name.startsWith('ApplicationTheme'))).toEqual([]);

    const themeTypes = definedTypeNames(applicationThemeSdl);
    expect(themeTypes).toEqual(
      expect.arrayContaining([
        'ApplicationTheme',
        'ApplicationThemeAsset',
        'ApplicationThemeAssetInput',
        'ApplicationThemeMode',
        'ApplicationThemeModeInput',
        'ApplicationThemeInput',
      ]),
    );
  });

  it('resolves every ApplicationTheme reference to a single existing definition', () => {
    const available = new Set([...definedTypeNames(applicationThemeSdl), ...definedTypeNames(enumsSdl)]);
    const referenced = Array.from(
      new Set((organizationSdl.match(/ApplicationTheme[A-Za-z]*/g) || []) as string[]),
    );

    expect(referenced.length).toBeGreaterThan(0);
    referenced.forEach((name) => {
      expect(Array.from(available)).toContain(name);
    });

    // The enum used by `themeMode` carries the three modes the model accepts.
    const modeEnum = parse(enumsSdl).definitions.find(
      (definition) => definition.kind === Kind.ENUM_TYPE_DEFINITION && definition.name.value === 'ApplicationThemeModeType',
    ) as any;
    expect(modeEnum.values.map((value: any) => value.name.value)).toEqual(['light', 'dark', 'os']);
  });
});
