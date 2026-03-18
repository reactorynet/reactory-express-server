/**
 * ServiceInvokeStep - Invokes a Reactory service method
 *
 * Config shape (from YAML `inputs` JSON):
 *   service: "namespace.ServiceName@version"
 *   method:  "methodName"
 *   params:  { ... }              (optional — arguments passed to the method)
 *   outputs: { result: "alias" }  (optional — output mapping)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class ServiceInvokeStep extends BaseYamlStep {
  public readonly stepType = 'service_invoke';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const { service, method, params = {} } = this.config;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot invoke service',
        outputs: {},
        metadata: {}
      };
    }

    // Resolve template variables in service / method / params
    const resolvedService = this.resolveTemplate(service, context);
    const resolvedMethod = this.resolveTemplate(method, context);
    const resolvedParams = this.resolveParams(params, context);

    context.logger.info(`Invoking service ${resolvedService}.${resolvedMethod}`);

    try {
      const svc = context.reactoryContext.getService(resolvedService) as any;
      if (!svc) {
        return {
          success: false,
          error: `Service "${resolvedService}" not found in Reactory context`,
          outputs: {},
          metadata: { service: resolvedService, method: resolvedMethod }
        };
      }

      if (typeof svc[resolvedMethod] !== 'function') {
        return {
          success: false,
          error: `Method "${resolvedMethod}" does not exist on service "${resolvedService}"`,
          outputs: {},
          metadata: { service: resolvedService, method: resolvedMethod }
        };
      }

      const result = await svc[resolvedMethod](resolvedParams);

      return {
        success: true,
        outputs: { result },
        metadata: { service: resolvedService, method: resolvedMethod }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`Service invocation failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: { service: resolvedService, method: resolvedMethod }
      };
    }
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.service || typeof config.service !== 'string') {
      errors.push('service is required and must be a string (e.g. "namespace.ServiceName@version")');
    }
    if (!config.method || typeof config.method !== 'string') {
      errors.push('method is required and must be a string');
    }
    return { valid: errors.length === 0, errors };
  }

  /** Deep-resolve template strings inside a params object */
  private resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') {
      return this.resolveTemplate(params, context);
    }
    if (Array.isArray(params)) {
      return params.map(p => this.resolveParams(p, context));
    }
    if (params && typeof params === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(params)) {
        resolved[key] = this.resolveParams(value, context);
      }
      return resolved;
    }
    return params;
  }
}
