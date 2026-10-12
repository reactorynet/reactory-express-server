import ReactoryMenuResolver from '../MenuResolver';

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

/**
 * Mirrors how the graph registry harvests resolvers: an object is created from
 * the class prototype (constructor never runs) and the decorator-built map is
 * spread into a shared root. Invoking the harvested function therefore
 * reproduces the real call shape, with `this` detached from the class.
 */
const harvest = () => {
  const instance: any = Object.create((ReactoryMenuResolver as any).prototype);
  const map = instance.resolver;
  return {
    Menu: { ...(map.Menu || {}) },
    MenuItem: { ...(map.MenuItem || {}) },
  };
};

/**
 * The `@roles` decorator runs before the resolver body and calls
 * `context.hasRole`, so every stub context needs it.
 */
const makeContext = (translate?: jest.Mock): any => ({
  hasRole: jest.fn().mockReturnValue(true),
  i18n: { t: translate || jest.fn((key: string) => key) },
});

describe('MenuResolver menu item title', () => {
  it('returns the stored title unresolved so the client can translate it', async () => {
    const { MenuItem } = harvest();
    const translate = jest.fn((key: string) => `translated:${key}`);
    const context = makeContext(translate);

    const result = await MenuItem.title(
      { title: 'reactory:reactory.menu.myapplications' },
      {},
      context
    );

    expect(result).toBe('reactory:reactory.menu.myapplications');
  });

  it('does not consult the process-wide i18n instance', async () => {
    const { MenuItem } = harvest();
    const translate = jest.fn(() => 'My Applications');
    const context = makeContext(translate);

    await MenuItem.title({ title: 'reactory:reactory.menu.myapplications' }, {}, context);

    // Translating here pinned menus to whichever locale the shared instance
    // happened to hold, and discarded the key the client needs.
    expect(translate).not.toHaveBeenCalled();
  });

  it('returns a namespaced key untouched', async () => {
    const { MenuItem } = harvest();

    await expect(
      MenuItem.title({ title: 'booktutor:reactory.menu.home' }, {}, makeContext())
    ).resolves.toBe('booktutor:reactory.menu.home');
  });

  it('returns literal titles unchanged', async () => {
    const { MenuItem } = harvest();

    await expect(MenuItem.title({ title: 'Chat' }, {}, makeContext())).resolves.toBe('Chat');
  });

  it('returns an empty string when there is no title', async () => {
    const { MenuItem } = harvest();

    await expect(MenuItem.title({}, {}, makeContext())).resolves.toBe('');
    await expect(MenuItem.title(undefined, {}, makeContext())).resolves.toBe('');
  });
});
