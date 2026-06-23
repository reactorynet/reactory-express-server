/**
 * Tests for the step catalog (WS2): core steps appear as source 'core' without a
 * designer definition; module-contributed steps carry a definition + source 'module'.
 */

import { YamlStepRegistry } from '../../steps/registry/YamlStepRegistry';

describe('YamlStepRegistry.getStepCatalog', () => {
  it('lists core default steps with source "core" and no designer definition', () => {
    const registry = new YamlStepRegistry();
    const catalog = registry.getStepCatalog();

    const log = catalog.find((e) => e.stepType === 'log');
    expect(log).toBeDefined();
    expect(log?.source).toBe('core');
    expect(log?.definition).toBeUndefined();

    // Catalog is sorted by stepType.
    const types = catalog.map((e) => e.stepType);
    expect([...types].sort((a, b) => a.localeCompare(b))).toEqual(types);
  });

  it('surfaces a module-contributed step with its designer definition + source "module"', () => {
    const registry = new YamlStepRegistry();
    const definition = {
      id: 'agent_conversation',
      name: 'AI Agent Conversation',
      category: 'integration',
      icon: 'smart_toy',
      propertySchema: { type: 'object', properties: { personaId: { type: 'string' } } },
      rendering: { webgl: { type: 'webgl' } },
    };

    registry.registerStep(
      'agent_conversation',
      class {} as any,
      { description: 'AI agent', version: '1.0.0' },
      definition,
      'module',
    );

    const entry = registry.getStepCatalog().find((e) => e.stepType === 'agent_conversation');
    expect(entry).toBeDefined();
    expect(entry?.source).toBe('module');
    expect(entry?.description).toBe('AI agent');
    expect(entry?.definition).toEqual(definition);
  });
});
