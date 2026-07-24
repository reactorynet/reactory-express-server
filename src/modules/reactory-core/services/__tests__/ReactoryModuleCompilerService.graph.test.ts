import path from 'path';
import {
  parseRelativeImports,
  resolveRelativeImport,
  commonAncestorDir,
  buildModuleFileGraph,
  checksumForGraph,
} from '../ReactoryModuleCompilerService';

// The Workflow widgets are the real-world case that motivated the folder-based
// compiler: each widget imports its prop types from a sibling `./types` file.
const WIDGETS_DIR = path.resolve(
  __dirname,
  '../../forms/Workflow/Widgets',
);
const INSTANCE_INSPECTOR = path.join(WIDGETS_DIR, 'core.WorkflowInstanceInspector.tsx');
const TYPES_FILE = path.join(WIDGETS_DIR, 'types.ts');

describe('ReactoryModuleCompilerService import-graph helpers', () => {
  describe('parseRelativeImports', () => {
    it('extracts relative import/export/require/dynamic-import specifiers', () => {
      const src = `
        import { A } from './types';
        import B from '../shared/B';
        import './side-effect';
        export * from './re-export';
        export { C } from './named';
        const d = require('./cjs-dep');
        const e = await import('./dynamic');
      `;
      const specifiers = parseRelativeImports(src).sort();
      expect(specifiers).toEqual(
        [
          './cjs-dep',
          './dynamic',
          './named',
          './re-export',
          './side-effect',
          './types',
          '../shared/B',
        ].sort(),
      );
    });

    it('ignores bare (node_modules) specifiers', () => {
      const src = `
        import React from 'react';
        import { Button } from '@mui/material';
        import Reactory from '@reactorynet/reactory-core';
      `;
      expect(parseRelativeImports(src)).toEqual([]);
    });

    it('handles multi-line import statements', () => {
      const src = `import {
        WorkflowInstanceInspectorProps,
        WorkflowDataViewerProps
      } from './types';`;
      expect(parseRelativeImports(src)).toEqual(['./types']);
    });
  });

  describe('resolveRelativeImport', () => {
    it('resolves an extensionless specifier to a real .ts sibling', () => {
      const resolved = resolveRelativeImport(WIDGETS_DIR, './types');
      expect(resolved).toBe(TYPES_FILE);
    });

    it('returns null when nothing matches', () => {
      expect(resolveRelativeImport(WIDGETS_DIR, './does-not-exist')).toBeNull();
    });
  });

  describe('commonAncestorDir', () => {
    it('returns the deepest shared directory', () => {
      const result = commonAncestorDir([
        path.join('/a/b/c', 'x.ts'),
        path.join('/a/b/c', 'y.ts'),
        path.join('/a/b', 'z.ts'),
      ]);
      expect(result).toBe(path.resolve('/a/b'));
    });
  });

  describe('buildModuleFileGraph', () => {
    it('discovers the entry file and its ./types include', () => {
      const graph = buildModuleFileGraph(INSTANCE_INSPECTOR);
      expect(graph).not.toBeNull();
      expect(graph!.entry).toBe(INSTANCE_INSPECTOR);
      const files = Array.from(graph!.files.keys());
      expect(files).toContain(INSTANCE_INSPECTOR);
      expect(files).toContain(TYPES_FILE);
      expect(graph!.unresolved).toEqual([]);
      // Both files live in the Widgets dir, so that is the common base.
      expect(graph!.baseDir).toBe(WIDGETS_DIR);
    });

    it('returns null for an unreadable entry path', () => {
      expect(buildModuleFileGraph(path.join(WIDGETS_DIR, 'nope.tsx'))).toBeNull();
    });
  });

  describe('checksumForGraph', () => {
    it('is stable for the same graph and changes when content changes', () => {
      const graph = buildModuleFileGraph(INSTANCE_INSPECTOR)!;
      const first = checksumForGraph(graph);
      const second = checksumForGraph(graph);
      expect(first).toBe(second);

      // Mutating any included file's content must change the checksum, so a
      // change to types.ts (not just the entry) forces a recompile.
      const mutated = {
        ...graph,
        files: new Map(graph.files).set(TYPES_FILE, '/* changed */'),
      };
      expect(checksumForGraph(mutated)).not.toBe(first);
    });
  });
});
