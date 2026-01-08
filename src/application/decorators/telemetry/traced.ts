import { trace, SpanStatusCode, Attributes, SpanKind } from '@opentelemetry/api';
import logger from '@reactory/server-core/logging';

export interface TracingOptions {
  attributes?: Attributes;
  recordException?: boolean;
  kind?: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
}

/**
 * Distributed tracing decorator
 * 
 * Usage:
 * @traced('operation.name', { attributes: { module: 'communicator' } })
 * async myMethod(context: IReactoryContext) { }
 */
export function traced(spanName: string, options: TracingOptions = {}) {
  const {
    attributes = {},
    recordException = true,
    kind = 'internal',
  } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer('reactory-communicator');

    descriptor.value = async function (...args: any[]) {
      const span = tracer.startSpan(spanName, {
        kind: getSpanKind(kind),
        attributes,
      });

      try {
        const result = await originalMethod.apply(this, args);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });

        if (recordException && error instanceof Error) {
          span.recordException(error);
        }

        throw error;
      } finally {
        span.end();
      }
    };

    return descriptor;
  };
}

/**
 * Convert string span kind to OpenTelemetry SpanKind
 */
function getSpanKind(kind: string): SpanKind {
  const kindMap: Record<string, SpanKind> = {
    internal: SpanKind.INTERNAL,
    server: SpanKind.SERVER,
    client: SpanKind.CLIENT,
    producer: SpanKind.PRODUCER,
    consumer: SpanKind.CONSUMER,
  };
  return kindMap[kind] || SpanKind.INTERNAL;
}
