import mongoose from 'mongoose';
import Organization, { ORGANIZATION_STATUSES, ORGANIZATION_THEME_MODES } from '../Organization';
import Team from '../Team';
import BusinessUnit from '../BusinessUnit';
import {
  ModelDefinitions,
  Demographic,
  AgeDemographic,
  OrganizationDemographicSettings,
} from '../index';

const objectId = (): mongoose.Types.ObjectId => new mongoose.Types.ObjectId();

type SchemaIndex = [Record<string, 1 | -1>, { unique?: boolean }];

/**
 * Mongoose 7 types `Schema#indexes()` as a flat record even though it returns
 * `[fields, options]` tuples at runtime. A JSON round-trip gives us the real
 * runtime shape without an `any` cast.
 */
const schemaIndexes = <T>(model: mongoose.Model<T>): SchemaIndex[] =>
  JSON.parse(JSON.stringify(model.schema.indexes()));

const indexKeys = <T>(model: mongoose.Model<T>): string[] =>
  schemaIndexes(model).map(([fields]) => JSON.stringify(fields));

const indexFor = <T>(model: mongoose.Model<T>, fields: Record<string, 1 | -1>) => {
  const wanted = JSON.stringify(fields);
  return schemaIndexes(model).find(([indexFields]) => JSON.stringify(indexFields) === wanted);
};

describe('Organization model (ORG-001)', () => {
  it('round-trips identity, lifecycle, branding and audit fields', () => {
    const createdBy = objectId();
    const updatedBy = objectId();
    const theme: Record<string, unknown> = {
      id: 'acme-theme',
      name: 'Acme Theme',
      type: 'material',
      defaultThemeMode: 'dark',
      modes: [],
      assets: [],
    };

    const doc = new Organization({
      name: 'Acme',
      code: 'ACME',
      tradingName: 'Acme Trading',
      legalName: 'Acme Holdings (Pty) Ltd',
      description: 'A test organization',
      website: 'https://acme.example',
      contactEmail: 'ops@acme.example',
      contactPhone: '+27 11 000 0000',
      status: 'suspended',
      deleted: true,
      theme: 'acme-theme',
      themeMode: 'os',
      themes: [theme],
      createdBy,
      updatedBy,
    });

    expect(doc.validateSync()).toBeUndefined();

    const plain = JSON.parse(JSON.stringify(doc.toObject()));

    expect(plain.legalName).toBe('Acme Holdings (Pty) Ltd');
    expect(plain.description).toBe('A test organization');
    expect(plain.website).toBe('https://acme.example');
    expect(plain.contactEmail).toBe('ops@acme.example');
    expect(plain.contactPhone).toBe('+27 11 000 0000');
    expect(plain.status).toBe('suspended');
    expect(plain.deleted).toBe(true);
    expect(plain.theme).toBe('acme-theme');
    expect(plain.themeMode).toBe('os');
    expect(plain.themes).toHaveLength(1);
    expect(plain.themes[0].name).toBe('Acme Theme');
    // Mixed content is preserved verbatim (mirrors ReactoryClient.themes).
    expect(plain.themes[0].modes).toEqual([]);
    expect(String(plain.createdBy)).toBe(String(createdBy));
    expect(String(plain.updatedBy)).toBe(String(updatedBy));

    // Values survive re-hydration from the persisted representation.
    const rehydrated = new Organization(plain);
    expect(rehydrated.get('legalName')).toBe('Acme Holdings (Pty) Ltd');
    expect(rehydrated.get('description')).toBe('A test organization');
    expect(rehydrated.get('website')).toBe('https://acme.example');
    expect(rehydrated.get('contactEmail')).toBe('ops@acme.example');
    expect(rehydrated.get('contactPhone')).toBe('+27 11 000 0000');
    expect(rehydrated.get('theme')).toBe('acme-theme');
    expect(rehydrated.get('themes')[0].id).toBe('acme-theme');
  });

  it('applies lifecycle and branding defaults for documents that omit them', () => {
    const doc = new Organization({ name: 'Defaults Org' });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('status')).toBe('active');
    expect(doc.get('deleted')).toBe(false);
    expect(doc.get('themeMode')).toBe('dark');

    expect(ORGANIZATION_STATUSES).toEqual(['active', 'suspended', 'archived']);
    expect(ORGANIZATION_THEME_MODES).toEqual(['light', 'dark', 'os']);
  });

  it('loads a legacy-shaped document without the new fields', () => {
    const doc = new Organization({
      code: 'LEGACY',
      name: 'Legacy Org',
      tradingName: 'Legacy',
      logo: 'legacy.png',
      avatar: 'legacy-avatar.png',
      clients: { active: ['mores'], denied: [] },
      legacyId: '42',
      updateBy: objectId(),
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('status')).toBe('active');
    expect(doc.get('deleted')).toBe(false);
  });

  it('rejects an invalid lifecycle status', () => {
    const doc = new Organization({ name: 'Bad Status', status: 'retired' });
    const validationError = doc.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError.message).toContain('status');
  });

  it('declares the organization lookup indexes', () => {
    const keys = indexKeys(Organization);

    expect(keys).toContain(JSON.stringify({ name: 1 }));
    expect(keys).toContain(JSON.stringify({ code: 1 }));
    expect(keys).toContain(JSON.stringify({ status: 1 }));
    expect(keys).toContain(JSON.stringify({ deleted: 1 }));
    expect(keys).toContain(JSON.stringify({ 'clients.active': 1, code: 1 }));

    // The compound clients/code index must not be unique: legacy documents
    // without a code would all collide on the same null key.
    const compound = indexFor(Organization, { 'clients.active': 1, code: 1 });
    expect(compound).toBeDefined();
    expect(compound[1].unique).not.toBe(true);
  });
});

