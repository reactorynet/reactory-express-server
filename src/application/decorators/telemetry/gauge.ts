import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import { Attributes } from '@opentelemetry/api';

export interface GaugeOptions {
  description?: string;
  unit?: string;
  attributesExtractor?: (args: any[], instance: any, context?: any) => Record<string, any>;
  contextSource?: 'request' | 'instance' | 'params';
  valueExtractor?: (result: any) => number;
  persist?: boolean;
  tags?: Record<string, string>;
}

/**
 * Gauge decorator for recording current values
 * 
 * Usage:
 * @gauge('queue.depth', { valueExtractor: (result) => result.count })
 * async getQueueDepth(context: IReactoryContext) { }
 */
export function gauge(metricName: string, options: GaugeOptions = {}) {
  const {
    description = `${metricName} gauge`,
    unit = 'count',
    attributesExtractor,
    contextSource = 'params',
    valueExtractor = (result) => typeof result === 'number' ? result : 1,
    persist = true,
    tags = {},
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);

      // Extract context
      const context = extractContext(args, this, contextSource);
      
      if (!context || !context.telemetry) {
        logger.warn(`No telemetry context available for ${metricName}`);
        return result;
      }

      // Extract custom attributes
      let customAttributes: Attributes = { ...tags };
      if (attributesExtractor) {
        try {
          customAttributes = {
            ...customAttributes,
            ...attributesExtractor(args, this, context),
          };
        } catch (error) {
          logger.error('Error extracting gauge attributes', { error, metricName });
        }
      }

      // Add partner/user context
      if (context.partner) {
        customAttributes.partnerId = context.partner.id;
      }
      if (context.user) {
        customAttributes.userId = context.user.id;
      }

      // Extract value from result
      const value = valueExtractor(result);

      // Record gauge
      context.telemetry.recordGauge(
        metricName,
        value,
        customAttributes,
        {
          description,
          unit,
          persist,
        }
      );

      return result;
    };

    return descriptor;
  };
}

/**
 * Extract Reactory context from method arguments
 */
function extractContext(
  args: any[],
  instance: any,
  source: 'request' | 'instance' | 'params'
): Reactory.Server.IReactoryContext | null {
  switch (source) {
    case 'request':
      const req = args[0];
      return req?.context || null;
    case 'instance':
      return instance?.context || null;
    case 'params':
    default:
      for (const arg of args) {
        if (arg && typeof arg === 'object' && 'telemetry' in arg) {
          return arg as Reactory.Server.IReactoryContext;
        }
      }
      return null;
  }
}
