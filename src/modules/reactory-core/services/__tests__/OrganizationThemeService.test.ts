import fs from 'fs';
import os from 'os';
import path from 'path';
import { ObjectId } from 'mongodb';
import { OrganizationService } from '../OrganizationService';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-core/modules', () => ({
  enabled: [],
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const Team: any = jest.fn();
  Team.find = jest.fn();
  Team.findById = jest.fn();

  const Organization: any = jest.fn();
  Organization.findById = jest.fn();
  Organization.findOne = jest.fn();
  Organization.count = jest.fn();
  Organization.countDocuments = jest.fn();
  Organization.find = jest.fn();

  const BusinessUnit: any = jest.fn();
  BusinessUnit.findOne = jest.fn();
  BusinessUnit.findById = jest.fn();

  const User: any = jest.fn();
  User.findById = jest.fn();

  return { Team, Organization, BusinessUnit, User };
});

const models = require('@reactory/server-modules/reactory-core/models');

const ALLOWED_ROLES = ['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'];

const makeContext = (roles: string[] = ALLOWED_ROLES) => {
  const context: any = {
    user: { _id: new ObjectId() },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    memberships: [],
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn(),
  };
  context.hasRole = jest.fn((role: string) => roles.indexOf(role) >= 0);
  return context;
};

const theme = (name: string, id?: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  type: 'material',
  defaultThemeMode: 'dark',
  modes: [] as any[],
  assets: [] as any[],
  ...extra,
});

/** Stand-in for a hydrated Organization document. */
const makeOrganization = (init: { themes?: any[]; theme?: string | null; themeMode?: string | null } = {}) => ({
  _id: new ObjectId(),
  name: 'Acme',
  themes: init.themes ? [...init.themes] : [],
  theme: init.theme,
  themeMode: init.themeMode,
  save: jest.fn().mockResolvedValue(undefined),
  markModified: jest.fn(),
});