describe('Team model (ORG-001)', () => {
  it('round-trips description, avatar and business unit', () => {
    const organization = objectId();
    const businessUnit = objectId();
    const owner = objectId();
    const member = objectId();

    const doc = new Team({
      title: 'Platform',
      description: 'Platform engineering team',
      avatar: 'platform.png',
      organization,
      businessUnit,
      owner,
      members: [member],
    });

    expect(doc.validateSync()).toBeUndefined();
    expect(doc.get('name')).toBe('Platform');

    const plain = JSON.parse(JSON.stringify(doc.toObject()));

    expect(plain.description).toBe('Platform engineering team');
    expect(plain.avatar).toBe('platform.png');
    expect(String(plain.businessUnit)).toBe(String(businessUnit));
    expect(String(plain.organization)).toBe(String(organization));
    expect(String(plain.owner)).toBe(String(owner));
    expect(plain.members).toHaveLength(1);

    const rehydrated = new Team(plain);
    expect(rehydrated.get('description')).toBe('Platform engineering team');
    expect(rehydrated.get('avatar')).toBe('platform.png');
    expect(String(rehydrated.get('businessUnit'))).toBe(String(businessUnit));
  });

  it('declares the team lookup indexes', () => {
    const keys = indexKeys(Team);

    expect(keys).toContain(JSON.stringify({ organization: 1 }));
    expect(keys).toContain(JSON.stringify({ businessUnit: 1 }));
    expect(keys).toContain(JSON.stringify({ deleted: 1 }));
  });
});

describe('BusinessUnit model (ORG-001)', () => {
  it('round-trips audit fields and retains lifecycle fields', () => {
    const organization = objectId();
    const createdBy = objectId();
    const updatedBy = objectId();

    const doc = new BusinessUnit({
      name: 'Engineering',
      description: 'Engineering unit',
      avatar: 'engineering.png',
      organization,
      createdBy,
      updatedBy,
    });

    expect(doc.validateSync()).toBeUndefined();

    const plain = JSON.parse(JSON.stringify(doc.toObject()));

    expect(plain.description).toBe('Engineering unit');
    expect(plain.avatar).toBe('engineering.png');
    expect(plain.deleted).toBe(false);
    expect(String(plain.createdBy)).toBe(String(createdBy));
    expect(String(plain.updatedBy)).toBe(String(updatedBy));

    const rehydrated = new BusinessUnit(plain);
    expect(String(rehydrated.get('createdBy'))).toBe(String(createdBy));
    expect(String(rehydrated.get('updatedBy'))).toBe(String(updatedBy));
  });

  it('declares the organization + deleted compound index', () => {
    expect(indexKeys(BusinessUnit)).toContain(JSON.stringify({ organization: 1, deleted: 1 }));
  });
});

