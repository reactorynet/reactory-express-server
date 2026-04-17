/**
 * GRPCStep - Execute a gRPC service call
 *
 * Config shape (matches IGRPCStepConfig):
 *   service:    string   (fully qualified gRPC service name)
 *   method:     string   (method to invoke)
 *   payload?:   object   (request payload)
 *   metadata?:  object   (gRPC metadata/headers)
 *   protoFile?: string   (path to .proto definition)
 *   deadline?:  number   (timeout in ms)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class GRPCStep extends BaseYamlStep {
  public readonly stepType = 'grpc';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      service,
      method,
      payload = {},
      metadata = {},
      deadline,
    } = this.config;

    if (!service || !method) {
      return {
        success: false,
        error: 'gRPC step requires both service and method',
        outputs: {},
        metadata: {}
      };
    }

    const resolvedService = this.resolveTemplate(String(service), context);
    const resolvedMethod = this.resolveTemplate(String(method), context);

    // Resolve template variables in payload
    const resolvedPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (typeof value === 'string') {
        resolvedPayload[key] = this.resolveTemplate(value, context);
      } else {
        resolvedPayload[key] = value;
      }
    }

    context.logger.info(`gRPC step "${this.id}": ${resolvedService}/${resolvedMethod}`);

    try {
      // Attempt to get gRPC service from Reactory context
      if (context.reactoryContext) {
        const grpcService = context.reactoryContext.getService('core.GRPCService@1.0.0') as any;
        if (grpcService && typeof grpcService.invoke === 'function') {
          const result = await grpcService.invoke({
            service: resolvedService,
            method: resolvedMethod,
            payload: resolvedPayload,
            metadata,
            deadline,
          });

          return {
            success: true,
            outputs: { result },
            metadata: { service: resolvedService, method: resolvedMethod }
          };
        }
      }

      // No gRPC service available — return metadata for downstream handling
      context.logger.warn(`No gRPC service available, exposing call metadata for downstream handling`);
      return {
        success: true,
        outputs: {
          service: resolvedService,
          method: resolvedMethod,
          payload: resolvedPayload,
          metadata,
          deadline,
        },
        metadata: { service: resolvedService, method: resolvedMethod, deferred: true }
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `gRPC call failed: ${message}`,
        outputs: {},
        metadata: { service: resolvedService, method: resolvedMethod }
      };
    }
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.service) {
      errors.push('gRPC step requires a service name');
    }
    if (!config.method) {
      errors.push('gRPC step requires a method name');
    }
    return { valid: errors.length === 0, errors };
  }
}
