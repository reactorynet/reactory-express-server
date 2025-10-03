/**
 * Debug test to check registry behavior
 */

import { YamlStepRegistry } from '../steps/registry/YamlStepRegistry';

describe('Debug Registry', () => {
  it('should show what steps are registered', () => {
    const registry = new YamlStepRegistry();
    const registeredSteps = registry.getRegisteredSteps();
    const hasLogStep = registry.hasStep('log');
    
    // Throw data to see it in test output
    if (!hasLogStep) {
      throw new Error(`Registry missing log step. Registered steps: ${JSON.stringify(registeredSteps)}`);
    }
    
    expect(hasLogStep).toBe(true);
  });
});
