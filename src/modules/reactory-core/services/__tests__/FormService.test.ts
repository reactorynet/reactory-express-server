/**
 * ReactoryFormService – form loading test suite.
 *
 * These tests focus on the YAML overlay / virtual form loading behaviour:
 *  - forms authored as YAML in $REACTORY_DATA/forms are surfaced by list()
 *  - YAML overlays deep-merge over code (module) forms
 *  - role based access control is honoured
 *  - get() resolves both code forms (with overlay) and pure YAML forms
 *  - YAML property keys that contain a colon (ui:widget, ui:options, ui:field,
 *    ui:grid-layout) survive a real js-yaml parse/dump round trip.
 *
 * The suite uses a real temporary directory for REACTORY_DATA and the real
 * js-yaml library so the colon-key encoding concern is genuinely exercised.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';

// The service pulls in the entire module registry and the auth decorators at
// import time. Mock those so the unit under test stays isolated and fast.
const mockModules: { enabled: any[] } = { enabled: [] };
jest.mock('@reactory/server-core/modules', () => ({ __esModule: true, default: mockModules }));
jest.mock('@reactory/server-core/authentication/decorators', () => ({
  __esModule: true,
  roles: () => () => undefined,
}));
jest.mock('@reactory/server-core/exceptions', () => ({
  __esModule: true,
  default: class ApiError extends Error {
    meta: any;
    constructor(message: string, meta?: any) {
      super(message);
      this.name = 'ApiError';
      this.meta = meta;
    }
  },
}));

// eslint-disable-next-line import/first
import ReactoryFormService from '../FormService';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpRoot: string;
let formsDir: string;
const originalReactoryData = process.env.REACTORY_DATA;

const createContext = (rolesHeld: string[] = []) => ({
  hasRole: (role: string) => rolesHeld.includes(role),
  log: jest.fn(),
});

const createService = (rolesHeld: string[] = []) =>
  new ReactoryFormService({} as any, createContext(rolesHeld) as any);

const writeForm = (fileName: string, content: string | Record<string, any>) => {
  const body = typeof content === 'string' ? content : yaml.dump(content);
  fs.writeFileSync(path.join(formsDir, fileName), body, 'utf8');
};

const clearForms = () => {
  for (const f of fs.readdirSync(formsDir)) {
    fs.rmSync(path.join(formsDir, f), { recursive: true, force: true });
  }
};

const setModuleForms = (forms: any[]) => {
  mockModules.enabled = [{ name: 'test-module', forms }];
};

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-forms-test-'));
  formsDir = path.join(tmpRoot, 'forms');
  fs.mkdirSync(formsDir, { recursive: true });
  process.env.REACTORY_DATA = tmpRoot;
});

afterAll(() => {
  if (originalReactoryData === undefined) delete process.env.REACTORY_DATA;
  else process.env.REACTORY_DATA = originalReactoryData;
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

beforeEach(() => {
  clearForms();
  mockModules.enabled = [];
});

// ---------------------------------------------------------------------------
// list()
// ---------------------------------------------------------------------------

describe('ReactoryFormService.list – YAML form discovery', () => {
  it('surfaces a YAML-only (user authored) form that has no module counterpart', async () => {
    writeForm('werner.TestForm@1.0.0.yaml', {
      id: 'werner-test-form',
      nameSpace: 'werner',
      name: 'TestForm',
      version: '1.0.0',
      title: 'Test Form',
      roles: [],
      schema: { type: 'object', properties: { property1: { type: 'string' } } },
      uiSchema: {},
    });

    const forms = await createService().list();

    expect(forms.map((f) => f.id)).toContain('werner-test-form');
    expect(forms.find((f) => f.id === 'werner-test-form')?.title).toBe('Test Form');
  });

  it('returns forms whose roles array is empty regardless of the user roles held', async () => {
    // Reproduces the reported scenario: files with `roles: []` should always list.
    writeForm('a.Form@1.0.0.yaml', { id: 'a.form', nameSpace: 'a', name: 'Form', version: '1.0.0', roles: [] });

    // A context that holds NO roles at all.
    const forms = await createService([]).list();

    expect(forms.map((f) => f.id)).toContain('a.form');
  });

  it('lists both module forms and YAML-only forms together', async () => {
    setModuleForms([
      { id: 'core.CodeForm', nameSpace: 'core', name: 'CodeForm', version: '1.0.0', title: 'Code Form' },
    ]);
    writeForm('my.Virtual@1.0.0.yaml', {
      id: 'my.Virtual', nameSpace: 'my', name: 'Virtual', version: '1.0.0', title: 'Virtual Form', roles: [],
    });

    const ids = (await createService().list()).map((f) => f.id);

    expect(ids).toEqual(expect.arrayContaining(['core.CodeForm', 'my.Virtual']));
  });

  it('deep-merges a YAML overlay over a module form with the same id (single entry, overlay wins)', async () => {
    setModuleForms([
      { id: 'core.Profile', nameSpace: 'core', name: 'Profile', version: '1.0.0', title: 'Profile (code)', backButton: false },
    ]);
    writeForm('core.Profile@1.0.0.yaml', {
      id: 'core.Profile', nameSpace: 'core', name: 'Profile', version: '1.0.0', title: 'Profile (edited)',
    });

    const forms = await createService().list();
    const profiles = forms.filter((f) => f.id === 'core.Profile');

    expect(profiles).toHaveLength(1);
    expect(profiles[0].title).toBe('Profile (edited)'); // overlay wins
    expect(profiles[0].backButton).toBe(false); // untouched base field preserved
  });

  it('excludes a role-restricted YAML form when the user lacks the role', async () => {
    writeForm('my.Secret@1.0.0.yaml', {
      id: 'my.Secret', nameSpace: 'my', name: 'Secret', version: '1.0.0', roles: ['ADMIN'],
    });

    const asUser = (await createService(['USER']).list()).map((f) => f.id);
    const asAdmin = (await createService(['ADMIN']).list()).map((f) => f.id);

    expect(asUser).not.toContain('my.Secret');
    expect(asAdmin).toContain('my.Secret');
  });

  it('skips an unparseable YAML file without failing the whole list', async () => {
    writeForm('good.Form@1.0.0.yaml', { id: 'good.form', nameSpace: 'good', name: 'Form', version: '1.0.0', roles: [] });
    // Invalid YAML (unclosed bracket / bad indentation)
    fs.writeFileSync(path.join(formsDir, 'bad.Form@1.0.0.yaml'), 'id: [oops\n  : : :', 'utf8');

    const ids = (await createService().list()).map((f) => f.id);

    expect(ids).toContain('good.form');
  });

  it('ignores non-yaml entries such as the images sub-directory', async () => {
    fs.mkdirSync(path.join(formsDir, 'images'), { recursive: true });
    fs.writeFileSync(path.join(formsDir, 'images', 'shot.png'), 'not-yaml', 'utf8');
    writeForm('only.Form@1.0.0.yaml', { id: 'only.form', nameSpace: 'only', name: 'Form', version: '1.0.0', roles: [] });

    const ids = (await createService().list()).map((f) => f.id);

    expect(ids).toEqual(['only.form']);
  });
});

// ---------------------------------------------------------------------------
// get()
// ---------------------------------------------------------------------------

describe('ReactoryFormService.get – YAML resolution', () => {
  it('resolves a pure YAML form by id', async () => {
    writeForm('my.Virtual@1.0.0.yaml', {
      id: 'my.Virtual', nameSpace: 'my', name: 'Virtual', version: '1.0.0', title: 'Virtual', roles: [],
    });

    const form = await createService().get('my.Virtual');

    expect(form).toBeTruthy();
    expect(form.title).toBe('Virtual');
  });

  it('deep-merges the YAML overlay over the code form, replacing a function schema with an object', async () => {
    const codeSchemaFn = () => ({ type: 'object', properties: {} });
    setModuleForms([
      {
        id: 'core.Profile', nameSpace: 'core', name: 'Profile', version: '1.0.0',
        title: 'code title', schema: codeSchemaFn, roles: [],
      },
    ]);
    writeForm('core.Profile@1.0.0.yaml', {
      id: 'core.Profile', nameSpace: 'core', name: 'Profile', version: '1.0.0',
      title: 'overlay title',
      schema: { type: 'object', properties: { a: { type: 'string' } } },
    });

    const form = await createService().get('core.Profile');

    expect(form.title).toBe('overlay title');
    expect(typeof form.schema).toBe('object'); // function replaced by object
    expect((form.schema as any).properties.a.type).toBe('string');
  });

  it('returns the code form unchanged when no YAML overlay exists', async () => {
    setModuleForms([
      { id: 'core.Plain', nameSpace: 'core', name: 'Plain', version: '1.0.0', title: 'plain', roles: [] },
    ]);

    const form = await createService().get('core.Plain');

    expect(form.title).toBe('plain');
  });

  it('returns null for an unknown id', async () => {
    const form = await createService().get('does.not.exist');
    expect(form).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// YAML colon-key encoding (the ui:widget / ui:options concern)
// ---------------------------------------------------------------------------

describe('ReactoryFormService – YAML colon-key encoding', () => {
  const rawColonKeyForm = `
id: colon.Form
nameSpace: colon
name: Form
version: 1.0.0
title: Colon Key Form
roles: []
schema:
  type: object
  properties:
    workdir:
      type: string
      title: Working Directory
uiSchema:
  ui:field: GridLayout
  ui:grid-layout:
    - workdir:
        md: 12
  workdir:
    ui:widget: TextWidget
    ui:options:
      placeholder: e.g. /some/path
      rows: 4
`;

  it('parses hand/AI authored ui:* colon keys into the correct property names', async () => {
    writeForm('colon.Form@1.0.0.yaml', rawColonKeyForm);

    const form = await createService().get('colon.Form');
    const ui = form.uiSchema as any;

    expect(Object.keys(ui)).toEqual(expect.arrayContaining(['ui:field', 'ui:grid-layout', 'workdir']));
    expect(ui['ui:field']).toBe('GridLayout');
    expect(ui.workdir['ui:widget']).toBe('TextWidget');
    expect(ui.workdir['ui:options'].placeholder).toBe('e.g. /some/path');
    expect(ui.workdir['ui:options'].rows).toBe(4);
    expect(ui['ui:grid-layout'][0].workdir.md).toBe(12);
  });

  it('round-trips ui:* colon keys through save() → on-disk YAML → get()', async () => {
    const service = createService();
    const input: any = {
      id: 'save.Colon', nameSpace: 'save', name: 'Colon', version: '1.0.0',
      title: 'Save Colon',
      schema: { type: 'object', properties: { field1: { type: 'string' } } },
      uiSchema: {
        'ui:field': 'GridLayout',
        field1: {
          'ui:widget': 'TextAreaWidget',
          'ui:options': { rows: 6, placeholder: 'hint' },
        },
      },
    };

    await service.save(input, { publish: false });

    // The file must exist under the canonical name and the keys must survive.
    const onDisk = fs.readFileSync(path.join(formsDir, 'save.Colon@1.0.0.yaml'), 'utf8');
    expect(onDisk).toContain('ui:widget: TextAreaWidget');
    expect(onDisk).toContain('ui:options:');

    const reloaded = await service.get('save.Colon');
    const ui = reloaded.uiSchema as any;
    expect(ui['ui:field']).toBe('GridLayout');
    expect(ui.field1['ui:widget']).toBe('TextAreaWidget');
    expect(ui.field1['ui:options'].rows).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// save()
// ---------------------------------------------------------------------------

describe('ReactoryFormService.save – YAML persistence', () => {
  it('writes to $REACTORY_DATA/forms/nameSpace.name@version.yaml and makes the form listable', async () => {
    const service = createService();

    await service.save({
      id: 'persisted.form', nameSpace: 'persisted', name: 'Form', version: '1.0.0', title: 'Persisted',
      schema: { type: 'object', properties: {} }, uiSchema: {}, roles: [],
    } as any, { publish: false });

    expect(fs.existsSync(path.join(formsDir, 'persisted.Form@1.0.0.yaml'))).toBe(true);

    const ids = (await service.list()).map((f) => f.id);
    expect(ids).toContain('persisted.form');
  });

  it('strips runtime / function fields before serializing', async () => {
    const service = createService();

    await service.save({
      id: 'clean.form', nameSpace: 'clean', name: 'Form', version: '1.0.0',
      schema: { type: 'object', properties: {} }, uiSchema: {},
      __complete__: true,
      defaultFormValue: () => ({ hello: 'world' }),
    } as any, { publish: false });

    const onDisk = fs.readFileSync(path.join(formsDir, 'clean.Form@1.0.0.yaml'), 'utf8');
    expect(onDisk).not.toContain('__complete__');
    expect(onDisk).not.toContain('defaultFormValue');
  });

  it('rejects identifiers containing path separators', async () => {
    const service = createService();
    await expect(
      service.save({ id: 'x', nameSpace: '../escape', name: 'Form', version: '1.0.0' } as any, { publish: false })
    ).rejects.toThrow();
  });
});
