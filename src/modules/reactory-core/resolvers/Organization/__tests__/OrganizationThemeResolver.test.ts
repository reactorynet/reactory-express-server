import { ObjectId } from 'mongodb';
import OrganizationThemeResolver from '../OrganizationThemeResolver';
import OrganizationResolver from '../Organization';
import Organization from '../../../models/Organization';
import { mergeGraphResolver } from '@reactory/server-core/utils';

/**
 * `MergeGraphResolvers` harvests the decorated methods from the class
 * prototype into a plain map, so the tests call the harvested functions the
 * same way the GraphQL layer does.
 */
const harvest = () => {
  const instance: any = Object.create((OrganizationThemeResolver as any).prototype);
  const map = instance.resolver;
  return {
    Query: { ...map.Query },
    Mutation: { ...map.Mutation },
  };
};

const makeContext = (roles: string[]) => {
  const organizationService = {
    saveTheme: jest.fn().mockResolvedValue({ _id: 'org-1', theme: 'acme' }),
    setActiveTheme: jest.fn().mockResolvedValue({ _id: 'org-1', theme: 'acme', themeMode: 'light' }),
    deleteTheme: jest.fn().mockResolvedValue({ _id: 'org-1', theme: null }),
    publishThemeCss: jest.fn().mockResolvedValue(true),
    getThemeCss: jest.fn().mockResolvedValue('.acme {}'),
  };

  const context: any = {
    user: { _id: 'user-1', email: 'operator@reactory.net' },
    hasRole: jest.fn((role: string) => roles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => roles.length > 0),
    getService: jest.fn(() => organizationService),
    log: jest.fn(),
  };

  return { context, organizationService };
};

const theme = { name: 'acme', type: 'material', defaultThemeMode: 'dark', modes: [] as any[] };

