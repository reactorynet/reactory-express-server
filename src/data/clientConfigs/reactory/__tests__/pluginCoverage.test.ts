/**
 * ORG-041b — the `reactory-client-core` CDN plugin registration is load-bearing.
 *
 * The `reactory` app loads organisation components from two paths at once: the
 * generated submodule import in `reactory-pwa-client/src/components/plugins/__index.ts`
 * (the canonical `reactory-client-core-pwa-plugin`) and this app definition's
 * `plugins` array, which loads a *different*, older bundle
 * (`reactorynet/reactory-client-core-plugin`, built 2026-03-11) at runtime.
 *
 * ORG-041b audited both paths before touching anything. The submodule is NOT a
 * superset: the CDN bundle is the only provider of the entire authentication and
 * user-administration surface, and the seed routes below point straight at it.
 * Deleting the entry would leave `/login`, `/register`, `/logout`, `/forgot` and
 * the OAuth buttons unresolved, and `core.Login@1.0.0` is also a hard boot
 * dependency in `reactory-pwa-client/src/App.tsx`. The registration is retained
 * deliberately; `../readme.md` carries the full coverage table and the list of
 * preconditions for retiring it later.
 *
 * These assertions exist so that the next person who tries to "clean up the
 * stale CDN plugin" is forced to read that evidence first. When the auth surface
 * is genuinely ported, update the constants below *and* the readme in the same
 * commit — that is the deliberate act this file is guarding.
 *
 * Inventory method: the bundle was executed in a browser page with a stubbed
 * `window.reactory.api`, recording every `registerComponent` call (27 FQNs, of
 * which 26 are components and 1 is the plugin marker). The submodule inventory
 * comes from the `components` arrays spread by its `index.ts` (22 FQNs).
 */

import routes from '../routes';

/** Structural view of the config we assert against (subset of IReactoryApplicationPlugin). */
interface IPluginConfig {
  id?: string;
  name?: string;
  nameSpace?: string;
  version?: string;
  enabled?: boolean;
  roles?: string[];
  platform?: string;
  uri?: string;
}

interface IClientConfig {
  key?: string;
  plugins?: IPluginConfig[];
}

interface IRouteConfig {
  key?: string;
  path: string;
  componentFqn?: string;
}

const ROUTES = routes as unknown as IRouteConfig[];

/** The path the CDN serves the plugin bundle from, relative to `CDN_ROOT`. */
const CDN_PLUGIN_PATH = 'plugins/reactory-client-core/lib/reactory.client.core.js';

/**
 * Load the seed config lazily: `index.ts` hard-exits when the application
 * password is absent, so the fallback has to be in place before the module is
 * evaluated (imports are hoisted, hence `require` inside the helper).
 */
const loadConfig = (): IClientConfig => {
  process.env.REACTORY_APPLICATION_PASSWORD =
    process.env.REACTORY_APPLICATION_PASSWORD || 'org-041b-test-password';

  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const loaded = require('../index');

  return (loaded.default ?? loaded) as IClientConfig;
};

/** Everything the CDN bundle registers in `install()`. */
const CDN_FQNS = [
  'reactory-core.ReactoryCoreClientPlugin@1.0.0',
  'reactory-core.ReactoryClientSelector@1.0.0',
  'reactory-core.ReactoryBusinessUnitSelector@1.0.0',
  'reactory-core.EmailTemplateEditor@1.0.0',
  'core.ReactoryOrganizationSelector@1.0.0',
  'core.UserImportForm@1.0.0',
  'core.UserImportButton@1.0.0',
  'core.UserFileImportStatus@1.0.0',
  'core.ReactoryMembershipRoles@1.0.0',
  'core.ReactoryCreateUserMembership@1.0.0',
  'core.UserDemographics@1.0.0',
  'core.ResetPassword@1.0.0',
  'core.UserList@1.0.0',
  'core.Profile@1.0.0',
  'core.UserProfile@1.0.0',
  'core.EditProfile@1.0.0',
  'core.ReactoryUserProfile@1.0.0',
  'core.ReactoryUserProfileGeneral@1.0.0',
  'core.Login@1.0.0',
  'core.Register@1.0.0',
  'core.ForgotPassword@1.0.0',
  'core.Logout@1.0.0',
  'core.TwoFactorAuth@1.0.0',
  'core.GoogleLoginButton@1.0.0',
  'core.MicrosoftLoginButton@1.0.0',
  'core.GitHubLoginButton@1.0.0',
  'core.OktaLoginButton@1.0.0',
];

