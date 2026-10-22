/**
 * ORG-015 — entry points for the organization management surface.
 *
 * `reactory.OrganizationListPanel@1.0.0`, `reactory.OrganizationCreatePage@1.0.0`
 * and `reactory.OrganizationDetailPanel@1.0.0` were merged (ORG-010/011/013) but
 * nothing routed to them, so only the legacy `reactory.ApplicationOrganizationsPanel`
 * was reachable. These tests pin the wiring:
 *
 *   - the three new routes exist with the exact path / FQN / roles / exact flag;
 *   - no duplicate `key` and no duplicate `path` + `exact` combination was
 *     introduced anywhere in the seed config;
 *   - the legacy `organizations` route is *unchanged* (a guard against an
 *     accidental ORG-042 landing here);
 *   - the left-nav entry exists and is ADMIN-only;
 *   - `/organizations/manage/create` wins over `/organizations/manage/:id`.
 *
 * The routing config is authoritative at seed time: `synchronizeRoutes`
 * (models/ReactoryClient/statics.ts) removes stored routes that are absent here,
 * so a dropped route disappears from the running application for real. That is
 * why the "nothing else moved" assertions below matter as much as the new ones.
 */

import routes from '../routes';
import mainMenu from '../menus/main';

/** Structural view of the config we assert against (subset of IReactoryRoute). */
interface IRouteConfig {
  key?: string;
  title?: string;
  path: string;
  exact?: boolean;
  public?: boolean;
  roles?: string[];
  componentFqn?: string;
  componentProps?: Record<string, unknown>;
  redirect?: string;
}

interface IMenuEntry {
  ordinal?: number;
  title?: string;
  link?: string;
  icon?: string;
  roles?: string[];
  items?: IMenuEntry[];
}

const ROUTES = routes as unknown as IRouteConfig[];
const MENU_ENTRIES = ((mainMenu as unknown as { entries: IMenuEntry[] }).entries || []) as IMenuEntry[];

const findRoute = (key: string): IRouteConfig | undefined => ROUTES.find((route) => route.key === key);

/** Flatten a menu tree so nested entries are covered by the same assertions. */
const flattenMenu = (entries: IMenuEntry[]): IMenuEntry[] =>
  entries.reduce<IMenuEntry[]>(
    (all, entry) => all.concat(entry, flattenMenu(entry.items || [])),
    [],
  );

// ---------------------------------------------------------------------------
// Route matching model
//
// The client's router is React Router. These helpers model only what this file
// depends on: `exact` decides whole-path vs prefix matching, `:param` captures a
// segment, and a static segment ranks above a dynamic one. They let the tests
// assert the *resolution outcome* instead of restating the declaration order.
// ---------------------------------------------------------------------------

const segmentsOf = (value: string): string[] =>
  value.split('/').filter((segment) => segment.length > 0);

interface IRouteMatch {
  route: IRouteConfig;
  index: number;
  params: Record<string, string>;
}

const matchRoute = (route: IRouteConfig, pathname: string): Record<string, string> | null => {
  const patternSegments = segmentsOf(route.path);
  const pathSegments = segmentsOf(pathname);

  if (route.exact) {
    if (pathSegments.length !== patternSegments.length) return null;
  } else if (pathSegments.length < patternSegments.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let index = 0; index < patternSegments.length; index += 1) {
    const pattern = patternSegments[index];
    const actual = pathSegments[index];

    if (pattern.startsWith(':')) {
      params[pattern.slice(1)] = decodeURIComponent(actual);
      continue;
    }

    if (pattern !== actual) return null;
  }

  return params;
};

/**
 * React Router ranks a candidate path segment by segment (static 10, dynamic 3);
 * a higher score wins regardless of declaration order.
 */
const rankOf = (route: IRouteConfig): number[] =>
  segmentsOf(route.path).map((segment) => {
    if (segment.startsWith(':')) return 3;
    if (segment === '*') return 1;
    return 10;
  });

const compareRank = (left: number[], right: number[]): number => {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index] ?? 0;
    const b = right[index] ?? 0;
    if (a !== b) return a - b;
  }
  return 0;
};

const resolve = (pathname: string): IRouteMatch | null => {
  const matches: IRouteMatch[] = [];

  ROUTES.forEach((route, index) => {
    const params = matchRoute(route, pathname);
    if (params) matches.push({ route, index, params });
  });

  if (matches.length === 0) return null;

  return matches.reduce((best, candidate) => {
    const compared = compareRank(rankOf(candidate.route), rankOf(best.route));
    if (compared > 0) return candidate;
    // Equal rank: the earlier declaration wins, as with an ordered route table.
    if (compared === 0 && candidate.index < best.index) return candidate;
    return best;
  });
};

