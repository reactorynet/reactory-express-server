import ApplicationRouteEditor from '../Application/ApplicationRouteEditor';
import coreForms from '../index';

/**
 * Guards the `core.ApplicationRouteEditor@1.0.0` form.
 *
 * The form was registered but **non-functional**: it referenced two widgets no
 * catalogue provided (`TagsWidget`, `JSONEditorWidget`), so any field bound to
 * them failed to render. These tests pin the corrected wiring, including the
 * newly-exposed `header` / `footer` slot configuration.
 */
describe('core.ApplicationRouteEditor@1.0.0' 	, () => {
  const schemaProperties = Object.keys((ApplicationRouteEditor.schema as any).properties);
  const ui = ApplicationRouteEditor.uiSchema as any;

  it('is registered on the core module', () => {
    const ids = (coreForms as any[]).map((form) => form.id);
    expect(ids).toContain('core.ApplicationRouteEditor@1.0.0');
  });

  it('models header and footer slot configuration', () => {
    expect(schemaProperties).toEqual(expect.arrayContaining(['header', 'footer']));
    expect((ApplicationRouteEditor.schema as any).properties.header.properties).toEqual(
      expect.objectContaining({
        show: expect.any(Object),
        title: expect.any(Object),
        componentFqn: expect.any(Object),
        props: expect.any(Object),
        propsMap: expect.any(Object),
      }),
    );
    expect((ApplicationRouteEditor.schema as any).properties.footer.properties.componentFqn).toBeDefined();
  });

  it('lays header and footer onto the grid', () => {
    const rows: Array<Record<string, unknown>> = ui['ui:grid-layout'];
    const rowFields = rows.flatMap((row) => Object.keys(row));
    expect(rowFields).toContain('header');
    expect(rowFields).toContain('footer');
  });

  it('only names widgets the client can resolve', () => {
    // Registered catalogue widgets + rjsf defaults.
    const supportedWidgets = new Set([
      'ChipArrayWidget',
      'JsonEditorWidget',
      'JSONEditorWidget',
      'CheckboxWidget',
      'TextWidget',
      'TextareaWidget',
      'SelectWidget',
      'HiddenWidget',
      // rjsf also accepts the lowercase 'hidden' widget id.
      'hidden',
    ]);

    const usedWidgets: string[] = [];
    const collect = (node: any) => {
      if (!node || typeof node !== 'object') return;
      Object.keys(node).forEach((key) => {
        const value = node[key];
        if (key === 'ui:widget' && typeof value === 'string') usedWidgets.push(value);
        if (value && typeof value === 'object') collect(value);
      });
    };
    collect(ui);

    expect(usedWidgets.length).toBeGreaterThan(0);
    usedWidgets.forEach((widget) => expect(supportedWidgets.has(widget)).toBe(true));
    // The specific regressions this guards against.
    expect(usedWidgets).not.toContain('TagsWidget');
    expect(usedWidgets).not.toContain('JSONEditorWidget');
    expect(ui.roles['ui:widget']).toBe('ChipArrayWidget');
    expect(ui.componentProps['ui:widget']).toBe('JsonEditorWidget');
  });
});
