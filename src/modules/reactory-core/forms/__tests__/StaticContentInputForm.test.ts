import StaticContentInputForm from '../StaticContentInputForm';
import coreForms from '../index';

/**
 * Guards the `core.StaticContentInputForm@1.0.0` properties editor.
 *
 * This form is resolved at runtime by the Application route editor
 * (`ApplicationRoutesPanel` → `resolvePropsSchema`) via the standard
 * `InputForm` naming convention:
 *
 *   core.StaticContent@1.0.0  →  core.StaticContentInputForm@1.0.0
 *
 * These tests pin the contract the route editor depends on:
 *   - the form is registered on the core module and resolvable by id;
 *   - its schema is flat (formData === the route's `componentProps`);
 *   - its tabs group every schema property (nothing is orphaned);
 *   - the grid layout references real fields;
 *   - every `ui:widget` it names is a widget the client can actually resolve,
 *     so the editor never renders a broken field (the failure mode that made
 *     the sibling `ApplicationRouteEditor` non-functional).
 */
describe('core.StaticContentInputForm@1.0.0', () => {
  const schemaProperties = Object.keys((StaticContentInputForm.schema as any).properties);
  const ui = StaticContentInputForm.uiSchema as any;

  it('is registered on the core module and keyed by the expected id', () => {
    const ids = (coreForms as any[]).map((form) => form.id);
    expect(ids).toContain('core.StaticContentInputForm@1.0.0');

    expect(StaticContentInputForm.id).toBe('core.StaticContentInputForm@1.0.0');
    expect(StaticContentInputForm.nameSpace).toBe('core');
    expect(StaticContentInputForm.name).toBe('StaticContentInputForm');
    expect(StaticContentInputForm.version).toBe('1.0.0');
  });

  it('keeps the schema flat so formData maps straight onto componentProps', () => {
    expect((StaticContentInputForm.schema as any).type).toBe('object');
    // Every top-level property is a scalar/array/leaf object — the screenshot
    // contract for a route `componentProps` object.
    schemaProperties.forEach((prop) => {
      const type = (StaticContentInputForm.schema as any).properties[prop].type;
      expect(['string', 'boolean', 'number', 'array', 'object']).toContain(type);
    });
    // A representative slice of the StaticContent prop surface is present.
    expect(schemaProperties).toEqual(
      expect.arrayContaining([
        'slug',
        'slugSource',
        'slugSourceProps',
        'viewMode',
        'container',
        'containerProps',
        'editRoles',
        'viewRoles',
        'enableComments',
        'commentLayout',
      ])
    );
  });

  it('groups every schema property into exactly one tab', () => {
    expect(ui['ui:field']).toBe('TabbedLayout');

    const layout: Array<{ title?: string; fields?: string[] }> = ui['ui:tab-layout'];
    expect(layout.map((tab) => tab.title)).toEqual([
      'Content',
      'Presentation',
      'Editing',
      'Comments & i18n',
      'Advanced',
    ]);

    const tabFields = layout.flatMap((tab) => tab.fields ?? []);

    // Every tab field exists in the schema…
    tabFields.forEach((field) => expect(schemaProperties).toContain(field));
    // …and every schema property is covered, with no duplicates.
    expect(new Set(tabFields)).toEqual(new Set(schemaProperties));
    expect(tabFields.length).toBe(schemaProperties.length);
  });

  it('lays fields out on the 12-column grid and only references real fields', () => {
    const rows: Array<Record<string, unknown>> = ui['ui:grid-layout'];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    const gridFields = rows.flatMap((row) => Object.keys(row));
    gridFields.forEach((field) => expect(schemaProperties).toContain(field));
    expect(new Set(gridFields)).toEqual(new Set(schemaProperties));
  });

  it('only names ui:widget widgets the client catalogue can resolve', () => {
    // Widgets available on the v5 engine (reactoryWidgets) plus rjsf defaults.
    const supportedWidgets = new Set([
      'ChipArrayWidget',
      'TextWidget',
      'TextareaWidget',
      'SelectWidget',
      'CheckboxWidget',
      'CheckboxesWidget',
      'RadioWidget',
      'HiddenWidget',
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
  });

  it('does not render the route editor chrome (submit toolbar) inside the dialog', () => {
    expect(ui['ui:form']).toMatchObject({ showSubmit: false });
  });
});
