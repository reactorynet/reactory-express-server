import fs from 'fs';
import os from 'os';
import path from 'path';
import ReactoryTheme from '@reactory/server-core/data/clientConfigs/reactory/themes/reactory';
import Organization from '../../models/Organization';
import ReactoryClient from '../../models/ReactoryClient';
import { ThemeService, IThemeHolder } from '../ThemeService';

/**
 * Plain holder standing in for a Mongoose document. The helper is structural,
 * so this proves it is not tied to either model.
 */
const makeHolder = (init: Partial<IThemeHolder> = {}): any => ({
  themes: init.themes ? [...init.themes] : [],
  theme: init.theme,
  themeMode: init.themeMode,
  save: jest.fn().mockResolvedValue(undefined),
  markModified: jest.fn(),
});

const theme = (name: string, id?: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  type: 'material',
  defaultThemeMode: 'dark',
  modes: [] as any[],
  assets: [] as any[],
  ...extra,
});

describe('ThemeService shared holder operations', () => {
  let service: ThemeService;

  beforeEach(() => {
    service = new ThemeService();
  });

  describe('saveTheme', () => {
    it('appends a new theme, marks the path modified and saves the holder', async () => {
      const holder = makeHolder({ themes: [theme('reactory')] });
      const added = theme('acme', 'acme-theme');

      const result = await service.saveTheme(holder, added);

      expect(result).toBe(holder);
      expect(holder.themes).toHaveLength(2);
      expect(holder.themes[1]).toEqual(added);
      expect(holder.markModified).toHaveBeenCalledWith('themes');
      expect(holder.save).toHaveBeenCalledTimes(1);
    });

    it('merges into an existing theme matched by name', async () => {
      const holder = makeHolder({ themes: [theme('acme', 'acme-theme', { description: 'old', version: '1.0.0' })] });

      await service.saveTheme(holder, { name: 'acme', description: 'new' });

      expect(holder.themes).toHaveLength(1);
      expect(holder.themes[0]).toMatchObject({
        id: 'acme-theme',
        name: 'acme',
        description: 'new',
        version: '1.0.0',
      });
    });

    it('merges into an existing theme matched by id when the name changed', async () => {
      const holder = makeHolder({ themes: [theme('acme', 'acme-theme', { description: 'old' })] });

      await service.saveTheme(holder, { id: 'acme-theme', name: 'acme-renamed' });

      expect(holder.themes).toHaveLength(1);
      expect(holder.themes[0]).toMatchObject({ id: 'acme-theme', name: 'acme-renamed', description: 'old' });
    });

    it('rejects a theme without a name', async () => {
      const holder = makeHolder();

      await expect(service.saveTheme(holder, { id: 'nameless' })).rejects.toThrow(/non-empty name/);
      await expect(service.saveTheme(holder, null)).rejects.toThrow(/non-empty name/);
      expect(holder.themes).toEqual([]);
      expect(holder.save).not.toHaveBeenCalled();
    });

    it('works on a holder without markModified (plain object)', async () => {
      const holder: any = { themes: [], save: jest.fn().mockResolvedValue(undefined) };

      await expect(service.saveTheme(holder, theme('acme'))).resolves.toBe(holder);
      expect(holder.themes).toHaveLength(1);
    });
  });

  describe('deleteTheme', () => {
    it('removes a theme by name', async () => {
      const holder = makeHolder({ themes: [theme('a'), theme('b')], theme: 'a' });

      await service.deleteTheme(holder, 'b');

      expect(holder.themes.map((t: any) => t.name)).toEqual(['a']);
      expect(holder.theme).toBe('a');
    });

    it('removes a theme by id', async () => {
      const holder = makeHolder({ themes: [theme('a', 'a-id'), theme('b', 'b-id')], theme: 'a' });

      await service.deleteTheme(holder, 'b-id');

      expect(holder.themes.map((t: any) => t.name)).toEqual(['a']);
    });

    it('falls back to the first remaining theme in insertion order when the active theme is deleted', async () => {
      // Deliberately not alphabetical: 'zeta' is first by insertion. A sorted
      // fallback would pick 'alpha' and mask the non-determinism this covers.
      const holder = makeHolder({
        themes: [theme('zeta'), theme('alpha'), theme('middle')],
        theme: 'middle',
      });

      await service.deleteTheme(holder, 'middle');

      expect(holder.themes.map((t: any) => t.name)).toEqual(['zeta', 'alpha']);
      expect(holder.theme).toBe('zeta');
      expect(holder.markModified).toHaveBeenCalledWith('themes');
    });

    it('clears the pointer when the last theme is deleted', async () => {
      const holder = makeHolder({ themes: [theme('only')], theme: 'only' });

      await service.deleteTheme(holder, 'only');

      expect(holder.themes).toEqual([]);
      expect(holder.theme).toBeNull();
    });

    it('uses the caller supplied fallback when the last theme is deleted', async () => {
      const holder = makeHolder({ themes: [theme('only')], theme: 'only' });

      await service.deleteTheme(holder, 'only', { emptyFallback: 'reactory' });

      expect(holder.theme).toBe('reactory');
    });

    it('leaves a pointer alone when a different theme is deleted', async () => {
      const holder = makeHolder({ themes: [theme('a'), theme('b')], theme: 'a' });

      await service.deleteTheme(holder, 'b');

      expect(holder.theme).toBe('a');
    });

    it('does not invent a pointer when none was set', async () => {
      const holder = makeHolder({ themes: [theme('a')] });

      await service.deleteTheme(holder, 'a');

      expect(holder.theme).toBeUndefined();
    });
  });

  describe('setActiveTheme', () => {
    it('sets both theme and themeMode when a mode is supplied', async () => {
      const holder = makeHolder({ themes: [theme('acme')], theme: 'reactory', themeMode: 'dark' });

      await service.setActiveTheme(holder, 'acme', 'light');

      expect(holder.theme).toBe('acme');
      expect(holder.themeMode).toBe('light');
      expect(holder.save).toHaveBeenCalledTimes(1);
    });

    it('leaves the mode untouched when no mode is supplied', async () => {
      const holder = makeHolder({ themes: [theme('acme')], themeMode: 'dark' });

      await service.setActiveTheme(holder, 'acme');

      expect(holder.theme).toBe('acme');
      expect(holder.themeMode).toBe('dark');
    });

    it('accepts a theme matched by id', async () => {
      const holder = makeHolder({ themes: [theme('acme', 'acme-id')] });

      await service.setActiveTheme(holder, 'acme-id');

      expect(holder.theme).toBe('acme-id');
    });

    it('rejects an unknown theme name and does not save', async () => {
      const holder = makeHolder({ themes: [theme('acme')], theme: 'acme' });

      await expect(service.setActiveTheme(holder, 'missing')).rejects.toThrow(/not available/);
      expect(holder.theme).toBe('acme');
      expect(holder.save).not.toHaveBeenCalled();
    });

    it('names the known themes in the rejection so the caller can recover', async () => {
      const holder = makeHolder({ themes: [theme('acme'), theme('beta')] });

      await expect(service.setActiveTheme(holder, 'missing')).rejects.toThrow(/acme, beta/);
    });

    it('can opt out of validation for legacy callers', async () => {
      const holder = makeHolder({ themes: [] });

      await service.setActiveTheme(holder, 'external-theme', 'dark', { requireExisting: false });

      expect(holder.theme).toBe('external-theme');
      expect(holder.themeMode).toBe('dark');
    });
  });

  describe('CSS publishing', () => {
    let previousRoot: string | undefined;
    let dataRoot: string;

    beforeEach(() => {
      previousRoot = process.env.APP_DATA_ROOT;
      dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-theme-css-'));
      process.env.APP_DATA_ROOT = dataRoot;
    });

    afterEach(() => {
      if (previousRoot === undefined) delete process.env.APP_DATA_ROOT;
      else process.env.APP_DATA_ROOT = previousRoot;
      (fs as any).rmSync(dataRoot, { recursive: true, force: true });
    });

    it('writes styles.css under the theme folder and reads it back', async () => {
      await expect(service.publishThemeCss('acme', '.acme { color: red; }')).resolves.toBe(true);

      const cssPath = path.join(dataRoot, 'themes', 'acme', 'styles.css');
      expect(fs.readFileSync(cssPath, 'utf-8')).toBe('.acme { color: red; }');
      await expect(service.getThemeCss('acme')).resolves.toBe('.acme { color: red; }');
    });

    it('returns an empty string when a theme has no published CSS', async () => {
      await expect(service.getThemeCss('never-published')).resolves.toBe('');
    });

    it('links a styles asset onto the holder theme', async () => {
      const holder = makeHolder({ themes: [theme('acme', 'acme-id')] });

      await service.publishThemeCss('acme', 'body {}', holder);

      expect(holder.themes[0].assets).toEqual([
        { id: 'styles', name: 'styles.css', assetType: 'css', url: 'themes/acme/styles.css' },
      ]);
      expect(holder.markModified).toHaveBeenCalledWith('themes');
      expect(holder.save).toHaveBeenCalledTimes(1);
    });

    it('updates an existing styles asset instead of duplicating it', async () => {
      const holder = makeHolder({
        themes: [
          theme('acme', 'acme-id', {
            assets: [
              { id: 'logo', name: 'logo', assetType: 'image', url: 'themes/acme/logo.png' },
              { id: 'styles', name: 'styles.css', assetType: 'css', url: 'stale.css' },
            ],
          }),
        ],
      });

      await service.publishThemeCss('acme', 'body {}', holder);

      expect(holder.themes[0].assets).toHaveLength(2);
      expect(holder.themes[0].assets[1]).toEqual({
        id: 'styles',
        name: 'styles.css',
        assetType: 'css',
        url: 'themes/acme/styles.css',
      });
    });

    it('publishes the CSS even when linking cannot find the theme', async () => {
      const holder = makeHolder({ themes: [theme('other')] });

      await expect(service.publishThemeCss('acme', 'body {}', holder)).resolves.toBe(true);

      expect(fs.existsSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'))).toBe(true);
      expect(holder.save).not.toHaveBeenCalled();
    });

    it('rejects theme names that would escape the themes folder', async () => {
      await expect(service.publishThemeCss('../escape', 'body {}')).rejects.toThrow(/Invalid theme name/);
      await expect(service.getThemeCss('../../etc/passwd')).rejects.toThrow(/Invalid theme name/);
    });
  });
});

/**
 * Acceptance criterion: an organization stores themes with exactly the same
 * shape as a ReactoryClient. `Organization.themes` is `[Mixed]` (as is
 * `ReactoryClient.themes`), so the shipped `ReactoryTheme` must survive a
 * write and a rehydration unchanged.
 */
describe('ThemeService - ReactoryTheme round-trip through Organization storage', () => {
  it('declares themes as a Mixed array, matching ReactoryClient', () => {
    const themesPath: any = Organization.schema.path('themes');
    const clientThemesPath: any = ReactoryClient.schema.path('themes');

    expect(themesPath.instance).toBe('Array');
    expect(themesPath.caster?.instance).toBe('Mixed');
    expect(clientThemesPath.caster?.instance).toBe('Mixed');
    expect(Organization.schema.path('theme').instance).toBe('String');
    expect((Organization.schema.path('themeMode') as any).enumValues).toEqual(['light', 'dark', 'os']);
  });

  it('persists the shipped ReactoryTheme and reloads it unchanged', async () => {
    const service = new ThemeService();
    const organization: any = new Organization({ name: 'Acme', code: 'ACME' });
    organization.save = jest.fn().mockResolvedValue(organization);

    await service.saveTheme(organization, ReactoryTheme);

    // The persisted representation is what Mongo would hold. `minimize`
    // defaults to true and drops empty objects (`layouts[0].uiSchema` is
    // `{}`), which is document conversion behaviour rather than storage, so
    // it is disabled to compare the actual theme payload.
    const stored = JSON.parse(JSON.stringify(organization.toObject({ depopulate: true, minimize: false })));
    const expected = JSON.parse(JSON.stringify(ReactoryTheme));

    expect(stored.themes).toHaveLength(1);
    expect(stored.themes[0]).toEqual(expected);

    // Rehydration is the read path used by CoreOrganization.
    const reloaded: any = Organization.hydrate(stored);
    expect(JSON.parse(JSON.stringify(reloaded.themes[0]))).toEqual(expected);
    expect(JSON.parse(JSON.stringify(reloaded.themes[0].modes))).toEqual(expected.modes);
    expect(JSON.parse(JSON.stringify(reloaded.themes[0].assets))).toEqual(expected.assets);
    expect(reloaded.themes[0].content).toEqual(expected.content);
  });

  it('saves, activates and deletes an organization theme end to end', async () => {
    const service = new ThemeService();
    const organization: any = new Organization({ name: 'Acme' });
    organization.save = jest.fn().mockResolvedValue(organization);

    await service.saveTheme(organization, ReactoryTheme);
    await service.setActiveTheme(organization, 'reactory', 'light');
    expect(organization.theme).toBe('reactory');
    expect(organization.themeMode).toBe('light');

    await service.deleteTheme(organization, 'reactory');
    expect(organization.themes).toHaveLength(0);
    expect(organization.theme).toBeNull();
  });
});
