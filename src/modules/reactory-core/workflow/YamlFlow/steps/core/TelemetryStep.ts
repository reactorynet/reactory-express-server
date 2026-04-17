/**
 * TelemetryStep - Emit metrics, counters, or trace data
 *
 * Config shape (matches ITelemetryStepConfig):
 *   metricName:   string   (name of the metric)
 *   metricType:   'counter' | 'histogram' | 'gauge'
 *   value?:       number   (metric value — default 1 for counters)
 *   labels?:      object   (key-value labels/tags)
 *   description?: string   (metric description)
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export class TelemetryStep extends BaseYamlStep {
  public readonly stepType = 'telemetry';

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const {
      metricName,
      metricType = 'counter',
      value = 1,
      labels = {},
      description,
    } = this.config;

    if (!metricName) {
      return {
        success: false,
        error: 'Telemetry step requires a metricName',
        outputs: {},
        metadata: {}
      };
    }

    const resolvedName = this.resolveTemplate(String(metricName), context);

    // Resolve template variables in labels
    const resolvedLabels: Record<string, string> = {};
    for (const [key, val] of Object.entries(labels)) {
      resolvedLabels[key] = typeof val === 'string' ? this.resolveTemplate(val, context) : String(val);
    }

    context.logger.info(
      `Telemetry step "${this.id}": ${metricType} "${resolvedName}" = ${value}`
    );

    // Attempt to use telemetry service if available
    if (context.reactoryContext) {
      try {
        const telemetryService = context.reactoryContext.getService('reactory.TelemetryService@1.0.0') as any;
        if (telemetryService) {
          switch (metricType) {
            case 'counter':
              if (typeof telemetryService.incrementCounter === 'function') {
                telemetryService.incrementCounter(resolvedName, value, resolvedLabels);
              }
              break;
            case 'histogram':
              if (typeof telemetryService.recordHistogram === 'function') {
                telemetryService.recordHistogram(resolvedName, value, resolvedLabels);
              }
              break;
            case 'gauge':
              if (typeof telemetryService.setGauge === 'function') {
                telemetryService.setGauge(resolvedName, value, resolvedLabels);
              }
              break;
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        context.logger.warn(`Telemetry service call failed: ${message}`);
      }
    }

    return {
      success: true,
      outputs: {
        metricName: resolvedName,
        metricType,
        value,
        labels: resolvedLabels,
      },
      metadata: { metricType, metricName: resolvedName }
    };
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.metricName) {
      errors.push('Telemetry step requires a metricName');
    }
    const validTypes = ['counter', 'histogram', 'gauge'];
    if (config.metricType && !validTypes.includes(config.metricType)) {
      errors.push(`metricType must be one of: ${validTypes.join(', ')}`);
    }
    return { valid: errors.length === 0, errors };
  }
}
