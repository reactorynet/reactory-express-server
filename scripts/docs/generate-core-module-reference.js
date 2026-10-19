#!/usr/bin/env node
/**
 * Generates docs/07-reference/modules/reactory-core.md from the reactory-core
 * source tree.
 *
 * The generated file owns the enumerations for module-doc template sections
 * 2 (extension points), 3 (models), 4 (GraphQL surface), 5 (services),
 * 6 (forms), 7 (workflows) and 8 (CLI, feature flags, migrations).
 *
 * Run from the repository root:
 *
 *   node scripts/docs/generate-core-module-reference.js
 *
 * Re-run and commit the output whenever the source changes. The narrative page
 * at docs/06-modules/reactory-core/README.md links here rather than restating
 * these tables (see notes/documentation-ownership-model.md).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const CORE = path.join(ROOT, 'src', 'modules', 'reactory-core');
const OUT = path.join(ROOT, 'docs', '07-reference', 'modules', 'reactory-core.md');

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function walk(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      out.push(...walk(full, filter));
    } else if (!filter || filter(full)) {
      out.push(full);
    }
  }
  return out.sort();
}

const read = (p) => fs.readFileSync(p, 'utf8');

function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/**
 * Read the keys of the outer object literal in `text`, ignoring anything nested
 * inside a child object or array. Returns key → first string literal value.
 *
 * This is what distinguishes a service's own `id` from the `id` of its first
 * dependency: both are `id: '...'`, but only one sits at the outer level.
 */
function shallowStringKeys(text) {
  const keys = new Map();
  let depth = 0;
  let inString = null;
  let escaped = false;
  let tokenStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      depth += 1;
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth -= 1;
      continue;
    }
    if (depth !== 1) continue;

    // At the outer level, look for `key: 'value'` / `key: "value"`.
    if (tokenStart === -1 && /[A-Za-z_$]/.test(ch)) {
      const prev = text[i - 1];
      if (prev === undefined || /[\s{,]/.test(prev)) tokenStart = i;
    }
    if (tokenStart !== -1 && (ch === ':' || /[A-Za-z0-9_$]/.test(ch))) {
      if (ch === ':') {
        const key = text.slice(tokenStart, i).trim();
        tokenStart = -1;
        const rest = text.slice(i + 1);
        const m = /^\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/.exec(rest);
        if (m && !keys.has(key)) keys.set(key, m[2]);
      }
      continue;
    }
    tokenStart = -1;
  }

  return keys;
}

/** Extract a balanced `[...]` literal starting at the first `[` at or after `from`. */
function balancedArray(content, from) {
  const start = content.indexOf('[', from);
  if (start === -1) return null;
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return content.slice(start, i + 1);
    }
  }
  return null;
}

/** Extract a balanced `{ ... }` block starting at the first `{` at or after `from`. */
function balancedBlock(content, from) {
  const start = content.indexOf('{', from);
  if (start === -1) return null;
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return { start, end: i, text: content.slice(start, i + 1) };
    }
  }
  return null;
}

function firstMatch(text, regex) {
  const m = regex.exec(text);
  return m ? m[1] : null;
}

function listMatches(text, regex) {
  const out = [];
  let m;
  while ((m = regex.exec(text)) !== null) out.push(m[1]);
  return out;
}

