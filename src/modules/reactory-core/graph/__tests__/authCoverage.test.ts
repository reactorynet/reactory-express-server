/**
 * WP-A7 coverage gate: every Mutation field in an enforced module carries
 * @auth, or is on the explicit PUBLIC_MUTATIONS allow-list.
 *
 * The schema files are parsed directly (the same SDL the server merges at
 * boot), so the gate needs no database or module bootstrap. To bring another
 * module under the gate, add its directory to ENFORCED_MODULES and annotate
 * its mutations.
 */
import fs from 'fs';
import path from 'path';
import { parse, Source, DirectiveNode, FieldDefinitionNode, Kind, ListValueNode, StringValueNode } from 'graphql';

const MODULES_ROOT = path.resolve(__dirname, '../../..');

const ENFORCED_MODULES = ['reactory-core', 'reactory-zepz-quotes'];

/**
 * Mutations that may be called without any @auth. Login, registration and
 * password reset are REST routes, so none are needed today. Each entry needs a
 * reason.
 */
const PUBLIC_MUTATIONS: Record<string, string> = {};

/**
 * Mutations whose @auth deliberately admits the anonymous user.
 */
const ANONYMOUS_MUTATIONS: Record<string, string> = {
  ReactoryFormSubmit: 'Public form capture; the resolver reports failures as results, never stack traces.',
};

const graphqlFiles = (root: string): string[] => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.graphql')) found.push(full);
    }
  };
  walk(root);
  return found;
};

interface MutationField {
  module: string;
  file: string;
  name: string;
  auth?: DirectiveNode;
}

const collectMutations = (): MutationField[] => {
  const out: MutationField[] = [];
  for (const module of ENFORCED_MODULES) {
    for (const file of graphqlFiles(path.join(MODULES_ROOT, module))) {
      const doc = parse(new Source(fs.readFileSync(file, 'utf8'), file));
      for (const def of doc.definitions) {
        if (
          (def.kind === Kind.OBJECT_TYPE_DEFINITION || def.kind === Kind.OBJECT_TYPE_EXTENSION)
          && def.name.value === 'Mutation'
        ) {
          const typeAuth = def.directives?.find((d) => d.name.value === 'auth');
          (def.fields || []).forEach((field: FieldDefinitionNode) => {
            out.push({
              module,
              file: path.relative(MODULES_ROOT, file),
              name: field.name.value,
              auth: field.directives?.find((d) => d.name.value === 'auth') || typeAuth,
            });
          });
        }
      }
    }
  }
  return out;
};

const rolesOf = (auth: DirectiveNode): string[] => {
  const arg = auth.arguments?.find((a) => a.name.value === 'roles');
  if (!arg) return ['USER'];
  return (arg.value as ListValueNode).values.map((v) => (v as StringValueNode).value);
};

describe('WP-A7: @auth coverage on Mutation', () => {
  const mutations = collectMutations();

  it('finds mutations in every enforced module', () => {
    ENFORCED_MODULES.forEach((module) => {
      expect(mutations.filter((m) => m.module === module).length).toBeGreaterThan(0);
    });
  });

  it('annotates every mutation with @auth or lists it as public', () => {
    const missing = mutations
      .filter((m) => !m.auth && !PUBLIC_MUTATIONS[m.name])
      .map((m) => `${m.file}: Mutation.${m.name}`);
    expect(missing).toEqual([]);
  });

  it('never grants a mutation to an empty role list', () => {
    const empty = mutations
      .filter((m) => m.auth && rolesOf(m.auth).length === 0)
      .map((m) => `${m.file}: Mutation.${m.name}`);
    expect(empty).toEqual([]);
  });

  it('admits the anonymous user only where that is on record', () => {
    const anonymous = mutations
      .filter((m) => m.auth && rolesOf(m.auth).includes('ANON'))
      .map((m) => m.name)
      .sort();
    expect(anonymous).toEqual(Object.keys(ANONYMOUS_MUTATIONS).sort());
  });

  it('keeps the public allow-list honest (every entry exists)', () => {
    const names = new Set(mutations.map((m) => m.name));
    Object.keys(PUBLIC_MUTATIONS).forEach((name) => expect(names.has(name)).toBe(true));
  });
});
