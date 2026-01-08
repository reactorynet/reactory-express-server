import { metric, MetricDecoratorOptions } from './metric';

export interface HistogramOptions extends Omit<MetricDecoratorOptions, 'type'> {
  buckets?: number[];
}

/**
 * Histogram decorator for tracking value distributions
 * 
 * Usage:
 * @histogram('my.duration', { description: 'Operation duration' })
 * async myMethod(context: IReactoryContext) { }
 */
export function histogram(metricName: string, options: HistogramOptions = {}) {
  return metric(metricName, {
    ...options,
    type: 'histogram',
    trackDuration: true,
  });
}