describe('Demographics model registration (ORG-001)', () => {
  it('registers Demographic, AgeDemographic and OrganizationDemographicSettings', () => {
    const registered = new Map(ModelDefinitions.map((definition) => [definition.name, definition]));

    const demographic = registered.get('Demographic');
    expect(demographic).toBeDefined();
    expect(demographic.component).toBe(Demographic);
    expect(demographic.stem).toBe('demographic');
    expect(demographic.nameSpace).toBe('core');
    expect(demographic.tags).toContain('demographic');

    const ageDemographic = registered.get('AgeDemographic');
    expect(ageDemographic).toBeDefined();
    expect(ageDemographic.component).toBe(AgeDemographic);
    expect(ageDemographic.stem).toBe('age-demographic');

    const settings = registered.get('OrganizationDemographicSettings');
    expect(settings).toBeDefined();
    expect(settings.component).toBe(OrganizationDemographicSettings);
    expect(settings.stem).toBe('organization-demographic-settings');
  });

  it('declares the demographic indexes', () => {
    const demographicCompound = indexFor(Demographic, { organization: 1, type: 1, key: 1 });
    expect(demographicCompound).toBeDefined();
    expect(demographicCompound[1].unique).toBe(true);
    expect(indexKeys(Demographic)).toContain(JSON.stringify({ deleted: 1 }));

    const settingsOrganization = indexFor(OrganizationDemographicSettings, { organization: 1 });
    expect(settingsOrganization).toBeDefined();
    expect(settingsOrganization[1].unique).toBe(true);
  });
});

describe('Organization.setSetting (ORG-002)', () => {
  it('writes the first setting when settings is empty', () => {
    const doc: any = new Organization({ name: 'First Setting Org' });

    expect(doc.settings).toHaveLength(0);

    const setting = doc.setSetting(
      'color',
      { primary: '#002244', secondary: '#002244' },
      'core.MaterialThemeColorPicker'
    );

    expect(setting).toBeDefined();
    expect(doc.settings).toHaveLength(1);

    const stored = doc.getSetting('color');
    expect(stored).toBeDefined();
    expect(stored.data).toEqual({ primary: '#002244', secondary: '#002244' });
    expect(stored.componentFqn).toBe('core.MaterialThemeColorPicker');
  });

  it('writes the first setting when the settings path is unset', () => {
    const doc: any = new Organization({ name: 'Unset Settings Org' });
    // Reproduces a legacy document loaded without a settings array.
    (doc as any).settings = undefined;

    doc.setSetting('branding', { accent: '#ff0000' }, 'core.BrandingEditor');

    expect(doc.settings).toHaveLength(1);
    expect(doc.getSetting('branding').data).toEqual({ accent: '#ff0000' });
  });

  it('updates an existing setting instead of appending a duplicate', () => {
    const doc: any = new Organization({ name: 'Update Setting Org' });

    doc.setSetting('color', { primary: '#111111' }, 'core.MaterialThemeColorPicker');
    const updated = doc.setSetting('color', { primary: '#222222' }, 'core.MaterialThemeColorPicker');

    expect(doc.settings).toHaveLength(1);
    expect(updated.data).toEqual({ primary: '#222222' });
    expect(doc.getSetting('color').data).toEqual({ primary: '#222222' });
  });

  it('retains the existing componentFqn when the update omits one', () => {
    const doc: any = new Organization({ name: 'Component Fqn Org' });

    doc.setSetting('color', { primary: '#111111' }, 'core.MaterialThemeColorPicker');
    doc.setSetting('color', { primary: '#333333' }, undefined);

    expect(doc.getSetting('color').data).toEqual({ primary: '#333333' });
    expect(doc.getSetting('color').componentFqn).toBe('core.MaterialThemeColorPicker');
  });

  it('adds a second setting while keeping the first', () => {
    const doc: any = new Organization({ name: 'Two Settings Org' });

    doc.setSetting('color', { primary: '#111111' }, 'core.MaterialThemeColorPicker');
    doc.setSetting('branding', { accent: '#00ff00' }, 'core.BrandingEditor');

    expect(doc.settings).toHaveLength(2);
    expect(doc.getSetting('color').data).toEqual({ primary: '#111111' });
    expect(doc.getSetting('branding').data).toEqual({ accent: '#00ff00' });
  });

  it('returns the stored subdocument so callers can read it back immediately', () => {
    const doc: any = new Organization({ name: 'Return Value Org' });
    const returned = doc.setSetting('features', { enabled: true }, 'core.FeatureFlags');

    expect(returned.name).toBe('features');
    expect(JSON.parse(JSON.stringify(returned.data))).toEqual({ enabled: true });
  });
});