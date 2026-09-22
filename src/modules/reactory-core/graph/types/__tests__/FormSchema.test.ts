import { readFileSync } from 'fs';
import { join } from 'path';
import { parse, Kind, type DocumentNode, type FieldDefinitionNode, type InputValueDefinitionNode } from 'graphql';

/**
 * Regression guards for the forms-engine v5 rollout blocker #2.
 *
 * `EngineDispatchedForm` selects the engine from `formDef.options.engine`.
 * For server-defined forms, `formDef` arrives over GraphQL via
 * `ReactoryFormGetById` / `ReactoryForms`. GraphQL cannot return a field the
 * SDL does not declare, so without `options` on `ReactoryForm` every per-form
 * engine pin was silently dropped and the documented migration mechanism could
 * never work for a server-defined form.
 *
 * These assertions inspect the parsed AST rather than building a full schema:
 * `Form.graphql` references types defined in sibling files (e.g.
 * `CoreSimpleResponse`), so `buildASTSchema` cannot be used on this fragment in
 * isolation. The field-level assertions are what matter here.
 */

const SDL_PATH = join(__dirname, '..', 'Forms', 'Form.graphql');

const loadDocument = (): DocumentNode => parse(readFileSync(SDL_PATH, 'utf-8'));

type TypeFields = Array<FieldDefinitionNode | InputValueDefinitionNode>;

const findTypeFields = (
  doc: DocumentNode,
  name: string,
  kind: Kind.OBJECT_TYPE_DEFINITION | Kind.INPUT_OBJECT_TYPE_DEFINITION,
): TypeFields | null => {
  const def = doc.definitions.find(
    (d) => d.kind === kind && (d as { name?: { value: string } }).name?.value === name,
  ) as { fields?: TypeFields } | undefined;

  return def?.fields ?? null;
};

const typeNameOf = (node: FieldDefinitionNode | InputValueDefinitionNode): string | null => {
  const type = node.type as { kind: string; name?: { value: string }; type?: unknown };
  // Unwrap NonNull/List to get the underlying named type.
  let current: any = type;
  while (current && current.kind !== 'NamedType') {
    current = current.type;
  }
  return current?.name?.value ?? null;
};

describe('Form.graphql', () => {
  it('parses as valid GraphQL', () => {
    expect(() => loadDocument()).not.toThrow();
  });

  it('declares `options` on the ReactoryForm output type', () => {
    const fields = findTypeFields(loadDocument(), 'ReactoryForm', Kind.OBJECT_TYPE_DEFINITION);
    expect(fields).not.toBeNull();

    const options = fields!.find((f) => f.name.value === 'options');
    expect(options).toBeDefined();
    // Any-typed: an engine pin may carry additional render options besides `engine`.
    expect(typeNameOf(options!)).toBe('Any');
  });

  it('declares `options` on the ReactoryFormInput type so a pin round-trips on save', () => {
    const fields = findTypeFields(loadDocument(), 'ReactoryFormInput', Kind.INPUT_OBJECT_TYPE_DEFINITION);
    expect(fields).not.toBeNull();

    const options = fields!.find((f) => f.name.value === 'options');
    expect(options).toBeDefined();
    expect(typeNameOf(options!)).toBe('Any');
  });

  it('still declares the engine-relevant core fields alongside options', () => {
    const fields = findTypeFields(loadDocument(), 'ReactoryForm', Kind.OBJECT_TYPE_DEFINITION);
    const names = fields!.map((f) => f.name.value);

    expect(names).toEqual(
      expect.arrayContaining(['id', 'schema', 'uiSchema', 'name', 'nameSpace', 'version', 'options']),
    );
  });
});