describe('OrganizationService theme methods (ORG-004)', () => {
  let service: OrganizationService;
  let context: any;

  beforeEach(() => {
    jest.clearAllMocks();
    context = makeContext();
    service = new OrganizationService({}, context);
  });

  describe('authorization', () => {
    const orgId = () => new ObjectId().toString();

    type DenialCase = [string, (svc: any, id: string) => unknown];
    const denialCases: DenialCase[] = [
      ['saveTheme', (svc: any, id: string) => svc.saveTheme(id, theme('acme'))],
      ['setActiveTheme', (svc: any, id: string) => svc.setActiveTheme(id, 'acme')],
      ['deleteTheme', (svc: any, id: string) => svc.deleteTheme(id, 'acme')],
      ['publishThemeCss', (svc: any, id: string) => svc.publishThemeCss(id, 'acme', 'body {}')],
    ];

    it.each(denialCases)('rejects a USER caller for %s without touching the organization', (_method, call) => {
      const userService = new OrganizationService({}, makeContext(['USER']));
      const id = orgId();

      expect(() => call(userService, id)).toThrow(/permissions/i);
      expect(models.Organization.findById).not.toHaveBeenCalled();
    });

    it.each(ALLOWED_ROLES)('allows %s to save a theme', async (role) => {
      const roleService = new OrganizationService({}, makeContext([role]));
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      await roleService.saveTheme(organization._id.toString(), theme('acme'));

      expect(organization.themes).toHaveLength(1);
      expect(organization.save).toHaveBeenCalled();
    });
  });

  describe('saveTheme', () => {
    it('persists the theme on the organization', async () => {
      const organization = makeOrganization();
      models.Organization.findById.mockResolvedValue(organization);

      const result = await service.saveTheme(organization._id.toString(), theme('acme', 'acme-id'));

      expect(result).toBe(organization);
      expect(organization.themes).toEqual([theme('acme', 'acme-id')]);
      expect(organization.markModified).toHaveBeenCalledWith('themes');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('updates an existing theme in place', async () => {
      const organization = makeOrganization({ themes: [theme('acme', 'acme-id', { description: 'old' })] });
      models.Organization.findById.mockResolvedValue(organization);

      await service.saveTheme(organization._id.toString(), { name: 'acme', description: 'new' });

      expect(organization.themes).toHaveLength(1);
      expect(organization.themes[0]).toMatchObject({ id: 'acme-id', description: 'new' });
    });

    it('rejects an invalid organization id', async () => {
      await expect(service.saveTheme('not-an-object-id', theme('acme'))).rejects.toThrow(/not a valid/);
      expect(models.Organization.findById).not.toHaveBeenCalled();
    });

    it('rejects an organization that does not exist', async () => {
      models.Organization.findById.mockResolvedValue(null);

      await expect(service.saveTheme(new ObjectId().toString(), theme('acme'))).rejects.toThrow(/could not be found/);
    });
  });

  describe('setActiveTheme', () => {
    it('persists both the theme and the theme mode', async () => {
      const organization = makeOrganization({ themes: [theme('acme'), theme('reactory')], theme: 'reactory' });
      models.Organization.findById.mockResolvedValue(organization);

      const result: any = await service.setActiveTheme(organization._id.toString(), 'acme', 'light');

      expect(result.theme).toBe('acme');
      expect(result.themeMode).toBe('light');
      expect(organization.save).toHaveBeenCalledTimes(1);
    });

    it('keeps the existing mode when no mode is supplied', async () => {
      const organization = makeOrganization({ themes: [theme('acme')], themeMode: 'dark' });
      models.Organization.findById.mockResolvedValue(organization);

      await service.setActiveTheme(organization._id.toString(), 'acme');

      expect(organization.theme).toBe('acme');
      expect(organization.themeMode).toBe('dark');
    });

    it('rejects a theme name that is not on the organization', async () => {
      const organization = makeOrganization({ themes: [theme('acme')], theme: 'acme' });
      models.Organization.findById.mockResolvedValue(organization);

      await expect(service.setActiveTheme(organization._id.toString(), 'missing')).rejects.toThrow(/not available/);
      expect(organization.theme).toBe('acme');
      expect(organization.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteTheme', () => {
    it('falls back to the first remaining theme in insertion order', async () => {
      const organization = makeOrganization({
        themes: [theme('zeta'), theme('alpha'), theme('middle')],
        theme: 'middle',
      });
      models.Organization.findById.mockResolvedValue(organization);

      await service.deleteTheme(organization._id.toString(), 'middle');

      expect(organization.themes.map((t: any) => t.name)).toEqual(['zeta', 'alpha']);
      expect(organization.theme).toBe('zeta');
    });

    it('clears the pointer when the last theme is deleted', async () => {
      const organization = makeOrganization({ themes: [theme('only')], theme: 'only' });
      models.Organization.findById.mockResolvedValue(organization);

      await service.deleteTheme(organization._id.toString(), 'only');

      expect(organization.themes).toEqual([]);
      expect(organization.theme).toBeNull();
      expect(organization.save).toHaveBeenCalled();
    });
  });

  describe('CSS publishing', () => {
    let previousRoot: string | undefined;
    let dataRoot: string;

    beforeEach(() => {
      previousRoot = process.env.APP_DATA_ROOT;
      dataRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reactory-org-theme-css-'));
      process.env.APP_DATA_ROOT = dataRoot;
    });

    afterEach(() => {
      if (previousRoot === undefined) delete process.env.APP_DATA_ROOT;
      else process.env.APP_DATA_ROOT = previousRoot;
      (fs as any).rmSync(dataRoot, { recursive: true, force: true });
    });

    it('writes the CSS and links the asset on the organization theme', async () => {
      const organization = makeOrganization({ themes: [theme('acme', 'acme-id')] });
      models.Organization.findById.mockResolvedValue(organization);

      await expect(
        service.publishThemeCss(organization._id.toString(), 'acme', '.acme { color: red; }'),
      ).resolves.toBe(true);

      expect(fs.readFileSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'), 'utf-8')).toBe(
        '.acme { color: red; }',
      );
      expect(organization.themes[0].assets).toEqual([
        { id: 'styles', name: 'styles.css', assetType: 'css', url: 'themes/acme/styles.css' },
      ]);
      expect(organization.save).toHaveBeenCalled();
    });

    it('reads back published CSS by theme name', async () => {
      fs.mkdirSync(path.join(dataRoot, 'themes', 'acme'), { recursive: true });
      fs.writeFileSync(path.join(dataRoot, 'themes', 'acme', 'styles.css'), 'body {}', 'utf-8');

      await expect(service.getThemeCss('acme')).resolves.toBe('body {}');
    });

    it('returns an empty string when nothing has been published', async () => {
      await expect(service.getThemeCss('unknown')).resolves.toBe('');
    });
  });
});
