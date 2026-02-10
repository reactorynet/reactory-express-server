import Reactory from '@reactory/reactory-core';
import postal from 'postal';
import * as express from 'express';

/**
 * Type definition for event callback functions
 */
type EventCallback = (data: any, envelope: any) => void;

/**
 * Type definition for postal subscription
 */
type PostalSubscription = {
  unsubscribe: () => void;
  [key: string]: any;
};

/**
 * Type definition for postal channel
 */
type PostalChannel = {
  subscribe: (eventId: string, callback: EventCallback) => PostalSubscription;
  publish: (eventId: string, data?: any) => void;
  [key: string]: any;
};

/**
 * AMQ - Asynchronous Message Queue. We use postal.js to create a
 * pub - sub in memory bus.
 *
 * The idea is to have a simple message queue system that can be used
 * to communicate between different parts of the application.
 *
 * The system is designed to be used in a microservices architecture
 * where different parts of the application can communicate with each other
 * using a simple message queue system.
 *
 * TODO: This should be replaced with a more robust message queue system
 * like RabbitMQ or Kafka
 *
 * This is the basic setup and configuration of channels for UI events
 */
const router = express.Router();

/**
 * Default channel names for different types of events
 */
export const DEFAULT_CHANNELS = {
  SYSTEM: 'reactory.core',
  DATA: 'data',
  METRICS: 'metrics',
  TRANSACTIONS: 'transactions',
  FILE: 'file',
  FORM_COMMAND: 'form.command',
  WORKFLOW: 'workflow',
  CROSS_ORIGIN: 'cross_origin',
  PLUGINS: 'reactory.plugins',
} as const;

/**
 * Creates a postal channel, optionally namespaced by partner key
 * @param name - The base channel name
 * @param partner - Optional partner/client context for namespacing
 * @returns A postal channel instance
 */
export const $chan = (name: string, partner?: Reactory.Models.IReactoryClient): PostalChannel => {
  if (partner && partner.key) {
    return postal.channel(`${name}_${partner.key}`);
  }

  return postal.channel(`${name}`);
};

/**
 * Subscription utilities for different event channels
 */
export const $sub = {
  /**
   * Subscribe to events on a custom channel
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param channel - Optional channel name, defaults to undefined
   * @returns Postal subscription object
   */
  def: (eventId: string, func: EventCallback, channel?: string): PostalSubscription => {
    return $chan(channel || '').subscribe(eventId, func);
  },

  /**
   * Subscribe to transaction events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  transactions: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.TRANSACTIONS, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to file events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  file: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.FILE, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to data events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  data: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.DATA, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to metrics events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  metrics: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.METRICS, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to form command events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  formCommand: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.FORM_COMMAND, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to workflow events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  workFlow: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.WORKFLOW, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to message handler loaded events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  messageHandlerLoaded: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.CROSS_ORIGIN, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to plugin loaded events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  pluginLoaded: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.PLUGINS, partner).subscribe(eventId, func);
  },

  /**
   * Subscribe to system events
   * @param eventId - The event identifier
   * @param func - Callback function to handle the event
   * @param partner - Optional partner/client context
   * @returns Postal subscription object
   */
  system: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient): PostalSubscription => {
    return $chan(DEFAULT_CHANNELS.SYSTEM, partner).subscribe(eventId, func);
  },
};

/**
 * Publishing utilities for different event channels
 */
export const $pub = {
  /**
   * Publish events on a custom channel
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param channel - Optional channel name, defaults to undefined
   */
  def: (eventId: string, data?: any, channel?: string): void => $chan(channel || '').publish(eventId, data),

  /**
   * Publish transaction events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  transactions: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.TRANSACTIONS, partner).publish(eventId, data),

  /**
   * Publish file events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  file: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.FILE, partner).publish(eventId, data),

  /**
   * Publish data events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  data: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.DATA, partner).publish(eventId, data),

  /**
   * Publish metrics events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  metrics: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.METRICS, partner).publish(eventId, data),

  /**
   * Publish form command events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  formCommand: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.FORM_COMMAND, partner).publish(eventId, data),

  /**
   * Publish workflow events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  workFlow: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.WORKFLOW, partner).publish(eventId, data),

  /**
   * Publish message handler loaded events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  messageHandlerLoaded: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.CROSS_ORIGIN, partner).publish(eventId, data),

  /**
   * Publish plugin loaded events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  pluginLoaded: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.PLUGINS, partner).publish(eventId, data),

  /**
   * Publish system events
   * @param eventId - The event identifier
   * @param data - Optional data to publish with the event
   * @param partner - Optional partner/client context
   */
  system: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient): void => $chan(DEFAULT_CHANNELS.SYSTEM, partner).publish(eventId, data),
};