/** Everything the `reactory-client-core-pwa-plugin` submodule registers. */
const SUBMODULE_FQNS = [
  'core.ContentStatusBadge@1.0.0',
  'core.ContentFormatBadge@1.0.0',
  'core.ContentDetailPanel@1.0.0',
  'core.ContentManagementToolbar@1.0.0',
  'core.ContentEditorDrawer@1.0.0',
  'core.NewContentDialog@1.0.0',
  'core.ContentManagementPage@1.0.0',
  'core.SQLQueryEditor@1.0.0',
  'core.GraphQLEditor@1.0.0',
  'reactory.ApplicationOverviewPanel@1.0.0',
  'reactory.ApplicationSettingsPanel@1.0.0',
  'reactory.ApplicationUsersPanel@1.0.0',
  'reactory.ApplicationOrganizationsPanel@1.0.0',
  'reactory.ApplicationRolesPanel@1.0.0',
  'reactory.ApplicationThemesPanel@1.0.0',
  'reactory.ApplicationStatisticsPanel@1.0.0',
  'reactory.ApplicationRoutesPanel@1.0.0',
  'reactory.ApplicationMenusPanel@1.0.0',
  'reactory.ApplicationFeatureFlagsPanel@1.0.0',
  'reactory.OrganizationListPanel@1.0.0',
  'reactory.OrganizationCreatePage@1.0.0',
  'reactory.OrganizationDetailPanel@1.0.0',
];

/**
 * CDN FQNs the pwa client's own `componentRegistery` also provides as *working*
 * components. Only `core.UserList@1.0.0` qualifies today.
 */
const CLIENT_REGISTRY_WORKING_FQNS = ['core.UserList@1.0.0'];

/**
 * CDN FQNs whose key the client registry *claims*, but with a component that is
 * not usable — so the CDN bundle remains the only real provider.
 *
 * `core.ResetPassword@1.0.0` is registered as
 * `component: () => new Error('Complete core.ResetPassword Migratation to
 * reactory-user plugin')` (`reactory-pwa-client/src/components/index.tsx:551-558`).
 * Resolving the FQN succeeds and then throws on render, so it must not be
 * counted as a provider — a porter trusting the key alone would skip it and
 * ship a `/reset-password` route that throws.
 */
const CLIENT_REGISTRY_PLACEHOLDER_FQNS = ['core.ResetPassword@1.0.0'];

/** Every CDN FQN the client registry answers to, working or not. */
const CLIENT_REGISTRY_FQNS = [
  ...CLIENT_REGISTRY_WORKING_FQNS,
  ...CLIENT_REGISTRY_PLACEHOLDER_FQNS,
];

/** Route targets that have no provider other than the CDN bundle. */
const ROUTE_DEPENDENT_ON_CDN = [
  'core.ForgotPassword@1.0.0',
  'core.GitHubLoginButton@1.0.0',
  'core.GoogleLoginButton@1.0.0',
  'core.Login@1.0.0',
  'core.Logout@1.0.0',
  'core.MicrosoftLoginButton@1.0.0',
  'core.OktaLoginButton@1.0.0',
  'core.Register@1.0.0',
  'core.ResetPassword@1.0.0',
];

/** Organisation management panels, served by the submodule and never by the CDN bundle. */
const ORGANIZATION_PANEL_FQNS = [
  'reactory.OrganizationListPanel@1.0.0',
  'reactory.OrganizationCreatePage@1.0.0',
  'reactory.OrganizationDetailPanel@1.0.0',
];

