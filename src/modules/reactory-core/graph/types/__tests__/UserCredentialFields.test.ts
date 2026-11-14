import fs from 'fs';
import path from 'path';
import { parse, print, Kind, FieldDefinitionNode } from 'graphql';

/**
 * SECURITY (REACTORY-302016408) — the `User` GraphQL type must not expose the
 * password hash or its salt.
 *
 * The credential leak was reachable through GraphQL as well as through REST and
 * the AI tool results: `query { authenticatedUser { salt password } }` selected
 * them straight off the User document. Removing the fields from the SDL is what
 * makes that query fail schema validation instead of returning a PBKDF2 hash.
 *
 * `sessionInfo` / `authentications` stay declared (the account screen needs
 * them) but are resolved by `UserResolver` for the owner/admin only - see
 * `resolvers/User/__tests__/UserResolver.credentials.test.ts`.
 */
const typesDir = path.resolve(__dirname, '..');
const sdl = fs.readFileSync(path.join(typesDir, 'User/User.graphql'), 'utf-8');

const definitions = parse(sdl).definitions;

const fieldsOf = (typeName: string): Record<string, FieldDefinitionNode> => {
  const fields: Record<string, FieldDefinitionNode> = {};
  definitions.forEach((definition: any) => {
    if (
      (definition.kind === Kind.OBJECT_TYPE_DEFINITION ||
        definition.kind === Kind.OBJECT_TYPE_EXTENSION) &&
      definition.name.value === typeName
    ) {
      (definition.fields || []).forEach((field: any) => {
        fields[field.name.value] = field;
      });
    }
  });
  return fields;
};

describe('User GraphQL surface — no credential fields', () => {
  it('does not declare `salt` on User', () => {
    expect(fieldsOf('User').salt).toBeUndefined();
  });

  it('does not declare `password` on User', () => {
    expect(fieldsOf('User').password).toBeUndefined();
  });

  it('prints the User type without a password or salt field', () => {
    const userType = definitions.find(
      (definition: any) =>
        definition.kind === Kind.OBJECT_TYPE_DEFINITION && definition.name.value === 'User',
    );

    const printed = print(userType as any);
    expect(printed).not.toMatch(/^\s+password\s*:/m);
    expect(printed).not.toMatch(/^\s+salt\s*:/m);
  });

  it('keeps the owner/admin gated fields declared', () => {
    const fields = fieldsOf('User');
    expect(fields.sessionInfo).toBeDefined();
    expect(fields.authentications).toBeDefined();
  });

  it('keeps identity and role fields that the UI depends on', () => {
    const fields = fieldsOf('User');
    expect(Object.keys(fields)).toEqual(
      expect.arrayContaining(['id', 'firstName', 'lastName', 'email', 'avatar', 'roles', 'memberships']),
    );
  });
});
