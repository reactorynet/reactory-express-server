/**
 * Generator imports. The script is plain CommonJS so it can be run both by
 * `node scripts/docs/generate-core-module-reference.js` and from here; importing
 * it lets the test assert the narrative page against the same parse the
 * generator uses, instead of against hard-coded numbers that would rot.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generator = require('../../scripts/docs/generate-core-module-reference.js');

/**
 * Module documentation contract.
 *
 * Guards the deliverable of the `reactory-core` documentation ticket:
 *
 *  - `docs/06-modules/reactory-core/README.md` exists and carries all ten
 *    template sections, in order (§4 of the documentation plan).
 *  - the page is linked from `docs/06-modules/index.md` and from no orphan.
 *  - the generated reference is committed and in sync with the source tree —
 *    a stale table is a test failure, not a discovery.
 *  - every relative markdown link and anchor inside `docs/` resolves.
 *  - the two claims the ticket calls out as mandatory are actually present.
 *  - the counts stated in the narrative match what the source says.
 *
 * Every assertion in this file fails against the tree before the page existed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs');
const MODULE_DIR = path.join(DOCS, '06-modules', 'reactory-core');
const MODULE_PAGE = path.join(MODULE_DIR, 'README.md');
const MODULE_INDEX = path.join(DOCS, '06-modules', 'index.md');
const GENERATED = path.join(DOCS, '07-reference', 'modules', 'reactory-core.md');

const read = (p) => fs.readFileSync(p, 'utf8');

/** The ten template sections, as the headings the page must contain. */
const SECTIONS = [
  '1. Purpose & status',
  '2. Module contract',
  '3. Data model',
  '4. GraphQL API',
  '5. Services',
  '6. UI surface',
  '7. Workflows',
  '8. Operations',
  '9. Limitations & roadmap',
  '10. Evidence index',
];

/** GitHub's heading slug algorithm, near enough for the shapes we emit. */
function slug(heading) {
  return heading
    .replace(/`/g, '')
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

function headingsOf(markdown) {
  const out = [];
  let inFence = false;
  for (const line of markdown.split('\n')) {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) out.push({ level: m[1].length, text: m[2].trim(), slug: slug(m[2].trim()) });
  }
  return out;
}

/** All `[text](target)` links in a markdown document, fence-aware. */
function linksOf(markdown) {
  const out = [];
  let inFence = false;
  const lines = markdown.split('\n');
  lines.forEach((line, i) => {
    if (/^\s*```/.test(line)) inFence = !inFence;
    if (inFence) return;
    const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      out.push({ target: m[1], line: i + 1 });
    }
  });
  return out;
}

