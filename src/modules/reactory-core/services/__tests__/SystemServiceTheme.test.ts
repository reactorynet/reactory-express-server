import fs from 'fs';
import os from 'os';
import path from 'path';
import SystemService from '../SystemService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-core/graph/ReactoryApolloClient', () => ({
  queryGraph: jest.fn(),
  mutateGraph: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const ReactoryClient: any = jest.fn();
  ReactoryClient.findById = jest.fn();
  ReactoryClient.find = jest.fn();

  const Menu: any = jest.fn();
  Menu.find = jest.fn();

  return { ReactoryClient, Menu };
});

const models = require('@reactory/server-modules/reactory-core/models');

const theme = (name: string, id?: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  type: 'material',
  defaultThemeMode: 'dark',
  modes: [] as any[],
  assets: [] as any[],
  ...extra,
});

const makeClient = (init: { themes?: any[]; theme?: string | null } = {}) => ({
  _id: 'client-1',
  themes: init.themes ? [...init.themes] : [],
  theme: init.theme,
  save: jest.fn().mockResolvedValue(undefined),
  markModified: jest.fn(),
});

const findByIdResult = (client: any) => ({ exec: jest.fn().mockResolvedValue(client) });

const makeContext = () => ({
  user: { _id: 'user-1' },
  partner: { _id: 'partner-1' },
  log: jest.fn(),
  error: jest.fn(),
  getService: jest.fn(),
});

/**
 * `SystemService` delegated its theme methods to the shared `ThemeService`
 * (ORG-004). These tests lock the legacy contract so the extraction cannot
 * quietly change client behaviour.
 */
describe('SystemService theme delegation (ORG-004)', () => {
  let service: SystemService;
  let context: any;

  beforeEach(() => {
    jest.clearAllMocks();
    context = makeContext();
    service = new SystemService({} as any, context);
  });

  it('throws when the client does not exist', async () => {
    models.ReactoryClient.findById.mockReturnValue(findByIdResult(null));

    await expect(service.saveTheme('client-1', theme('acme'))).rejects.toThrow(/not found/);
    await expect(service.setActiveTheme('client-1', 'acme')).rejects.toThrow(/not found/);
    await expect(service.deleteTheme('client-1', 'acme')).rejects.toThrow(/not found/);
  });

  it('saves a theme on the client and marks the path modified', async () => {
    const client = makeClient();
    models.ReactoryClient.findById.mockReturnValue(findByIdResult(client));

    const result = await service.saveTheme('client-1', theme('acme', 'acme-id'));

    expect(result).toBe(client);
    expect(client.themes).toHaveLength(1);
    expect(client.markModified).toHaveBeenCalledWith('themes');
    expect(client.save).toHaveBeenCalledTimes(1);
  });

  it('sets the active theme without validating it (legacy behaviour)', async () => {
    const client = makeClient({ themes: [theme('acme')] });
    models.ReactoryClient.findById.mockReturnValue(findByIdResult(client));

    await service.setActiveTheme('client-1', 'not-in-the-list');

    expect(client.theme).toBe('not-in-the-list');
    expect(client.save).toHaveBeenCalledTimes(1);
  });

  it('falls back to the default theme name when the last theme is deleted', async () => {
    const client = makeClient({ themes: [theme('only')], theme: 'only' });
    models.ReactoryClient.findById.mockReturnValue(findByIdResult(client));

    await service.deleteTheme('client-1', 'only');

    expect(client.themes).toEqual([]);
    expect(client.theme).toBe('reactory');
  });

  it('falls back to the first remaining theme, in insertion order', async () => {
    const client = makeClient({ themes: [theme('zeta'), theme('alpha')], theme: 'alpha' });
    models.ReactoryClient.findById.mockReturnValue(findByIdResult(client));

    await service.deleteTheme('client-1', 'alpha');

    expect(client.theme).toBe('zeta');
  });

  describe('CSS publishing', () => {
    let previousRoot: string | undefined;
    let dataRoot: string;

    beforeEach(() => {
      previousRoot = process.env.APP_DATA_ROOT;
      dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-system-theme-css-'));
      process.env.APP_DATA_ROOT = dataRoot;
    });

    afterEach(() => {
      if (previousRoot === undefined) delete process.env.APP_DATA_ROOT;
      else process.env.APP_DATA_ROOT = previousRoot;
      (fs as any).rmSync(dataRoot, { recursive: true, force: true });
    });

    it('publishes CSS and links the asset on the client theme', async () => {
      const client = makeClient({ themes: [theme('acme')] });
      models.ReactoryClient.findById.mockReturnValue(findByIdResult(client));

      await expect(service.publishThemeCss('acme', 'body {}', 'client-1')).resolves.toBe(true);

      expect(fs.readFileSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'), 'utf-8')).toBe('body {}');
      expect(client.themes[0].assets).toEqual([
        { id: 'styles', name: 'styles.css', assetType: 'css', url: 'themes/acme/styles.css' },
      ]);
    });

    it('still publishes when the client lookup fails', async () => {
      models.ReactoryClient.findById.mockImplementation(() => {
        throw new Error('lookup exploded');
      });

      await expect(service.publishThemeCss('acme', 'body {}', 'client-1')).resolves.toBe(true);

      expect(fs.existsSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'))).toBe(true);
      expect(context.error).toHaveBeenCalledWith(expect.stringContaining('lookup exploded'));
    });

    it('reads published CSS back', async () => {
      fs.mkdirSync(path.join(dataRoot, 'themes', 'acme'), { recursive: true });
      fs.writeFileSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'), '.acme {}', 'utf-8');

      await expect(service.getThemeCss('acme')).resolves.toBe('.acme {}');
      await expect(service.getThemeCss('missing')).resolves.toBe('');
    });
  });
});