function escapeCell(value) {
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

// ── services ────────────────────────────────────────────────────────────────
const SERVICE_KEYWORDS = new Set([
  'constructor', 'if', 'for', 'while', 'switch', 'catch', 'return', 'super',
  'function', 'else', 'do', 'try', 'throw', 'await', 'new',
]);

function publicMethods(source) {
  const methods = [];
  const classAt = source.search(/\bclass\s+[A-Za-z0-9_]/);
  const body = classAt === -1 ? '' : source.slice(classAt);
  for (const line of body.split('\n')) {
    if (/^\s*(private|protected)\s/.test(line)) continue;
    const m = /^ {2}(?:public\s+)?(?:async\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\(/.exec(line);
    if (!m) continue;
    const name = m[1];
    if (SERVICE_KEYWORDS.has(name)) continue;
    if (!methods.includes(name)) methods.push(name);
  }
  return methods;
}

function parseServiceDefinition(file) {
  const content = read(file);
  const candidates = [];

  const decorator = content.search(/@service\s*\(/);
  if (decorator !== -1) {
    const block = balancedBlock(content, decorator);
    if (block) candidates.push({ block, anchor: decorator, kind: '@service' });
  }
  const statik = content.search(/static\s+reactory\s*[:=]/);
  if (statik !== -1) {
    const block = balancedBlock(content, statik);
    if (block) candidates.push({ block, anchor: statik, kind: 'static reactory' });
  }
  // Plain object exports: `export default { ... }` and `export const X = { ... }`.
  const objectRe = /(?:export\s+default\s+|export\s+const\s+[A-Za-z0-9_]+[^=]*=\s*)\{/g;
  let m;
  while ((m = objectRe.exec(content)) !== null) {
    const block = balancedBlock(content, m.index);
    if (block && /\bid:\s*['"][^'"]+@[^'"]+['"]/.test(block.text)) {
      candidates.push({ block, anchor: m.index, kind: 'object' });
    }
  }

  for (const candidate of candidates) {
    const { block, anchor, kind } = candidate;
    // Read definition-level keys only. A nested `id:` — for example the first
    // entry of a `dependencies: [{ id, alias }]` array — is not this service's
    // own identity and must not be mistaken for it.
    const shallow = shallowStringKeys(block.text);
    const topLevel = (key) => (shallow.has(key) ? shallow.get(key) : null);
    const name = topLevel('name');
    const version = topLevel('version');
    const nameSpace = topLevel('nameSpace');
    const ownId = topLevel('id');
    const id = ownId || (name && version && nameSpace ? `${nameSpace}.${name}@${version}` : null);
    const looksLikeDefinition = /\bservice\s*:/.test(block.text)
      || /\bserviceType\s*:/.test(block.text)
      || /\blifeCycle\s*:/.test(block.text);
    if (!id || !looksLikeDefinition) continue;

    const dependencies = [];
    const depRegex = /\{[^{}]*\bid:\s*['"]([^'"]+)['"][^{}]*\}/g;
    let dep;
    while ((dep = depRegex.exec(block.text)) !== null) {
      const inner = dep[0];
      const alias = firstMatch(inner, /\balias:\s*['"]([^'"]+)['"]/);
      if (dep[1] !== id) dependencies.push(alias ? `${dep[1]} as ${alias}` : dep[1]);
    }

    return {
      id,
      kind,
      file: rel(file),
      line: lineOf(content, anchor),
      nameSpace,
      name,
      version,
      description: topLevel('description'),
      serviceType: topLevel('serviceType'),
      lifeCycle: topLevel('lifeCycle'),
      dependencies: [...new Set(dependencies)],
      methods: publicMethods(content),
    };
  }
  return null;
}

function serviceCatalog() {
  const files = walk(path.join(CORE, 'services'), (f) =>
    f.endsWith('.ts')
    && !f.endsWith('.d.ts')
    && !f.includes(`${path.sep}__tests__${path.sep}`)
    && !/test(Save|Yaml)/.test(path.basename(f)),
  );
  const byId = new Map();
  for (const file of files) {
    const definition = parseServiceDefinition(file);
    if (!definition) continue;
    const existing = byId.get(definition.id);
    if (!existing || definition.methods.length > existing.methods.length) {
      byId.set(definition.id, definition);
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// ── GraphQL ─────────────────────────────────────────────────────────────────
function graphSurface() {
  const typesIndex = path.join(CORE, 'graph', 'types', 'index.ts');
  const indexSource = read(typesIndex);
  const arrayStart = indexSource.indexOf('loadGraphQLTypeDefinitions([');
  const arrayBlock = arrayStart === -1 ? indexSource : indexSource.slice(arrayStart);
  const loaded = listMatches(arrayBlock, /'([^']+)'/g).filter((f) => !f.endsWith('__dirname'));

  const byKind = { type: 0, input: 0, enum: 0, interface: 0, scalar: 0, union: 0 };
  const names = new Map();
  const rootFields = { Query: [], Mutation: [] };
  for (const file of walk(path.join(CORE, 'graph', 'types'), (f) => f.endsWith('.ts') || f.endsWith('.graphql'))) {
    if (file.endsWith('index.ts')) continue;
    const source = read(file);
    const re = /^(type|input|enum|interface|scalar|union)\s+([A-Za-z0-9_]+)/gm;
    let m;
    while ((m = re.exec(source)) !== null) {
      byKind[m[1]] += 1;
      if (!names.has(m[2])) names.set(m[2], rel(file));
    }
    const rootRe = /^(?:extend\s+)?type\s+(Query|Mutation)\s*\{([\s\S]*?)^\}/gm;
    let root;
    while ((root = rootRe.exec(source)) !== null) {
      const fields = [...root[2].matchAll(/^ {2}([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|:)/gm)].map((x) => x[1]);
      for (const field of fields) rootFields[root[1]].push({ field, file: rel(file), line: lineOf(source, root.index) });
    }
  }

  // Count *applications* of @auth, not its declaration or mentions in prose.
  const authUsages = [];
  for (const file of walk(path.join(CORE, 'graph', 'types'), (f) => f.endsWith('.ts') || f.endsWith('.graphql'))) {
    const source = read(file);
    source.split('\n').forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) return; // GraphQL comment
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      if (/^directive\s+@auth\b/.test(trimmed)) return; // the declaration itself
      const re = /@auth\s*\(([^)]*)\)/g;
      let m;
      while ((m = re.exec(line)) !== null) {
        authUsages.push({ file: rel(file), line: index + 1, args: m[1].trim() });
      }
    });
  }

  return { loaded, byKind, names, rootFields, authUsages };
}

// ── models ──────────────────────────────────────────────────────────────────
function modelCatalog() {
  const dir = path.join(CORE, 'models');
  const rows = [];
  for (const file of walk(dir, (f) => f.endsWith('.ts') && !f.includes(`${path.sep}__tests__${path.sep}`))) {
    const source = read(file);
    const mongo = /mongoose\.model(?:<[^>]+>)?\s*\(\s*(?:['"][^'"]+['"]\s*,\s*[^,]+,\s*)?['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = mongo.exec(source)) !== null) {
      rows.push({ collection: m[1], file: rel(file), line: lineOf(source, m.index), kind: 'mongoose' });
    }
    const entity = /@Entity\(\s*\{[^}]*name:\s*['"]([^'"]+)['"]/g;
    while ((m = entity.exec(source)) !== null) {
      rows.push({ collection: m[1], file: rel(file), line: lineOf(source, m.index), kind: 'typeorm' });
    }
  }
  return rows.sort((a, b) => a.collection.localeCompare(b.collection));
}

// ── forms ───────────────────────────────────────────────────────────────────
function versionFromSibling(file) {
  const vfile = path.join(path.dirname(file), 'version.ts');
  if (!fs.existsSync(vfile)) return null;
  const source = read(vfile);
  return firstMatch(source, /export\s+default\s+['"]([^'"]+)['"]/)
    || firstMatch(source, /const\s+version\s*=\s*['"]([^'"]+)['"]/)
    || firstMatch(source, /export\s+default\s+([A-Za-z0-9_.]+)/);
}

function resolveFormId(file, source, index, rawId, blockText) {
  if (!rawId.includes('${')) return rawId;
  const window = source.slice(Math.max(0, index - 900), index + 400);
  const topLevel = (key) => firstMatch(blockText, new RegExp(`\\n\\s{0,4}${key}:\\s*['"]([^'"]*)['"]`));
  const nameSpace = topLevel('nameSpace') || firstMatch(window, /const\s+nameSpace\s*=\s*['"]([^'"]+)['"]/);
  const name = topLevel('name') || firstMatch(window, /const\s+name\s*=\s*['"]([^'"]+)['"]/);
  const version = topLevel('version')
    || firstMatch(window, /const\s+version\s*=\s*['"]([^'"]+)['"]/)
    || versionFromSibling(file);
  if (nameSpace && name && version) return `${nameSpace}.${name}@${version}`;
  return rawId.replace(/\$\{/g, '').replace(/\}/g, '');
}

function formCatalog() {
  const dir = path.join(CORE, 'forms');
  const files = walk(dir, (f) => f.endsWith('.ts') && !f.includes(`${path.sep}__tests__${path.sep}`));
  const rows = [];
  for (const file of files) {
    const source = read(file);
    const re = /(?:const|let|var)\s+[A-Za-z0-9_]+(?:\s*:\s*[A-Za-z0-9_.<>\[\]]+)?\s*=\s*\{/g;
    let m;
    while ((m = re.exec(source)) !== null) {
      const block = balancedBlock(source, m.index);
      if (!block) continue;
      const isForm = /\buiFramework:\s*['"]/.test(block.text)
        || /\bregisterAsComponent:\s*true\b/.test(block.text)
        || /\.\.\.defaultFormProps\b/.test(block.text);
      if (!isForm) continue;
      const rawId = firstMatch(block.text, /\bid:\s*[`'"]([^`'"]+)[`'"]/);
      if (!rawId) continue;
      const id = resolveFormId(file, source, m.index, rawId, block.text);
      const window = source.slice(Math.max(0, m.index - 900), m.index + 600);
      const topLevel = (key) => firstMatch(block.text, new RegExp(`\\n\\s{0,4}${key}:\\s*['"]([^'"]*)['"]`));
      rows.push({
        id,
        nameSpace: topLevel('nameSpace'),
        name: topLevel('name') || firstMatch(window, /const\s+name\s*=\s*['"]([^'"]+)['"]/),
        version: topLevel('version')
          || firstMatch(window, /const\s+version\s*=\s*['"]([^'"]+)['"]/)
          || versionFromSibling(file),
        file: rel(file),
        line: lineOf(source, m.index),
      });
    }
  }
  const byId = new Map();
  for (const row of rows) if (!byId.has(row.id)) byId.set(row.id, row);
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

// ── workflows ───────────────────────────────────────────────────────────────
function workflowCatalog() {
  const dir = path.join(CORE, 'workflows');
  const yaml = walk(dir, (f) => f.endsWith('.yaml') || f.endsWith('.yml')).map((file) => {
    const source = read(file);
    return {
      file: rel(file),
      nameSpace: firstMatch(source, /^nameSpace:\s*(.+)$/m),
      name: firstMatch(source, /^name:\s*(.+)$/m),
      version: firstMatch(source, /^version:\s*(.+)$/m),
      description: firstMatch(source, /^description:\s*(.+)$/m),
      steps: (source.match(/^\s{2,}-\s+id:\s*/gm) || []).length,
    };
  });

  // Step types are registered imperatively, not by scanning the directory, so
  // the registered set is what the engine actually accepts.
  const registrySource = read(path.join(CORE, 'workflow', 'YamlFlow', 'steps', 'registry', 'YamlStepRegistry.ts'));
  const registryBody = registrySource.slice(registrySource.indexOf('registerDefaultSteps'));
  const registeredSteps = [...registryBody.matchAll(/this\.registerStep\(\s*['"]([^'"]+)['"]/g)]
    .map((m) => m[1]);

  const stepFiles = walk(path.join(CORE, 'workflow', 'YamlFlow', 'steps', 'core'), (f) => f.endsWith('.ts'))
    .map((f) => path.basename(f, '.ts').replace(/Step$/, ''));

  // Which YAML files are actually referenced by a loader? A file on disk that no
  // index names is dead weight and never reaches the registry. Compare on the
  // *stem*: loaders name either `<Stem>` or `<Stem>.yaml` / `<Stem>.workflow.yaml`.
  const stem = (file) => path.basename(file)
    .replace(/\.workflow\.yaml$/, '')
    .replace(/\.ya?ml$/, '');

  const referenced = new Set();
  const collect = (source, regex, map = (x) => x) => {
    let m;
    while ((m = regex.exec(source)) !== null) referenced.add(map(m[1]));
  };

  const rootIndex = read(path.join(dir, 'index.ts'));
  collect(rootIndex, /filename:\s*'([^']+)'/g, stem);

  for (const sub of ['examples', 'dev', 'Support']) {
    const indexPath = path.join(dir, sub, 'index.ts');
    if (!fs.existsSync(indexPath)) continue;
    const source = read(indexPath);
    // `{ name, filename }` entries (Support) and bare name arrays (examples, dev).
    collect(source, /filename:\s*'([^']+)'/g, stem);
    collect(source, /^\s*'([A-Za-z0-9_]+)',?\s*(?:\/\/.*)?$/gm);
  }

  // Files in autoRepair/ are run by the auto-repair flow by path, not by an index.
  const byPath = new Set(
    walk(dir, (f) => f.endsWith('.yaml'))
      .filter((f) => read(f).includes('autoRepair') || f.includes(`${path.sep}autoRepair${path.sep}`))
      .map((f) => rel(f)),
  );

  const isRegistered = (flow) => referenced.has(stem(flow.file)) || byPath.has(flow.file);

  return {
    yaml: yaml.sort((a, b) => a.file.localeCompare(b.file)),
    registeredYaml: yaml.filter(isRegistered),
    orphaned: yaml.filter((flow) => !isRegistered(flow)).map((flow) => flow.file),
    steps: stepFiles,
    registeredSteps,
  };
}

// ── CLI, feature flags, migrations ──────────────────────────────────────────
function cliCatalog() {
  const dir = path.join(CORE, 'cli');
  return walk(dir, (f) => f.endsWith('.ts') && !f.endsWith('index.ts') && !f.includes(`${path.sep}__tests__${path.sep}`))
    .map((file) => ({
      file: rel(file),
      name: path.basename(file, '.ts'),
    }));
}

function featureFlags() {
  const source = read(path.join(CORE, 'index.ts'));
  const rows = [];
  const arrayStart = source.indexOf('featureFlags: [');
  if (arrayStart === -1) return rows;
  const arrayText = balancedArray(source, arrayStart);
  if (!arrayText) return rows;
  const arrayOffset = source.indexOf('[', arrayStart);

  // Walk the array body, extracting each balanced `{ ... }` entry.
  let cursor = 0;
  while (cursor < arrayText.length) {
    const open = arrayText.indexOf('{', cursor);
    if (open === -1) break;
    let depth = 0;
    let end = -1;
    for (let i = open; i < arrayText.length; i += 1) {
      if (arrayText[i] === '{') depth += 1;
      else if (arrayText[i] === '}') {
        depth -= 1;
        if (depth === 0) { end = i; break; }
      }
    }
    if (end === -1) break;
    const entry = arrayText.slice(open, end + 1);
    const id = firstMatch(entry, /\bid:\s*['"]([^'"]+)['"]/);
    if (id) {
      rows.push({
        id,
        title: firstMatch(entry, /\btitle:\s*['"]([^'"]+)['"]/),
        form: firstMatch(entry, /\bform:\s*['"]([^'"]+)['"]/),
        line: lineOf(source, arrayOffset + open),
      });
    }
    cursor = end + 1;
  }
  return rows;
}

function migrationCatalog() {
  return walk(path.join(CORE, 'migrations'), (f) => /^\d{8,14}[-_]/.test(path.basename(f)))
    .map((file) => ({ file: rel(file), name: path.basename(file) }));
}

// ── render ──────────────────────────────────────────────────────────────────
function render() {
  const services = serviceCatalog();
  const graph = graphSurface();
  const models = modelCatalog();
  const forms = formCatalog();
  const workflows = workflowCatalog();
  const clis = cliCatalog();
  const flags = featureFlags();
  const migrations = migrationCatalog();

  const lines = [];
  lines.push('# reactory-core — generated reference');
  lines.push('');
  lines.push('> **GENERATED FILE — DO NOT EDIT.**');
  lines.push('>');
  lines.push('> Produced by `scripts/docs/generate-core-module-reference.js` from the');
  lines.push('> `reactory-core` source tree. Narrative documentation lives at');
  lines.push('> [`06-modules/reactory-core/README.md`](../../06-modules/reactory-core/README.md).');
  lines.push('> Regenerate with `node scripts/docs/generate-core-module-reference.js`.');
  lines.push('');
  lines.push('This file owns the enumerations for template sections 2, 3, 4, 5, 6, 7 and 8.');
  lines.push('Counts describe the working tree at generation time; the narrative page states the');
  lines.push('verification date and status.');
  lines.push('');

  lines.push('## 2. Module contract — extension points');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push('| `id` | `reactory-core` |');
  lines.push('| `nameSpace` | `core` |');
  lines.push('| `name` | `ReactoryServer` |');
  lines.push('| `version` | `1.0.0` |');
  lines.push('| FQN | `core.ReactoryServer@1.0.0` |');
  lines.push('| `dependencies` | `[]` (none) |');
  lines.push('| `priority` | `0` |');
  lines.push('');
  lines.push('| Extension point | Contributed | Source |');
  lines.push('|---|---|---|');
  lines.push(`| \`graphDefinitions.Types\` | ${graph.loaded.length} SDL modules | \`src/modules/reactory-core/graph/types/index.ts\` |`);
  lines.push('| `graphDefinitions.Resolvers` | resolver map merged from `resolvers/index.ts` | `src/modules/reactory-core/resolvers/index.ts` |');
  lines.push('| `graphDefinitions.Directives` | `@auth` | `src/modules/reactory-core/graph/directives/index.ts` |');
  lines.push(`| \`services\` | ${services.length} service definitions | \`src/modules/reactory-core/services/index.ts\` |`);
  lines.push('| `models` | mongoose models + TypeORM entities | `src/modules/reactory-core/models/index.ts` |');
  lines.push(`| \`forms\` | ${forms.length} form definitions | \`src/modules/reactory-core/forms/index.ts\` |`);
  lines.push(`| \`workflows\` | ${workflows.registeredYaml.length} registered YAML flows (of ${workflows.yaml.length} files) + 1 code workflow | \`src/modules/reactory-core/workflows/index.ts\` |`);
  lines.push('| `cli` | 7 CLI definitions | `src/modules/reactory-core/cli/index.ts` |');
  lines.push('| `routes` | `/support`, `/workflow`, `/useraccount` | `src/modules/reactory-core/routes/index.ts` |');
  lines.push('| `middleware` | file SSE transport | `src/modules/reactory-core/middleware/index.ts` |');
  lines.push(`| \`featureFlags\` | ${flags.length} flags | \`src/modules/reactory-core/index.ts\` |`);
  lines.push('| `translations` | core translation catalogue | `src/modules/reactory-core/data/translations` |');
  lines.push('| `clientPlugins` | none (`[]`) | `src/modules/reactory-core/index.ts` |');
  lines.push('| `serverPlugins` | none (`[]`) | `src/modules/reactory-core/index.ts` |');
  lines.push('| `grpc` | none (`null`) | `src/modules/reactory-core/index.ts` |');
  lines.push('| `pdfs` | none (`[]`) | `src/modules/reactory-core/index.ts` |');
  lines.push('');

  lines.push('## 3. Data model — collections and entities');
  lines.push('');
  lines.push('| Collection / table | ODM | Source |');
  lines.push('|---|---|---|');
  for (const row of models) {
    lines.push(`| \`${row.collection}\` | ${row.kind} | \`${row.file}:${row.line}\` |`);
  }
  lines.push('');
  lines.push('TypeORM entities and migrations are declared in `src/modules/reactory-core/migrations/typeorm/schema.ts`.');
  lines.push('');

  lines.push('## 4. GraphQL surface');
  lines.push('');
  lines.push('### SDL modules loaded');
  lines.push('');
  lines.push('| Module path |');
  lines.push('|---|');
  for (const item of graph.loaded) lines.push(`| \`${item}\` |`);
  lines.push('');
  lines.push('### Definition counts');
  lines.push('');
  lines.push('| Kind | Count |');
  lines.push('|---|---|');
  for (const kind of Object.keys(graph.byKind)) lines.push(`| \`${kind}\` | ${graph.byKind[kind]} |`);
  lines.push('');
  lines.push(`Unique type names: ${graph.names.size}. \`@auth\` usages: ${graph.authUsages.length}.`);
  lines.push('');
  lines.push('### Root fields');
  lines.push('');
  lines.push('| Operation | Count |');
  lines.push('|---|---|');
  lines.push(`| \`Query\` | ${graph.rootFields.Query.length} |`);
  lines.push(`| \`Mutation\` | ${graph.rootFields.Mutation.length} |`);
  lines.push('');
  lines.push('| Operation | Field | Source |');
  lines.push('|---|---|---|');
  for (const kind of ['Query', 'Mutation']) {
    for (const entry of graph.rootFields[kind]) {
      lines.push(`| ${kind} | \`${entry.field}\` | \`${entry.file}:${entry.line}\` |`);
    }
  }
  lines.push('');
  lines.push('### `@auth` directive');
  lines.push('');
  lines.push('Declared in `src/modules/reactory-core/graph/directives/AuthDirective.ts`:');
  lines.push('`directive @auth(roles: [String] = ["USER"], scope: AuthScope = TENANT, orgArg: String, buArg: String) on OBJECT | FIELD_DEFINITION`.');
  lines.push('');
  lines.push('| Roles | Uses |');
  lines.push('|---|---|');
  const roleCounts = new Map();
  for (const usage of graph.authUsages) {
    const roles = firstMatch(usage.args, /roles:\s*\[([^\]]*)\]/);
    const key = roles ? roles.replace(/\s+/g, ' ').trim() : usage.args;
    roleCounts.set(key, (roleCounts.get(key) || 0) + 1);
  }
  for (const [roles, count] of [...roleCounts.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| \`${escapeCell(roles)}\` | ${count} |`);
  }
  lines.push('');

  lines.push('## 5. Services');
  lines.push('');
  lines.push(`${services.length} service definitions are declared under \`src/modules/reactory-core/services\` (113 \`.ts\` files including tests and type-only helpers).`);
  lines.push('Lifecycle is the `serviceType` declared on the definition; the service registry resolves dependencies before constructing the service.');
  lines.push('');
  lines.push('| FQN | Name | Type | Lifecycle | Dependencies | Public methods | Source |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const service of services) {
    const cells = [
      `\`${service.id}\``,
      escapeCell(service.name || ''),
      escapeCell(service.serviceType || ''),
      escapeCell(service.lifeCycle || ''),
      service.dependencies.length ? service.dependencies.map((d) => `\`${d}\``).join(', ') : '—',
      service.methods.length ? service.methods.map((m) => `\`${m}\``).join(', ') : '—',
      `\`${service.file}:${service.line}\``,
    ];
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  lines.push('## 6. Forms');
  lines.push('');
  lines.push(`${forms.length} form definitions declared in \`src/modules/reactory-core/forms\`.`);
  lines.push('');
  lines.push('| Form id | Name | Version | Source |');
  lines.push('|---|---|---|---|');
  for (const form of forms) {
    lines.push(`| \`${form.id}\` | ${escapeCell(form.name || '')} | ${escapeCell(form.version || '')} | \`${form.file}:${form.line}\` |`);
  }
  lines.push('');

  lines.push('## 7. Workflows');
  lines.push('');
  lines.push(`### YAML flow files (${workflows.yaml.length})`);
  lines.push('');
  lines.push(`Files on disk. Registered: **${workflows.registeredYaml.length}**.`);
  lines.push('');
  lines.push('| File | Namespace | Name | Version | Steps | Registered |');
  lines.push('|---|---|---|---|---|---|');
  const registeredFiles = new Set(workflows.registeredYaml.map((flow) => flow.file));
  for (const flow of workflows.yaml) {
    lines.push(`| \`${flow.file}\` | ${escapeCell(flow.nameSpace || '')} | ${escapeCell(flow.name || '')} | ${escapeCell(flow.version || '')} | ${flow.steps} | ${registeredFiles.has(flow.file) ? 'yes' : '**no**'} |`);
  }
  lines.push('');
  if (workflows.orphaned.length > 0) {
    lines.push('#### Flow files no loader references');
    lines.push('');
    lines.push('These files exist but are not named by any index, so `loadYamlWorkflow` is never called for them');
    lines.push('and they never enter the registry:');
    lines.push('');
    for (const file of workflows.orphaned) lines.push(`- \`${file}\``);
    lines.push('');
  }
  lines.push(`### YAML step types registered (${workflows.registeredSteps.length})`);
  lines.push('');
  lines.push(`Registration is imperative in \`workflow/YamlFlow/steps/registry/YamlStepRegistry.ts\`; the type names`);
  lines.push('below are what a YAML `type:` field must match. Backed by');
  lines.push(`${workflows.steps.length} implementation files in \`workflow/YamlFlow/steps/core/\`.`);
  lines.push('');
  lines.push(workflows.registeredSteps.map((s) => `\`${s}\``).join(', '));
  lines.push('');
  const registeredSet = new Set(workflows.registeredSteps);
  const unregistered = workflows.steps
    .map((name) => name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase())
    .filter((name) => !registeredSet.has(name));
  if (unregistered.length > 0) {
    lines.push('Implementation files whose derived type name is not registered:');
    lines.push(unregistered.map((s) => `\`${s}\``).join(', '));
    lines.push('');
  }

  lines.push('## 8. Operations surface');
  lines.push('');
  lines.push('### CLI definitions');
  lines.push('');
  lines.push('| Command module | Source |');
  lines.push('|---|---|');
  for (const cli of clis) lines.push(`| \`${cli.name}\` | \`${cli.file}\` |`);
  lines.push('');
  lines.push('### Feature flags');
  lines.push('');
  lines.push('| Flag | Title | Admin form | Source |');
  lines.push('|---|---|---|---|');
  for (const flag of flags) {
    lines.push(`| \`${flag.id}\` | ${escapeCell(flag.title || '')} | \`${flag.form || ''}\` | \`src/modules/reactory-core/index.ts:${flag.line}\` |`);
  }
  lines.push('');
  lines.push('### Migrations');
  lines.push('');
  lines.push('| Migration | Source |');
  lines.push('|---|---|');
  for (const migration of migrations) lines.push(`| \`${migration.name}\` | \`${migration.file}\` |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('Generated by `scripts/docs/generate-core-module-reference.js`.');
  lines.push('');

  return lines.join('\n');
}

// ── module index ────────────────────────────────────────────────────────────
function renderIndex() {
  const registryPath = path.join(ROOT, 'src', 'modules', 'available.json');
  const registry = JSON.parse(read(registryPath));
  const modules = Array.isArray(registry) ? registry : Object.values(registry);
  const moduleDocsDir = path.join(ROOT, 'docs', '06-modules');

  const documented = new Map();
  if (fs.existsSync(moduleDocsDir)) {
    for (const entry of fs.readdirSync(moduleDocsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const page = path.join(moduleDocsDir, entry.name, 'README.md');
      if (fs.existsSync(page)) documented.set(entry.name, `./${entry.name}/README.md`);
    }
  }

  const lines = [];
  lines.push('# Modules');
  lines.push('');
  lines.push('> **GENERATED FILE — DO NOT EDIT.**');
  lines.push('>');
  lines.push('> Produced by `scripts/docs/generate-core-module-reference.js` from');
  lines.push('> `src/modules/available.json` plus the presence of `06-modules/<id>/README.md`.');
  lines.push('> Regenerate with `node scripts/docs/generate-core-module-reference.js`.');
  lines.push('');
  lines.push('Module pages follow the 10-section template in the documentation plan. A module with no page');
  lines.push('is listed here as *not yet documented* rather than omitted, so the gap stays visible.');
  lines.push('');
  lines.push(`Registry entries: **${modules.length}**. Documented: **${documented.size}**.`);
  lines.push('');
  lines.push('| Module | FQN | Licence | Page |');
  lines.push('|---|---|---|---|');
  for (const mod of modules.sort((a, b) => String(a.id).localeCompare(String(b.id)))) {
    const id = mod.id || mod.key;
    const page = documented.get(id);
    lines.push([
      `\`${id}\``,
      `\`${mod.fqn || ''}\``,
      mod.license || '',
      page ? `[documented](${page})` : '*not yet documented*',
    ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'));
  }
  lines.push('');
  lines.push('## Generated reference');
  lines.push('');
  const refDir = path.join(ROOT, 'docs', '07-reference', 'modules');
  const refs = fs.existsSync(refDir)
    ? fs.readdirSync(refDir).filter((f) => f.endsWith('.md')).sort()
    : [];
  if (refs.length === 0) {
    lines.push('None yet.');
  } else {
    for (const ref of refs) lines.push(`- [${ref.replace(/\.md$/, '')}](./../07-reference/modules/${ref})`);
  }
  lines.push('');
  return lines.join('\n');
}

const INDEX_OUT = path.join(ROOT, 'docs', '06-modules', 'index.md');

module.exports = {
  ROOT,
  CORE,
  OUT,
  INDEX_OUT,
  render,
  renderIndex,
  serviceCatalog,
  graphSurface,
  modelCatalog,
  formCatalog,
  workflowCatalog,
  cliCatalog,
  featureFlags,
  migrationCatalog,
};

if (require.main === module) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, render(), 'utf8');
  process.stdout.write(`wrote ${rel(OUT)}\n`);

  fs.mkdirSync(path.dirname(INDEX_OUT), { recursive: true });
  fs.writeFileSync(INDEX_OUT, renderIndex(), 'utf8');
  process.stdout.write(`wrote ${rel(INDEX_OUT)}\n`);
}
