import Applications from '../Applications';
import coreForms from '../index';

/**
 * Guards the `reactory.MyApplications@1.0.0` form's application-card wiring.
 *
 * The `core.ApplicationCard@1.0.0` widget now bounds the (potentially long)
 * application introduction and renders an expand/collapse toggle. These tests
 * pin the wiring the widget depends on — form registration, the widget FQN, the
 * collapsibility options declared on the array item, and the module source
 * registered for client-side compilation — and smoke-compile the widget source.
 */
describe('reactory.MyApplications@1.0.0', () => {
  const ui = Applications.uiSchema as any;
  const itemOptions = ui.applications.items['ui:options'];

  it('is registered on the core module', () => {
    const ids = (coreForms as any[]).map((form) => form.id);
    expect(ids).toContain('reactory.MyApplications@1.0.0');
  });

  it('renders application items with the core.ApplicationCard widget', () => {
    expect(ui.applications.items['ui:widget']).toBe('core.ApplicationCard@1.0.0');
  });

  it('declares the collapsible introduction options consumed by ApplicationCard', () => {
    expect(itemOptions.collapsible).toBe(true);
    expect(itemOptions.collapsedHeight).toBe(160);
  });

  it('registers the ApplicationCard module source for client compilation', () => {
    const cardModule = (Applications.modules as any[])
      .find((module) => module.id === 'core.ApplicationCard@1.0.0');

    expect(cardModule).toBeDefined();
    expect(cardModule.fileType).toBe('tsx');
    expect(typeof cardModule.src).toBe('string');
    expect(cardModule.src.length).toBeGreaterThan(0);
  });

  it('parses the ApplicationCard widget source through the TSX transform', () => {
    // The widget touches `window.reactory` at module scope (to self-register); provide
    // a bare window so the module can be required. A syntax/transform error – the kind
    // that silently breaks the client-side module compilation – would throw here.
    (global as any).window = {};
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(() => require('../Applications/widgets/ApplicationCard.tsx')).not.toThrow();
  });
});
