/**
 * ForEachStep - Iterates over a collection and tracks iteration metadata
 *
 * Config shape (from YAML `inputs` JSON):
 *   items:          "${step.fetchInbox.items}"  (template resolving to an array)
 *   itemVariable:   "message"                   (variable name for current item)
 *   indexVariable:   "messageIndex"             (variable name for current index)
 *   maxConcurrency:  5                          (max parallel iterations — metadata only)
 *   steps:          [...]                       (nested step definitions — stored as output)
 *
 * NOTE: The current linear executor does not natively iterate sub-steps.
 * This step resolves the items collection and exposes metadata so downstream
 * steps or a future iterating executor can act on it.
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class ForEachStep extends BaseYamlStep {
  public readonly stepType = 'for_each';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      items: itemsExpr,
      itemVariable = 'item',
      indexVariable = 'index',
      maxConcurrency = 1,
      steps = []
    } = this.config;

    // Resolve the items expression
    let items: any[] = [];
    if (typeof itemsExpr === 'string') {
      const resolved = this.resolveTemplate(itemsExpr, context);
      // If resolution returned a string that looks like JSON, parse it
      if (typeof resolved === 'string') {
        try {
          const parsed = JSON.parse(resolved);
          items = Array.isArray(parsed) ? parsed : [];
        } catch {
          // Template wasn't resolved to a real value yet — treat as empty
          items = [];
        }
      }
    } else if (Array.isArray(itemsExpr)) {
      items = itemsExpr;
    }

    context.logger.info(
      `ForEach step "${this.id}": ${items.length} items, variable="${itemVariable}", maxConcurrency=${maxConcurrency}`
    );

    return {
      success: true,
      outputs: {
        items,
        itemCount: items.length,
        itemVariable,
        indexVariable,
        maxConcurrency,
        nestedSteps: steps
      },
      metadata: { itemCount: items.length }
    };
  }

  public validateConfig(_config: Record<string, any>): ValidationResult {
    // Items may be a template expression resolved at runtime — no strict validation
    return { valid: true, errors: [] };
  }
}
