/**
 * The email-template editor must be REACHABLE, not merely routable.
 *
 * WP-2 shipped `communicator-templates` (/communicator/templates ->
 * `communicator.EmailTemplates@1.0.0`) and WP-3 built the editor behind it, but
 * no menu entry was ever added. The page therefore had no entry point: it could
 * only be opened by typing the URL, and from the UI the whole editing surface
 * was invisible. A route that nothing links to is indistinguishable from a
 * missing feature to the person using it.
 *
 * These assertions pin the connection between the three moving parts:
 *
 *   menu entry  ->  route path  ->  component FQN
 *
 * They deliberately do NOT assert a general "every menu link resolves" rule:
 * `/data/` has been a menu link with no exact route since before this change,
 * and broadening the test to cover it would have meant either failing on
 * pre-existing config or encoding that quirk as expected. The scope here is the
 * defect that actually happened.
 */

import menus from '../menus';
import routes from '../routes';

interface IMenuEntryConfig {
  ordinal?: number;
  title?: string;
  link?: string;
  icon?: string;
  roles?: string[];
  enabled?: boolean;
  items?: IMenuEntryConfig[];
}

interface IMenuConfig {
  key?: string;
  name?: string;
  target?: string;
  roles?: string[];
  entries?: IMenuEntryConfig[];
}

interface IRouteConfig {
  key?: string;
  title?: string;
  path: string;
  public?: boolean;
  exact?: boolean;
  roles?: string[];
  componentFqn?: string;
}

const MENUS = menus as unknown as IMenuConfig[];
const ROUTES = routes as unknown as IRouteConfig[];

const ROUTE_KEY = 'communicator-templates';
const ROUTE_PATH = '/communicator/templates';
const COMPONENT_FQN = 'communicator.EmailTemplates@1.0.0';

const leftNav = (): IMenuConfig => {
  const menu = MENUS.find((candidate) => candidate.key === 'left-nav');
  if (!menu) throw new Error('the reactory client declares no left-nav menu');
  return menu;
};

/** Top-level entries only — a group child would not be reachable from the rail. */
const topLevelEntries = (): IMenuEntryConfig[] => leftNav().entries || [];

const emailTemplateEntry = (): IMenuEntryConfig => {
  const entry = topLevelEntries().find((candidate) => candidate.link === ROUTE_PATH);
  if (!entry) {
    throw new Error(
      `left-nav has no entry for ${ROUTE_PATH}. The editor is routable but unreachable: ` +
        'restore the menu entry rather than opening the URL by hand.',
    );
  }
  return entry;
};

const communicatorRoute = (): IRouteConfig => {
  const route = ROUTES.find((candidate) => candidate.path === ROUTE_PATH);
  if (!route) throw new Error(`no route is declared for ${ROUTE_PATH}`);
  return route;
};

describe('email templates menu entry', () => {
  describe('the editor has an entry point', () => {
    it('declares exactly one left-nav entry for the template editor', () => {
      const matches = topLevelEntries().filter((entry) => entry.link === ROUTE_PATH);
      expect(matches).toHaveLength(1);
    });

    it('is a top-level entry, not nested inside a group', () => {
      // A nested entry only renders after its parent is expanded, so it would
      // reintroduce the same "cannot find it" symptom in a subtler form.
      const nested = topLevelEntries().flatMap((entry) => entry.items || []);
      expect(nested.some((entry) => entry.link === ROUTE_PATH)).toBe(false);
      expect(emailTemplateEntry()).toBeDefined();
    });

    it('is enabled and has a positive ordinal so the menu sorts it', () => {
      const entry = emailTemplateEntry();
      expect(entry.enabled).not.toBe(false);
      expect(typeof entry.ordinal).toBe('number');
      expect(entry.ordinal as number).toBeGreaterThan(0);
    });

    it('carries an icon, so the rail renders a labelled destination', () => {
      expect(emailTemplateEntry().icon).toBe('mail');
    });

    it('uses an i18n key for its label, not a hardcoded string', () => {
      const title = emailTemplateEntry().title;
      expect(title).toBe('reactory:reactory.menu.email-templates');
      expect(title).toMatch(/^reactory:/);
    });
  });

  describe('the entry and the route agree', () => {
    it('points at a route the client config actually declares', () => {
      const route = communicatorRoute();
      expect(route.key).toBe(ROUTE_KEY);
    });

    it('routes to the component the plugin registers', () => {
      // `communicator.EmailTemplates@1.0.0` is contributed by the
      // reactory-communicator plugin (email-templates/index.ts). If the FQN
      // here drifts, the route resolves to nothing and the page renders empty.
      expect(communicatorRoute().componentFqn).toBe(COMPONENT_FQN);
    });

    it('gates the menu entry on exactly the roles the route gates on', () => {
      // Equal sets, not a subset: an entry with fewer roles is visible to
      // someone the route will refuse, and an entry with more is unreachable
      // for someone who is allowed.
      const entryRoles = new Set(emailTemplateEntry().roles || []);
      const routeRoles = new Set(communicatorRoute().roles || []);
      expect(Array.from(entryRoles).sort()).toEqual(Array.from(routeRoles).sort());
    });

    it('is not public and is matched exactly, like the route', () => {
      const route = communicatorRoute();
      expect(route.public).toBe(false);
      expect(route.exact).toBe(true);
    });
  });

  describe('discoverability is not achieved by loosening access', () => {
    it('still requires a communicator role or ADMIN', () => {
      const roles = communicatorRoute().roles || [];
      expect(roles).toEqual(
        expect.arrayContaining(['COMMUNICATOR_TEMPLATE_VIEW', 'COMMUNICATOR_TEMPLATE_ADMIN', 'ADMIN']),
      );
      expect(roles).not.toContain('ANON');
      expect(roles).not.toContain('USER');
    });
  });
});