describe('OrganizationThemeResolver (ORG-004)', () => {
  it('merges into the core resolver map without clobbering Organization resolvers', () => {
    const merged: any = mergeGraphResolver([OrganizationResolver, OrganizationThemeResolver]);

    expect(merged.Mutation.OrganizationSaveTheme).toBeDefined();
    expect(merged.Mutation.OrganizationSetActiveTheme).toBeDefined();
    expect(merged.Mutation.OrganizationDeleteTheme).toBeDefined();
    expect(merged.Mutation.OrganizationPublishThemeCss).toBeDefined();
    expect(merged.Query.OrganizationThemeCss).toBeDefined();
    expect(merged.Query.CoreOrganization).toBeDefined();
    expect(merged.Mutation.createOrganization).toBeDefined();
    expect(merged.Organization.logoURL).toBeDefined();
  });

  it('exposes the organization theme mutations and CSS query', () => {
    const map = harvest();

    expect(Object.keys(map.Mutation)).toEqual(
      expect.arrayContaining([
        'OrganizationSaveTheme',
        'OrganizationSetActiveTheme',
        'OrganizationDeleteTheme',
        'OrganizationPublishThemeCss',
      ]),
    );
    expect(map.Query.OrganizationThemeCss).toBeDefined();
  });

  describe('role enforcement', () => {
    type MutationCase = [string, Record<string, unknown>, string];
    const denialCases: MutationCase[] = [
      ['OrganizationSaveTheme', { id: 'org-1', theme }, 'saveTheme'],
      ['OrganizationSetActiveTheme', { id: 'org-1', themeName: 'acme' }, 'setActiveTheme'],
      ['OrganizationDeleteTheme', { id: 'org-1', themeName: 'acme' }, 'deleteTheme'],
      ['OrganizationPublishThemeCss', { id: 'org-1', themeName: 'acme', css: 'body {}' }, 'publishThemeCss'],
    ];

    it.each(denialCases)('rejects a USER caller for %s', (mutation, args, serviceMethod) => {
      const map = harvest();
      const { context, organizationService } = makeContext(['USER']);

      // The @roles guard throws synchronously, so the call is wrapped.
      expect(() => map.Mutation[mutation](null, args, context, {})).toThrow(/permissions/i);
      expect((organizationService as any)[serviceMethod]).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', () => {
      const map = harvest();
      const { context } = makeContext([]);
      context.user = null;

      expect(() =>
        map.Mutation.OrganizationSaveTheme(null, { id: 'org-1', theme }, context, {}),
      ).toThrow();
    });

    it.each(['ORGANIZATION_ADMIN', 'ADMIN', 'SYSTEM'])('allows %s to save a theme', async (role) => {
      const map = harvest();
      const { context, organizationService } = makeContext(['USER', role]);

      await map.Mutation.OrganizationSaveTheme(null, { id: 'org-1', theme }, context, {});

      expect(organizationService.saveTheme).toHaveBeenCalledWith('org-1', theme);
    });
  });

  describe('delegation', () => {
    it('passes the theme name and mode to setActiveTheme', async () => {
      const map = harvest();
      const { context, organizationService } = makeContext(['ORGANIZATION_ADMIN']);

      const result = await map.Mutation.OrganizationSetActiveTheme(
        null,
        { id: 'org-1', themeName: 'acme', mode: 'light' },
        context,
        {},
      );

      expect(organizationService.setActiveTheme).toHaveBeenCalledWith('org-1', 'acme', 'light');
      expect(result).toMatchObject({ theme: 'acme', themeMode: 'light' });
    });

    it('delegates deleteTheme', async () => {
      const map = harvest();
      const { context, organizationService } = makeContext(['ADMIN']);

      await map.Mutation.OrganizationDeleteTheme(null, { id: 'org-1', themeName: 'acme' }, context, {});

      expect(organizationService.deleteTheme).toHaveBeenCalledWith('org-1', 'acme');
    });

    it('delegates publishThemeCss with the css payload', async () => {
      const map = harvest();
      const { context, organizationService } = makeContext(['ADMIN']);

      await map.Mutation.OrganizationPublishThemeCss(
        null,
        { id: 'org-1', themeName: 'acme', css: '.acme {}' },
        context,
        {},
      );

      expect(organizationService.publishThemeCss).toHaveBeenCalledWith('org-1', 'acme', '.acme {}');
    });

    it('serves the theme css through the query', async () => {
      const map = harvest();
      const { context, organizationService } = makeContext(['USER']);

      await expect(map.Query.OrganizationThemeCss(null, { themeName: 'acme' }, context, {})).resolves.toBe(
        '.acme {}',
      );
      expect(organizationService.getThemeCss).toHaveBeenCalledWith('acme');
    });

    it('denies the css query to an unauthenticated caller', () => {
      const map = harvest();
      const { context } = makeContext([]);
      context.user = null;

      expect(() => map.Query.OrganizationThemeCss(null, { themeName: 'acme' }, context, {})).toThrow();
    });
  });

  describe('CoreOrganization theme passthrough', () => {
    it('returns the persisted theme and themeMode', async () => {
      const resolver: any = Object.create((OrganizationResolver as any).prototype);
      const organization = {
        _id: new ObjectId(),
        name: 'Acme',
        theme: 'acme',
        themeMode: 'light',
        themes: [theme],
      };
      // Mimics a Mongoose query so both `.then()` and `await` work.
      const query = {
        then: (resolve?: any) =>
          typeof resolve === 'function' ? resolve(organization) : Promise.resolve(organization),
      };
      const findById = jest.spyOn(Organization as any, 'findById').mockReturnValue(query as any);

      try {
        const result: any = await resolver.resolver.Query.CoreOrganization(
          null,
          { id: organization._id.toString() },
          makeContext(['USER']).context,
          {},
        );

        expect(result.theme).toBe('acme');
        expect(result.themeMode).toBe('light');
        expect(result.themes).toEqual([theme]);
      } finally {
        findById.mockRestore();
      }
    });
  });
});