/**
 * Express router for AMQ endpoints
 */
router.get('/', (request: express.Request, response: express.Response) => {
  response.send({ ok: true, message: 'POSTAL-OK' });
});

router.post('/', (request: express.Request, response: express.Response) => {
  response.send({ ok: true, message: 'POSTAL-OK' });
});

/**
 * Type definition for the AMQ (Asynchronous Message Queue) API
 */
interface IAMQAPI {
  /** Channel creation utility */
  $chan: (name: string, partner?: Reactory.Models.IReactoryClient) => PostalChannel;

  /** Subscription utilities for different channels */
  $sub: typeof $sub;

  /** Publishing utilities for different channels */
  $pub: typeof $pub;

  /** Subscribe to transaction events */
  onTransactionEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to file events */
  onFileEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to data events */
  onDataEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to metric events */
  onMetricEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to form command events */
  onFormCommandEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to message handler loaded events */
  onMessageHandlerLoaded: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to Reactory plugin loaded events */
  onReactoryPluginLoaded: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to Reactory plugin events (alias for plugin loaded) */
  onReactoryPluginEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Subscribe to workflow events */
  onWorkflowEvent: (eventId: string, func: EventCallback, partner?: Reactory.Models.IReactoryClient) => PostalSubscription;

  /** Publish workflow events */
  raiseWorkflowEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish transaction events */
  raiseTransactionEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish file events */
  raiseFileEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish data events */
  raiseDataEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish metric events */
  raiseMetricEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish form command events */
  raiseFormCommand: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish workflow events (alias for raiseWorkflowEvent) */
  raiseWorkFlowEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish message handler loaded events */
  raiseMessageHandlerLoadedEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish Reactory plugin events */
  raiseReactoryPluginEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Publish system events */
  raiseSystemEvent: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient) => void;

  /** Express router for AMQ endpoints */
  router: express.Router;
}

/**
 * Main AMQ (Asynchronous Message Queue) API
 *
 * Provides a unified interface for in-memory pub-sub messaging using postal.js.
 * Supports channel-based communication with optional client/partner namespacing.
 *
 * @example
 * ```typescript
 * import amq from './amq';
 *
 * // Subscribe to workflow events
 * const subscription = amq.onWorkflowEvent('task.completed', (data) => {
 *   console.log('Task completed:', data);
 * });
 *
 * // Publish a workflow event
 * amq.raiseWorkflowEvent('task.completed', { taskId: '123' });
 *
 * // Clean up subscription
 * subscription.unsubscribe();
 * ```
 */
const amqAPI: IAMQAPI = {
  $chan,
  $sub,
  $pub,
  onTransactionEvent: $sub.transactions,
  onFileEvent: $sub.file,
  onDataEvent: $sub.data,
  onMetricEvent: $sub.metrics,
  onFormCommandEvent: $sub.formCommand,
  onMessageHandlerLoaded: $sub.messageHandlerLoaded,
  onReactoryPluginLoaded: $sub.pluginLoaded,
  onReactoryPluginEvent: $sub.pluginLoaded,
  onWorkflowEvent: $sub.workFlow,
  raiseWorkflowEvent: $pub.workFlow,
  raiseTransactionEvent: $pub.transactions,
  raiseFileEvent: $pub.file,
  raiseDataEvent: $pub.data,
  raiseMetricEvent: $pub.metrics,
  raiseFormCommand: $pub.formCommand,
  raiseWorkFlowEvent: $pub.workFlow,
  raiseMessageHandlerLoadedEvent: $pub.messageHandlerLoaded,
  raiseReactoryPluginEvent: $pub.pluginLoaded,
  raiseSystemEvent: $pub.system,
  router,
};

export default amqAPI;
