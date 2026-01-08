import Reactory from '@reactory/reactory-core';
import logger from '@reactory/server-core/logging';
import { Attributes } from '@opentelemetry/api';

export interface MetricDecoratorOptions {
  type?: 'counter' | 'histogram' | 'gauge' | 'updowncounter' | 'all';
  description?: string;
  unit?: string;
  attributesExtractor?: (args: any[], instance: any, context?: any) => Record<string, any>;
  trackErrors?: boolean;
  trackDuration?: boolean;
  persist?: boolean;
  contextSource?: 'request' | 'instance' | 'params';
  errorClassifier?: (error: Error) => string;
  tags?: Record<string, string>;
  samplingRate?: number;
}

/**
 * Metric decorator for automatic telemetry instrumentation
 * 
 * Usage:
 * @metric('my.metric.name', { trackErrors: true, trackDuration: true })
 * async myMethod(params: any, context: IReactoryContext) { }
 */
export function metric(metricName: string, options: MetricDecoratorOptions = {}) {
  const {
    type = 'all',
    description = `${metricName} metric`,
    unit = 'count',
    attributesExtractor,
    trackErrors = true,
    trackDuration = true,
    persist = true,
    contextSource = 'params',
    errorClassifier = (error) => error.constructor.name,
    tags = {},
    samplingRate = 1.0,
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Sampling decision
      if (Math.random() > samplingRate) {
        return originalMethod.apply(this, args);
      }

      // Extract context
      const context = extractContext(args, this, contextSource);
      
      if (!context || !context.telemetry) {
        logger.warn(`No telemetry context available for ${metricName}`);
        return originalMethod.apply(this, args);
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
          logger.error('Error extracting metric attributes', { error, metricName });
        }
      }

      // Add partner/user context
      if (context.partner) {
        customAttributes.partnerId = context.partner.id;
        customAttributes.partnerKey = context.partner.key;
      }
      if (context.user) {
        customAttributes.userId = context.user.id;
      }

      // Track invocation count
      if (type === 'counter' || type === 'all') {
        context.telemetry.increment(`${metricName}.count`, 1, customAttributes, {
          description: `${description} - invocations`,
          unit: 'count',
          persist,
        });
      }

      // Start duration tracking
      let endTimer: (() => void) | undefined;
      if (trackDuration && (type === 'histogram' || type === 'all')) {
        endTimer = context.telemetry.startTimer(
          `${metricName}.duration`,
          customAttributes,
          {
            description: `${description} - duration`,
            unit: 'seconds',
            persist,
          }
        );
      }

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Record success
        if (type === 'counter' || type === 'all') {
          context.telemetry.increment(
            `${metricName}.success`,
            1,
            customAttributes,
            {
              description: `${description} - successful operations`,
              persist,
            }
          );
        }

        return result;
      } catch (error) {
        // Track errors
        if (trackErrors) {
          const errorType = errorClassifier(error as Error);
          
          context.telemetry.increment(
            `${metricName}.errors`,
            1,
            { ...customAttributes, errorType },
            {
              description: `${description} - errors`,
              persist,
            }
          );

          // Track by error type
          context.telemetry.increment(
            `${metricName}.errors.${errorType}`,
            1,
            customAttributes,
            {
              description: `${description} - ${errorType} errors`,
              persist,
            }
          );
        }

        throw error;
      } finally {
        // End duration tracking
        if (endTimer) {
          endTimer();
        }
      }
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
      // REST endpoint - context in req object
      const req = args[0];
      return req?.context || null;

    case 'instance':
      // Service class - context stored on instance
      return instance?.context || null;

    case 'params':
    default:
      // GraphQL/Service method - context as parameter
      // Usually last parameter for services, or in args
      for (const arg of args) {
        if (arg && typeof arg === 'object' && 'telemetry' in arg) {
          return arg as Reactory.Server.IReactoryContext;
        }
      }
      return null;
  }
}