/**
 * Every component FQN the route table can reach.
 *
 * Not just `componentFqn`: the `/login` route carries its OAuth widgets inside
 * `args[].value.authlist[].component`, so a shallow map would miss half of the
 * auth surface. Walking the whole structure keeps this honest when the config
 * grows another nested component reference.
 */
const FQN_PATTERN = /^[a-z][\w-]*\.[A-Za-z][\w]*@\d+\.\d+\.\d+$/;

const collectFqns = (value: unknown, found: Set<string>): void => {
  if (typeof value === 'string') {
    if (FQN_PATTERN.test(value)) found.add(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectFqns(item, found));
    return;
  }

  if (value !== null && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((nested) =>
      collectFqns(nested, found),
    );
  }
};

const routeFqns = (): string[] => {
  const found = new Set<string>();
  collectFqns(ROUTES, found);
  return Array.from(found);
};

describe('ORG-041b reactory-client-core CDN plugin registration', () => {
  describe('inventory (the evidence the decision rests on)', () => {
    it('has no FQN overlap between the CDN bundle and the submodule plugin', () => {
      const overlap = CDN_FQNS.filter((fqn) => SUBMODULE_FQNS.includes(fqn));

      // If this ever fails, the submodule gained a component the bundle already
      // ships and the retirement analysis has to be redone — that is the point.
      expect(overlap).toEqual([]);
    });

    it('inventories 27 CDN FQNs and 22 submodule FQNs', () => {
      expect(CDN_FQNS).toHaveLength(27);
      expect(new Set(CDN_FQNS).size).toBe(27);
      expect(SUBMODULE_FQNS).toHaveLength(22);
      expect(new Set(SUBMODULE_FQNS).size).toBe(22);
    });

    it('leaves 25 CDN FQNs with no other registration and 26 with no working provider', () => {
      const noOtherRegistration = CDN_FQNS.filter(
        (fqn) => !CLIENT_REGISTRY_FQNS.includes(fqn),
      );
      const noWorkingProvider = CDN_FQNS.filter(
        (fqn) => !CLIENT_REGISTRY_WORKING_FQNS.includes(fqn),
      );

      // 27 − 2 = 25 at FQN level; 27 − 1 = 26 once the throwing placeholder is
      // discounted. The submodule contributes nothing here, which is exactly why
      // the entry cannot go.
      expect(noOtherRegistration).toHaveLength(25);
      expect(noWorkingProvider).toHaveLength(26);
      expect(noWorkingProvider).toContain('core.Login@1.0.0');
      expect(noWorkingProvider).toContain('core.ResetPassword@1.0.0');
      expect(noWorkingProvider).toContain('core.ReactoryOrganizationSelector@1.0.0');
    });

    it('treats the client ResetPassword registration as a placeholder, not a provider', () => {
      // Pin the distinction the coverage table rests on. If the placeholder is
      // ever replaced with a real component, move this FQN to
      // CLIENT_REGISTRY_WORKING_FQNS and update readme.md in the same commit.
      expect(CLIENT_REGISTRY_PLACEHOLDER_FQNS).toEqual(['core.ResetPassword@1.0.0']);
      expect(CLIENT_REGISTRY_WORKING_FQNS).not.toContain('core.ResetPassword@1.0.0');
      expect(CLIENT_REGISTRY_WORKING_FQNS).toEqual(['core.UserList@1.0.0']);
    });

    it('claims no organisation management panel for the CDN bundle', () => {
      ORGANIZATION_PANEL_FQNS.forEach((fqn) => {
        expect(CDN_FQNS).not.toContain(fqn);
        expect(SUBMODULE_FQNS).toContain(fqn);
      });
    });
  });

  describe('the registration is retained', () => {
    it('declares exactly the reactory-client-core plugin', () => {
      const config = loadConfig();

      expect(config.key).toBe('reactory');
      expect(Array.isArray(config.plugins)).toBe(true);
      expect(config.plugins).toHaveLength(1);
      expect(config.plugins?.[0]).toMatchObject({
        id: 'reactory-client-core',
        name: 'reactory-client-core',
        nameSpace: 'core',
        version: '1.0.0',
        enabled: true,
        platform: 'web',
      });
    });

    it('points at the CDN bundle the audit inspected', () => {
      const plugin = loadConfig().plugins?.[0];

      expect(plugin?.uri).toBeDefined();
      expect(plugin?.uri).toContain(CDN_PLUGIN_PATH);
      expect(plugin?.uri).toMatch(/^https?:\/\/.+\/cdn\//);
    });

    it('stays visible to ANON so the login screen can render', () => {
      const plugin = loadConfig().plugins?.[0];

      // `core.Login@1.0.0` is reached from a public route with roles ['ANON'];
      // narrowing this to USER would make the login screen unresolvable.
      expect(plugin?.roles).toEqual(expect.arrayContaining(['USER', 'ANON']));
    });
  });

  describe('routes depend on CDN-only components', () => {
    it('pins the route targets that have no provider other than the CDN bundle', () => {
      const dependent = routeFqns()
        .filter((fqn) => CDN_FQNS.includes(fqn) && !CLIENT_REGISTRY_WORKING_FQNS.includes(fqn))
        .sort();

      // Removing the plugin entry without porting these first breaks the app's
      // entry points. Update this list only as part of that porting work.
      expect(dependent).toEqual(ROUTE_DEPENDENT_ON_CDN);
    });

    it('still resolves the auth routes against the CDN bundle', () => {
      const byKey = (key: string) => ROUTES.find((route) => route.key === key)?.componentFqn;

      expect(byKey('login')).toBe('core.Login@1.0.0');
      // `/login` args authlist is covered by the OAuth assertion below.
      expect(byKey('register')).toBe('core.Register@1.0.0');
      expect(byKey('logout')).toBe('core.Logout@1.0.0');
      expect(byKey('forgot-password')).toBe('core.ForgotPassword@1.0.0');
      // The CDN bundle is the only *working* provider of ResetPassword — the
      // client registry claims the key with a throwing placeholder.
      expect(byKey('reset-password')).toBe('core.ResetPassword@1.0.0');
    });

    it('routes the OAuth buttons through the CDN bundle', () => {
      const login = ROUTES.find((route) => route.key === 'login') as
        | (IRouteConfig & { args?: Array<{ key: string; value: Record<string, unknown> }> })
        | undefined;
      const authlist = login?.args?.find((arg) => arg.key === 'authlist')?.value
        ?.authlist as Array<{ component?: string }> | undefined;

      expect(Array.isArray(authlist)).toBe(true);

      const providers = (authlist || [])
        .filter((entry) => typeof entry.component === 'string')
        .map((entry) => entry.component as string)
        .sort();

      expect(providers).toEqual([
        'core.GitHubLoginButton@1.0.0',
        'core.GoogleLoginButton@1.0.0',
        'core.MicrosoftLoginButton@1.0.0',
        'core.OktaLoginButton@1.0.0',
      ]);
    });
  });

  describe('organisation panels stay on the submodule path', () => {
    it('routes /organizations/manage* to submodule-provided panels', () => {
      const route = (key: string) => ROUTES.find((item) => item.key === key);

      expect(route('organizations-manage')?.componentFqn).toBe(ORGANIZATION_PANEL_FQNS[0]);
      expect(route('organizations-manage-create')?.componentFqn).toBe(ORGANIZATION_PANEL_FQNS[1]);
      expect(route('organizations-manage-detail')?.componentFqn).toBe(ORGANIZATION_PANEL_FQNS[2]);
    });

    it('keeps the legacy /organizations/ route on the submodule panel (ORG-042 owns removal)', () => {
      const legacy = ROUTES.find((route) => route.key === 'organizations');

      expect(legacy?.path).toBe('/organizations/');
      expect(legacy?.componentFqn).toBe('reactory.ApplicationOrganizationsPanel@1.0.0');
    });
  });
});
