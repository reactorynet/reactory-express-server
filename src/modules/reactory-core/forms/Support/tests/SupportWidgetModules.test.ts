import fs from 'fs';
import {
  buildModuleFileGraph,
  parseRelativeImports,
} from '../../../services/ReactoryModuleCompilerService';
import supportWidgetModules from '../SupportTickets/modules';

/**
 * REACTORY-302016408/20261017/1703068768 (follow-up).
 *
 * The module compiler does not bundle a widget's neighbours for you. With no
 * `compilerOptions.sourcePath` it synthesises a single `entry.tsx` from the
 * widget's `src` and copies nothing else, so any relative import of a runtime
 * value (e.g. `./bulkActionTheme`) fails at bundle time with:
 *
 *     [!] Error: Could not resolve './bulkActionTheme' from .../entry.tsx
 *
 * That failure is invisible to `tsc` and to unit tests that import the helper
 * directly: the code is valid TypeScript, it only cannot be *packaged*. Every
 * module in this manifest therefore has to declare a `sourcePath` so the
 * compiler ships the entry's local import graph. These assertions fail if that
 * declaration, or one of the imports it must cover, is ever lost again.
 */
describe('support widget modules — runtime packaging', () => {
  const bulkActionModules = [
    'core.BulkStatusChangeAction@1.0.0',
    'core.BulkAssignAction@1.0.0',
    'core.BulkTagAction@1.0.0',
    'core.BulkDeleteAction@1.0.0',
  ];

  const byId = (id: string) => {
    const found = supportWidgetModules.find((entry) => entry.id === id);
    if (!found) throw new Error(`module ${id} is not in the SupportTickets manifest`);
    return found;
  };

  it('declares a readable sourcePath for every module', () => {
    supportWidgetModules.forEach((entry) => {
      const sourcePath = (entry.compilerOptions as { sourcePath?: string } | undefined)?.sourcePath;
      expect(sourcePath).toBeTruthy();
      // A typo here would silently fall back to inline `src`, which is the
      // behaviour that dropped the helper in the first place.
      expect(fs.existsSync(sourcePath as string)).toBe(true);
    });
  });

  it.each(bulkActionModules)('%s ships the theme helper it imports', (id) => {
    const entry = byId(id);
    const sourcePath = (entry.compilerOptions as { sourcePath?: string }).sourcePath as string;

    const graph = buildModuleFileGraph(sourcePath);
    expect(graph).not.toBeNull();
    expect(graph!.unresolved).toEqual([]);

    const shipped = Array.from(graph!.files.keys()).map((file) => file.split('/').pop());
    expect(shipped).toContain('bulkActionTheme.ts');

    // The compiler writes includes relative to the graph's common ancestor, so
    // the specifier in the entry must still resolve inside the module folder.
    expect(parseRelativeImports(entry.src)).toContain('./bulkActionTheme');
    expect(graph!.files.has(sourcePath)).toBe(true);
  });

  it('has no dangling relative imports in any support widget', () => {
    // Catches an import added to any widget (not just the bulk actions) that the
    // compiler would be unable to resolve when packaging.
    supportWidgetModules.forEach((entry) => {
      const sourcePath = (entry.compilerOptions as { sourcePath?: string }).sourcePath as string;
      const graph = buildModuleFileGraph(sourcePath);
      expect(graph).not.toBeNull();
      expect(graph!.unresolved).toEqual([]);
    });
  });
});
