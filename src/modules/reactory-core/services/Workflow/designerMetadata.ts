/**
 * Helpers for separating Visual Workflow Designer metadata from the executable
 * YAML workflow definition.
 *
 * Designer metadata (per-step position/size/colour/ports, plus a workflow-level
 * canvas/connections/notes/groups block) is persisted to a sibling
 * `<name>.design.yaml` rather than embedded in the workflow YAML, keeping the
 * executable definition lean. These pure functions move per-step `designer`
 * metadata in and out of a steps tree and are unit-tested in isolation.
 */

/**
 * Recursively walk a steps tree and STRIP every step's `designer` metadata into
 * `map` (keyed by step id), removing it from the tree. A node is treated as a
 * step when it has both string `id` and `type`, so this also captures nested
 * control-flow children (condition.thenSteps, parallel.branches[].steps,
 * for_each/while/saga bodies — wherever they live, including under `config`).
 */
export function collectAndStripDesigner(node: any, map: Record<string, any>): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectAndStripDesigner(n, map));
    return;
  }
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string' && typeof node.type === 'string' && node.designer) {
      map[node.id] = node.designer;
      delete node.designer;
    }
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        collectAndStripDesigner(value, map);
      }
    }
  }
}

/**
 * Inverse of collectAndStripDesigner: re-attach per-step designer metadata from
 * `map` (keyed by step id) back onto a steps tree, so the load pipeline returns
 * the same shape the designer expects. Only sets `designer` when a map entry exists.
 */
export function reattachDesigner(node: any, map: Record<string, any>): void {
  if (!map || Object.keys(map).length === 0) return;
  if (Array.isArray(node)) {
    node.forEach((n) => reattachDesigner(n, map));
    return;
  }
  if (node && typeof node === 'object') {
    if (typeof node.id === 'string' && typeof node.type === 'string' && map[node.id]) {
      node.designer = map[node.id];
    }
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === 'object') {
        reattachDesigner(value, map);
      }
    }
  }
}