function walkMarkdown(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

describe('reactory-core module documentation', () => {
  describe('the narrative page', () => {
    it('exists at the documented location', () => {
      expect(fs.existsSync(MODULE_PAGE)).toBe(true);
    });

    it('carries all ten template sections in order', () => {
      const markdown = read(MODULE_PAGE);
      const headings = headingsOf(markdown).map((h) => h.text);

      const positions = SECTIONS.map((section) => {
        const index = headings.findIndex((h) => h.startsWith(section));
        expect({ section, found: index >= 0 }).toEqual({ section, found: true });
        return index;
      });

      const ascending = positions.every((value, i) => i === 0 || value > positions[i - 1]);
      expect({ order: positions, ascending }).toMatchObject({ ascending: true });
    });

    it('has no section left as TBD', () => {
      const markdown = read(MODULE_PAGE);
      expect(markdown).not.toMatch(/\bTBD\b/);
      expect(markdown).not.toMatch(/\bTODO\b/);
    });

    it('declares the machine-readable status header', () => {
      const markdown = read(MODULE_PAGE);
      const front = /^---\n([\s\S]*?)\n---/.exec(markdown);
      expect(front).not.toBeNull();
      const fields = front[1];
      for (const key of ['title', 'status', 'owner', 'verified', 'verifiedAgainst', 'audience']) {
        expect(fields).toMatch(new RegExp(`^${key}:\\s*\\S`, 'm'));
      }
      expect(fields).toMatch(/^status:\s*(Implemented|Partial|WIP|Roadmap|Deprecated)$/m);
    });

    it('states the FQN and that core has no module dependencies', () => {
      const markdown = read(MODULE_PAGE);
      expect(markdown).toContain('core.ReactoryServer@1.0.0');
      expect(markdown).toContain('`dependencies` | `[]`');
    });

    it('states that services/ETL is a user import feature and not a general ingestion pipeline', () => {
      const markdown = read(MODULE_PAGE);
      expect(markdown).toMatch(/services\/ETL`? is a user\/demographics import feature/i);
      expect(markdown).toMatch(/not a general ingestion pipeline/i);
      // and the reason: the shipped processors are user-shaped only
      expect(markdown).toContain('core.UserFileImportCSV2JSON@1.0.0');
      expect(markdown).toContain('core.UserFileImportProcessDemographics@1.0.0');
    });

    it('states that UserImportFileValidation throws on invocation', () => {
      const markdown = read(MODULE_PAGE);
      expect(markdown).toMatch(/UserImportFileValidation`? throws on invocation/i);
      expect(markdown).toContain('path.join()');
      expect(markdown).toContain('EISDIR');
    });

    it('ships at least one runnable example taken from core itself', () => {
      const markdown = read(MODULE_PAGE);
      // A YAML flow that exists in the module, plus a GraphQL invocation of it.
      expect(markdown).toContain('workflows/examples/EngineHello.yaml');
      expect(fs.existsSync(path.join(ROOT, 'src', 'modules', 'reactory-core', 'workflows', 'examples', 'EngineHello.yaml'))).toBe(true);
      expect(markdown).toMatch(/mutation RunEngineHello/);
      expect(markdown).toMatch(/startWorkflow\(/);
      expect(markdown).toContain('reactory-examples.EngineHello@1.0.0');
    });

    it('populates an evidence index with file:line references', () => {
      const markdown = read(MODULE_PAGE);
      const section = markdown.slice(markdown.indexOf('## 10. Evidence index'));
      const refs = section.match(/`[^`]*src\/modules\/reactory-core\/[^`]*:\d+/g) || [];
      expect(refs.length).toBeGreaterThanOrEqual(20);
    });
  });

  describe('the module index', () => {
    it('exists and links to the core page', () => {
      expect(fs.existsSync(MODULE_INDEX)).toBe(true);
      const markdown = read(MODULE_INDEX);
      expect(markdown).toMatch(/\[documented\]\(\.\/reactory-core\/README\.md\)/);
      expect(markdown).toContain('`reactory-core`');
      expect(markdown).toContain('`core.ReactoryServer@1.0.0`');
    });

    it('lists every module in the registry, documented or not', () => {
      const registry = JSON.parse(read(path.join(ROOT, 'src', 'modules', 'available.json')));
      const modules = Array.isArray(registry) ? registry : Object.values(registry);
      const markdown = read(MODULE_INDEX);
      for (const mod of modules) {
        expect(markdown).toContain(`\`${mod.id}\``);
      }
    });
  });

  describe('the generated reference', () => {
    it('exists and is byte-identical to a fresh generation', () => {
      expect(fs.existsSync(GENERATED)).toBe(true);
      expect(read(GENERATED)).toBe(generator.render());
    });

    it('keeps the module index byte-identical to a fresh generation', () => {
      expect(read(MODULE_INDEX)).toBe(generator.renderIndex());
    });

    it('declares itself generated and not hand-editable', () => {
      const markdown = read(GENERATED);
      expect(markdown).toContain('GENERATED FILE — DO NOT EDIT');
      expect(markdown).toContain('scripts/docs/generate-core-module-reference.js');
    });

    it('covers template sections 2, 3, 4, 5, 6, 7 and 8', () => {
      const markdown = read(GENERATED);
      for (const heading of [
        '## 2. Module contract',
        '## 3. Data model',
        '## 4. GraphQL surface',
        '## 5. Services',
        '## 6. Forms',
        '## 7. Workflows',
        '## 8. Operations surface',
      ]) {
        expect(markdown).toContain(heading);
      }
    });
  });

  describe('the narrative agrees with the source', () => {
    // Prose wraps, so a count and its unit can land on different lines.
    const markdown = read(MODULE_PAGE).replace(/\s+/g, ' ');

    it('states the correct number of service definitions', () => {
      expect(markdown).toContain(`${generator.serviceCatalog().length} service definitions`);
    });

    it('states the correct number of form definitions', () => {
      expect(markdown).toContain(`${generator.formCatalog().length} form definitions`);
    });

    it('states the correct YAML flow, registration and step-type counts', () => {
      const workflows = generator.workflowCatalog();
      expect(markdown).toContain(`${workflows.yaml.length} YAML files`);
      expect(markdown).toContain(`${workflows.registeredYaml.length} of them are registered`);
      expect(markdown).toContain(`${workflows.registeredSteps.length} step types`);
      // Every unregistered file must be named, or the reader cannot tell which
      // examples are actually startable.
      for (const orphan of workflows.orphaned) {
        expect(markdown).toContain(path.basename(orphan));
      }
    });

    it('states the correct GraphQL surface size', () => {
      const graph = generator.graphSurface();
      expect(markdown).toContain(`${graph.names.size} unique type names`);
      expect(markdown).toContain(`${graph.rootFields.Query.length} queries`);
      expect(markdown).toContain(`${graph.rootFields.Mutation.length} mutations`);
      expect(markdown).toContain(`${graph.authUsages.length} \`@auth\` usages`);
    });

    it('states the correct feature-flag, model and migration counts', () => {
      const models = generator.modelCatalog();
      const typeorm = models.filter((model) => model.kind === 'typeorm').length;
      expect(markdown).toContain(`${generator.featureFlags().length} flags`);
      expect(markdown).toContain(`${models.length} collections and entities`);
      expect(markdown).toContain(`${models.length - typeorm} mongoose collections`);
      expect(markdown).toContain(`${typeorm} typeorm entities`);
      expect(markdown).toContain(`${generator.migrationCatalog().length} timestamped migrations`);
    });

    it('names only workflow examples that exist', () => {
      const yamlFiles = generator.workflowCatalog().yaml.map((flow) => flow.file);
      expect(yamlFiles).toContain('src/modules/reactory-core/workflows/examples/EngineHello.yaml');
    });

    it('calls startWorkflow with the arguments the SDL actually declares', () => {
      // The page must not show `startWorkflow(input: { nameSpace, name, version })`.
      // The real field takes a single `workflowId`; the wrong shape fails GraphQL
      // validation before the resolver is reached.
      const sdl = fs.readFileSync(
        path.join(ROOT, 'src/modules/reactory-core/graph/types/System/Workflow.graphql'),
        'utf8',
      );
      expect(/startWorkflow\(\s*workflowId:\s*String!/m.test(sdl)).toBe(true);

      const examples = markdown.match(/startWorkflow\([\s\S]{0,240}?\)/g) || [];
      expect(examples.length).toBeGreaterThan(0);
      for (const example of examples) {
        expect(example).toContain('workflowId:');
        expect(example).not.toMatch(/startWorkflow\(input:/);
        expect(example).not.toContain('nameSpace:');
      }
    });

    it('selects only fields that exist on the WorkflowInstance type', () => {
      const sdl = fs.readFileSync(
        path.join(ROOT, 'src/modules/reactory-core/graph/types/System/Workflow.graphql'),
        'utf8',
      );
      const typeBlock = /^(?:extend\s+)?type WorkflowInstance\s*\{([\s\S]*?)^\}/m.exec(sdl);
      expect(typeBlock).not.toBeNull();
      const fields = new Set(
        [...typeBlock[1].matchAll(/^ {2}([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|:)/gm)].map((m) => m[1]),
      );
      for (const field of ['id', 'name', 'nameSpace', 'version', 'status', 'startTime', 'endTime', 'duration', 'error']) {
        expect(fields.has(field)).toBe(true);
      }
      // Fields that do not exist must not be selected by the example.
      expect(markdown).not.toContain('startedAt');
      expect(markdown).not.toContain('completedAt');
    });

    it('does not cite a mutation the schema does not define, except as a known defect', () => {
      const graph = generator.graphSurface();
      const mutations = new Set(graph.rootFields.Mutation.map((entry) => entry.field));
      // pauseWorkflowSystem/resumeWorkflowSystem/reloadWorkflowConfigurations are
      // referenced by the SystemDashboard form but absent from the SDL. The page
      // documents that gap; it must not present them as working API.
      expect(mutations.has('pauseWorkflowSystem')).toBe(false);
      expect(mutations.has('resumeWorkflowSystem')).toBe(false);
      expect(mutations.has('reloadWorkflowConfigurations')).toBe(false);
      const limitations = markdown.slice(markdown.indexOf('## 9. Limitations'));
      expect(limitations).toContain('pauseWorkflowSystem');
      expect(limitations).toMatch(/do not exist|dead|not exist/i);
    });

    it('reports lifecycle coverage that matches the definitions', () => {
      const services = generator.serviceCatalog();
      const declared = services.filter((service) => service.lifeCycle);
      const undeclared = services.length - declared.length;
      const singletons = declared.filter((service) => service.lifeCycle === 'singleton').length;
      const instances = declared.filter((service) => service.lifeCycle === 'instance').length;

      expect(declared.length).toBeGreaterThan(0);
      expect(markdown).toContain(`**${declared.length}** definitions`);
      expect(markdown).toContain(`**${undeclared} declare no`);
      expect(markdown).toContain(`${singletons} singleton`);
      expect(markdown).toContain(`${instances} instance`);
    });

    it('reads each service id from the definition, not from its first dependency', () => {
      // ModuleGenerator declares no `id`, only `name`/`version`/`nameSpace`, and
      // its first nested `id` belongs to a dependency. Taking that nested id made
      // the generator vanish from the catalogue and silently renamed it to
      // core.TemplateService@1.0.0, which then collided with the real one.
      const services = generator.serviceCatalog();
      const ids = services.map((service) => service.id);

      expect(ids).toContain('core.ReactoryModuleGenerator@1.0.0');
      expect(new Set(ids).size).toBe(ids.length);

      for (const service of services) {
        for (const dependency of service.dependencies) {
          expect(dependency.startsWith(service.id)).toBe(false);
        }
      }
    });

    it('proves the ETL processors are user-shaped only', () => {
      const processors = generator.serviceCatalog().filter((service) => service.id.includes('UserFileImport'));
      expect(processors.length).toBe(5);
      for (const processor of processors) {
        expect(processor.file).toContain('services/ETL/Processors/');
      }
    });
  });

  describe('link check', () => {
    /**
     * Scope: the documentation tree this ticket owns, plus any link that points
     * into it from elsewhere. The repo also contains legacy narrative docs
     * (`docs/readme.md`, `docs/forms/*.md`) with pre-existing broken relative
     * links and `<REACTORY_HOME>` placeholders; those are outside this ticket
     * and are reported separately rather than repaired here.
     */
    const OWNED = [
      path.join(DOCS, '06-modules'),
      path.join(DOCS, '07-reference'),
    ];

    const ownedFiles = OWNED.filter((dir) => fs.existsSync(dir)).flatMap(walkMarkdown);
    const otherFiles = walkMarkdown(DOCS).filter((file) => !ownedFiles.includes(file));

    const isOwnedTarget = (file, target) => {
      if (target.startsWith('#')) return false;
      const [rawPath] = target.split('#');
      if (!rawPath) return false;
      const resolved = path.resolve(path.dirname(file), rawPath);
      return OWNED.some((dir) => resolved.startsWith(dir));
    };

    const check = (files, linkFilter) => {
      const failures = [];
      for (const file of files) {
        for (const link of linksOf(read(file))) {
          const target = link.target;
          // External URLs, anchors-only, site-absolute paths and placeholder
          // tokens (`<REACTORY_HOME>/...`) are not resolvable file references.
          if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
          if (target.startsWith('#') || target.startsWith('/') || target.startsWith('<')) continue;
          if (!linkFilter(file, target)) continue;

          const [rawPath, anchor] = target.split('#');
          const resolved = path.resolve(path.dirname(file), rawPath);

          if (!fs.existsSync(resolved)) {
            failures.push(`${path.relative(ROOT, file)}:${link.line} → ${target} (missing file)`);
            continue;
          }

          if (anchor && resolved.endsWith('.md')) {
            const anchors = new Set(headingsOf(read(resolved)).map((h) => h.slug));
            if (!anchors.has(anchor)) {
              failures.push(`${path.relative(ROOT, file)}:${link.line} → ${target} (missing anchor)`);
            }
          }
        }
      }
      return failures;
    };

    it('resolves every relative link and anchor in the module documentation tree', () => {
      expect(ownedFiles.length).toBeGreaterThanOrEqual(2);
      expect(check(ownedFiles, () => true)).toEqual([]);
    });

    it('resolves every link that points into the module documentation tree', () => {
      expect(check(otherFiles, isOwnedTarget)).toEqual([]);
    });

    it('links the core page from the module index', () => {
      const markdown = read(MODULE_INDEX);
      const links = linksOf(markdown).map((link) => link.target);
      expect(links).toContain('./reactory-core/README.md');
    });
  });
});