/** First match in declaration order — proves order alone already picks /create. */
const resolveByDeclarationOrder = (pathname: string): IRouteMatch | null => {
  for (let index = 0; index < ROUTES.length; index += 1) {
    const params = matchRoute(ROUTES[index], pathname);
    if (params) return { route: ROUTES[index], index, params };
  }
  return null;
};

describe('ORG-015 organization management routes', () => {
  describe('route definitions', () => {
    it('routes /organizations/manage/ to the organization list panel', () => {
      const route = findRoute('organizations-manage') as IRouteConfig | undefined;

      expect(route).toMatchObject({
        key: 'organizations-manage',
        title: 'Manage Organizations',
        path: '/organizations/manage/',
        exact: true,
        public: false,
        roles: ['ADMIN'],
        componentFqn: 'reactory.OrganizationListPanel@1.0.0',
      });
      expect(route?.roles).toEqual(['ADMIN']);
      expect(route?.public).toBe(false);
    });

    it('routes /organizations/manage/create to the create page', () => {
      const route = findRoute('organizations-manage-create') as IRouteConfig | undefined;

      expect(route).toMatchObject({
        key: 'organizations-manage-create',
        title: 'Create Organization',
        path: '/organizations/manage/create',
        exact: true,
        public: false,
        roles: ['ADMIN'],
        componentFqn: 'reactory.OrganizationCreatePage@1.0.0',
      });
      expect(route?.roles).toEqual(['ADMIN']);
      expect(route?.public).toBe(false);
    });

    it('routes /organizations/manage/:id to the detail panel and passes the route id', () => {
      const route = findRoute('organizations-manage-detail') as IRouteConfig | undefined;

      expect(route).toMatchObject({
        key: 'organizations-manage-detail',
        title: 'Organization',
        path: '/organizations/manage/:id',
        exact: false,
        public: false,
        roles: ['ADMIN'],
        componentFqn: 'reactory.OrganizationDetailPanel@1.0.0',
      });
      expect(route?.roles).toEqual(['ADMIN']);
      expect(route?.public).toBe(false);
      // `OrganizationDetailPanel` documents `id` as the route argument; the
      // substitution form must match the other routes in this file exactly.
      expect(route?.componentProps).toEqual({ id: '${route.id}' });
    });

    it('uses the same ${route.x} substitution form as the existing detail routes', () => {
      const detail = findRoute('organizations-manage-detail');
      const templates = ROUTES.filter((route) =>
        JSON.stringify(route.componentProps || {}).includes('${route.'),
      ).map((route) => route.key);

      expect(JSON.stringify(detail?.componentProps)).toBe('{"id":"${route.id}"}');
      expect(templates).toContain('organizations-manage-detail');
      expect(templates).toContain('reactor-project-detail');
    });
  });

  describe('config integrity', () => {
    it('has no duplicate route keys', () => {
      const keys = ROUTES.map((route) => route.key).filter((key): key is string => Boolean(key));
      const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);

      expect(duplicates).toEqual([]);
    });

    it('introduces no duplicate path + exact combination', () => {
      const seen = new Map<string, string | undefined>();
      const duplicates: string[] = [];

      ROUTES.forEach((route) => {
        const signature = `${route.path}::${Boolean(route.exact)}`;
        if (seen.has(signature)) {
          duplicates.push(signature);
        } else {
          seen.set(signature, route.key);
        }
      });

      // `/::true` is pre-existing on master and deliberate: home_authenticated
      // (roles USER) and home_guest (roles ANON) share `/` and are separated by
      // role rather than path. ORG-015 must not add to this list — if the
      // expected array below changes, a new collision was introduced.
      expect(duplicates).toEqual(['/::true']);
    });

    it('keeps exactly the four organization routes, each with a distinct path and key', () => {
      const organizationRoutes = ROUTES.filter((route) =>
        (route.path || '').startsWith('/organizations'),
      );

      expect(organizationRoutes.map((route) => route.key).sort()).toEqual([
        'organizations',
        'organizations-manage',
        'organizations-manage-create',
        'organizations-manage-detail',
      ]);
    });
  });

  describe('legacy organizations route (ORG-042 is not in scope)', () => {
    it('is still present and unchanged', () => {
      const legacy = findRoute('organizations') as IRouteConfig | undefined;

      expect(legacy).toEqual({
        key: 'organizations',
        title: 'Organizations List',
        path: '/organizations/',
        exact: true,
        public: true,
        roles: ['ADMIN'],
        componentFqn: 'reactory.ApplicationOrganizationsPanel@1.0.0',
      });
    });

    it('was not turned into a redirect to the new surface', () => {
      const legacy = findRoute('organizations');

      expect(legacy).toBeDefined();
      expect(legacy?.redirect).toBeUndefined();
      expect(legacy?.componentFqn).toBe('reactory.ApplicationOrganizationsPanel@1.0.0');
    });

    it('still resolves /organizations/ to the legacy panel', () => {
      const match = resolve('/organizations/');

      expect(match).not.toBeNull();
      expect(match?.route.key).toBe('organizations');
      expect(match?.route.componentFqn).toBe('reactory.ApplicationOrganizationsPanel@1.0.0');
    });
  });

  describe('route resolution', () => {
    it('resolves /organizations/manage/ to the new list panel, not the legacy panel', () => {
      const match = resolve('/organizations/manage/');

      expect(match?.route.key).toBe('organizations-manage');
      expect(match?.route.componentFqn).toBe('reactory.OrganizationListPanel@1.0.0');
    });

    it('resolves /organizations/manage/create to the create page, ahead of the :id route', () => {
      const match = resolve('/organizations/manage/create');

      expect(match).not.toBeNull();
      expect(match?.route.key).toBe('organizations-manage-create');
      expect(match?.route.componentFqn).toBe('reactory.OrganizationCreatePage@1.0.0');
      expect(match?.params).toEqual({});
    });

    it('declares the static create route before the dynamic :id route', () => {
      const createIndex = ROUTES.findIndex((route) => route.key === 'organizations-manage-create');
      const detailIndex = ROUTES.findIndex((route) => route.key === 'organizations-manage-detail');

      expect(createIndex).toBeGreaterThanOrEqual(0);
      expect(detailIndex).toBeGreaterThanOrEqual(0);
      expect(createIndex).toBeLessThan(detailIndex);
    });

    it('resolves /organizations/manage/create correctly under plain declaration order too', () => {
      // Belt and braces: if the consuming router were order-sensitive rather
      // than rank-aware, declaration order must already pick the static route.
      const match = resolveByDeclarationOrder('/organizations/manage/create');

      expect(match?.route.key).toBe('organizations-manage-create');
    });

    it('resolves /organizations/manage/:id and captures the organization id', () => {
      const match = resolve('/organizations/manage/64f0a1b2c3d4e5f60718293a');

      expect(match?.route.key).toBe('organizations-manage-detail');
      expect(match?.params).toEqual({ id: '64f0a1b2c3d4e5f60718293a' });
    });

    it('does not let the detail route swallow the list route', () => {
      // `/organizations/manage/` must not be matched by the `:id` route.
      const detail = findRoute('organizations-manage-detail') as IRouteConfig;

      expect(matchRoute(detail, '/organizations/manage/')).toBeNull();
    });
  });

  describe('navigation entry', () => {
    it('adds an ADMIN-only left-nav entry for /organizations/manage', () => {
      const entry = flattenMenu(MENU_ENTRIES).find((item) => item.link === '/organizations/manage');

      expect(entry).toBeDefined();
      expect(entry?.roles).toEqual(['ADMIN']);
      expect(entry?.icon).toBe('manage_accounts');
    });

    it('uses an i18n key rather than a literal title', () => {
      const entry = flattenMenu(MENU_ENTRIES).find((item) => item.link === '/organizations/manage');

      expect(entry?.title).toBe('reactory:reactory.menu.organizations-manage');
      expect(entry?.title).toMatch(/^reactory:reactory\.menu\./);
    });

    it('keeps the legacy /organizations/ menu entry untouched', () => {
      const legacy = MENU_ENTRIES.find((item) => item.link === '/organizations/');

      expect(legacy).toEqual({
        ordinal: 7,
        title: 'reactory:reactory.menu.organizations',
        link: '/organizations/',
        icon: 'business',
        roles: ['USER'],
      });
    });

    it('links only to organization paths that resolve to a route', () => {
      const menuLinks = flattenMenu(MENU_ENTRIES)
        .map((item) => item.link)
        .filter((link): link is string => typeof link === 'string' && link.startsWith('/organizations'));

      expect(menuLinks.length).toBeGreaterThan(0);

      menuLinks.forEach((link) => {
        expect(resolve(link)).not.toBeNull();
      });
    });
  });
});
