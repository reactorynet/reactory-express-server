import Reactory from '@reactorynet/reactory-core';
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

    /**
     * Wrapper is deliberately **not** `async`.
     *
     * It used to be, which quietly turned every decorated synchronous method
     * into one returning a Promise. Callers of e.g.
     * `ProviderRegistry.registerProvider(provider): void` neither awaited it nor
     * could catch its throw synchronously: the error surfaced as an unhandled
     * rejection, which in Node terminates the process — it was aborting the
     * whole Jest run mid-suite. Instrumentation must not change the signature
     * of what it instruments, so the result is only chained when the wrapped
     * method actually returns a thenable.
     */
    descriptor.value = function (...args: any[]) {
      // Sampling decision
      if (Math.random() > samplingRate) {
        return originalMethod.apply(this, args);
      }

      // Extract context
      const context = extractContext(args, this, contextSource);
      
      // Check for the capabilities actually used below, not merely that a
      // `telemetry` property exists. A partial telemetry object — a test mock
      // with `telemetry: {}`, or a provider implementing only part of the
      // interface — passed a presence-only check and then threw
      // "context.telemetry.increment is not a function" from inside the
      // instrumentation. Being an uncaught async throw, that did not merely
      // fail the decorated call: it aborted the entire Jest process partway
      // through a repo-wide run. Instrumentation must never be able to break
      // the method it wraps.
      const telemetry = context?.telemetry as
        | { increment?: unknown; startTimer?: unknown }
        | undefined;
      const telemetryUsable =
        !!telemetry &&
        typeof telemetry.increment === 'function' &&
        typeof telemetry.startTimer === 'function';

      if (!telemetryUsable) {
        logger.warn(`No usable telemetry context available for ${metricName}`);
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

      const recordSuccess = () => {
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
      };

      const recordError = (error: unknown) => {
        if (!trackErrors) return;
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
      };

      const endDuration = () => {
        if (endTimer) endTimer();
      };

      let result: any;
      try {
        // Execute original method
        result = originalMethod.apply(this, args);
      } catch (error) {
        // Synchronous throw — record and rethrow synchronously so callers can
        // still catch it with try/catch (and expect(...).toThrow()).
        recordError(error);
        endDuration();
        throw error;
      }

      // Asynchronous method: chain onto its promise, keeping the same rejection.
      if (result && typeof result.then === 'function') {
        return result.then(
          (value: any) => {
            recordSuccess();
            endDuration();
            return value;
          },
          (error: unknown) => {
            recordError(error);
            endDuration();
            throw error;
          }
        );
      }

      // Synchronous success — return the original value, not a promise.
      recordSuccess();
      endDuration();
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
