import { metric, MetricDecoratorOptions } from './metric';

export interface CounterOptions extends Omit<MetricDecoratorOptions, 'type' | 'trackDuration'> {
  increment?: number;
}

/**
 * Counter-only decorator (no duration tracking)
 * 
 * Usage:
 * @counter('my.counter', { description: 'My counter description' })
 * async myMethod(context: IReactoryContext) { }
 */
export function counter(metricName: string, options: CounterOptions = {}) {
  const { increment = 1, ...restOptions } = options;
  
  return metric(metricName, {
    ...restOptions,
    type: 'counter',
    trackDuration: false,
  });
}
