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
import postal from 'postal';
import * as express from 'express';

const router = express.Router();

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
};


export const $chan = (name, partner) => {
  if (partner && partner.key) {
    return postal.channel(`${name}_${partner.key}`);
  }

  return postal.channel(`${name}`);
};

export const $sub = {
  def: (eventId, func, channel = undefined) => {
    return $chan(channel).subscribe(eventId, func);
  },
  transactions: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.TRANSACTIONS, partner).subscribe(eventId, func);
  },
  file: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.FILE, partner).subscribe(eventId, func);
  },
  data: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.DATA, partner).subscribe(eventId, func);
  },
  metrics: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.METRICS, partner).subscribe(eventId, func);
  },
  formCommand: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.FORM_COMMAND, partner).subscribe(eventId, func);
  },
  workFlow: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.WORKFLOW, partner).subscribe(eventId, func);
  },
  messageHandlerLoaded: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.CROSS_ORIGIN, partner).subscribe(eventId, func);
  },
  pluginLoaded: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.PLUGINS, partner).subscribe(eventId, func);
  },
  system: (eventId, func, partner) => {
    return $chan(DEFAULT_CHANNELS.SYSTEM, partner).subscribe(eventId, func);
  },
};

export const $pub = {
  def: (eventId, data, channel = undefined) => $chan(channel).publish(eventId, data),
  transactions: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.TRANSACTIONS, partner).publish(eventId, data),
  file: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.FILE, partner).publish(eventId, data),
  data: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.DATA, partner).publish(eventId, data),
  metrics: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.METRICS, partner).publish(eventId, data),
  formCommand: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.FORM_COMMAND, partner).publish(eventId, formData),
  workFlow: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.WORKFLOW, partner).publish(eventId, data),
  messageHandlerLoaded: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.CROSS_ORIGIN, partner).publish(eventId, data),
  pluginLoaded: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.PLUGINS, partner).publish(eventId, data),
  system: (eventId: string, data?: any, partner?: Reactory.Models.IReactoryClient ) => $chan(DEFAULT_CHANNELS.SYSTEM, partner).publish(eventId, data),
};


router.get('/', (request, response) => {
  response.send({ ok: true, message: 'POSTAL-OK' });
});

router.post('/', (request, response) => {
  response.send({ ok: true, message: 'POSTAL-OK' });
});


export default {
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

