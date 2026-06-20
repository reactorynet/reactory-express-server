/**
 * Unit tests for the designer-metadata split/merge helpers used to keep designer
 * data out of the executable workflow YAML (persisted to a sibling .design.yaml).
 */

import { collectAndStripDesigner, reattachDesigner } from '../designerMetadata';

function sampleSteps() {
  return [
    {
      id: 'start',
      type: 'start',
      designer: { position: { x: 0, y: 0 }, color: '#fff' },
    },
    {
      id: 'branch',
      type: 'condition',
      config: {
        condition: 'variables.n > 3',
        // nested control-flow children live under config — must also be split
        thenSteps: [
          { id: 'big', type: 'set_variable', config: { action: 'set', key: 'size', value: 'big' }, designer: { position: { x: 200, y: 50 } } },
        ],
        elseSteps: [
          { id: 'small', type: 'set_variable', config: { action: 'set', key: 'size', value: 'small' }, designer: { position: { x: 200, y: 150 } } },
        ],
      },
      designer: { position: { x: 100, y: 100 }, size: { width: 120, height: 80 } },
    },
    {
      id: 'fork',
      type: 'parallel',
      config: {
        branches: [
          { name: 'a', steps: [{ id: 'setA', type: 'set_variable', config: { action: 'set', key: 'a', value: 1 }, designer: { position: { x: 300, y: 0 } } }] },
        ],
      },
    },
  ];
}

describe('designerMetadata split/merge', () => {
  it('strips designer from every step (incl. nested under config) into a map', () => {
    const steps = sampleSteps();
    const map: Record<string, any> = {};
    collectAndStripDesigner(steps, map);

    // Map captured all 4 steps that had a designer block.
    expect(Object.keys(map).sort()).toEqual(['big', 'setA', 'small', 'start', 'branch'].sort());
    expect(map.start.position).toEqual({ x: 0, y: 0 });
    expect(map.big.position).toEqual({ x: 200, y: 50 });
    expect(map.setA.position).toEqual({ x: 300, y: 0 });

    // No `designer` key remains anywhere in the tree.
    const asJson = JSON.stringify(steps);
    expect(asJson).not.toContain('"designer"');
  });

  it('round-trips: strip then reattach restores the original tree', () => {
    const original = sampleSteps();
    const working = sampleSteps();

    const map: Record<string, any> = {};
    collectAndStripDesigner(working, map);
    reattachDesigner(working, map);

    expect(working).toEqual(original);
  });

  it('reattach with an empty map is a no-op', () => {
    const steps = sampleSteps();
    collectAndStripDesigner(steps, {}); // strips into a throwaway map
    const before = JSON.stringify(steps);
    reattachDesigner(steps, {});
    expect(JSON.stringify(steps)).toBe(before);
  });

  it('ignores objects that are not steps (no string type)', () => {
    const tree = [
      { id: 'real', type: 'log', config: { thing: { id: 'cfg-id-no-type', value: 1 } }, designer: { position: { x: 1, y: 2 } } },
    ];
    const map: Record<string, any> = {};
    collectAndStripDesigner(tree, map);

    // Only the real step (id+type) is captured; the config object with an id but
    // no type is untouched.
    expect(Object.keys(map)).toEqual(['real']);
    expect((tree[0] as any).config.thing).toEqual({ id: 'cfg-id-no-type', value: 1 });
  });
});
