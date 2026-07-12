import Reactory from "@reactorynet/reactory-core";
import { service } from "@reactory/server-core/application/decorators";
import { QueueProvider } from "@reactory/server-  modules/reactory-queue/services/queue/QueueProvider";
import { EventEnvelope } from "@reactory/server-modules/reactory-queue/services/queue/types";

export interface IQueueListenerConfig {
  queues: string[];
  pollInterval?: number;
}

export type WorkflowInvoker = (workflowId: string, input: any, context: Reactory.Server.IReactoryContext) => Promise<any>;

@service({
  id: 'reactory.WorkflowQueueListener@1.0.0',
  nameSpace: 'reactory',
  name: 'WorkflowQueueListener',
  version: '1.0.0',
  description: "Listens to specified queues and invokes workflows",
  dependencies: [
    { id: 'reactory.QueueProvider@1.0.0', alias: 'queueProvider' }
  ],
  serviceType: 'workflow',
  roles: ['SYSTEM']
})
export class QueueListener implements Reactory.Service.IReactoryDefaultService {
  
  description?: string;
  tags?: string[];
  nameSpace: string;
  name: string;
  version: string;

  props: any;
  context: Reactory.Server.IReactoryContext;

  private queueProvider: QueueProvider;
  private config: IQueueListenerConfig;
  private isListening: boolean = false;
  private pollIntervalIds: Map<string, NodeJS.Timeout> = new Map();
  private workflowInvoker: WorkflowInvoker | null = null;
  private activeQueues: Set<string> = new Set();

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    
    // Load config from props or default
    this.config = props?.config || {
      queues: [],
      pollInterval: 5000 // default 5 seconds
    };
  }

  /**
   * Service lifecycle hook - called when the service starts
   */
  async onStartup(): Promise<void> {
    this.queueProvider = this.context.getService('reactory.QueueProvider@1.0.0') as QueueProvider;
    if (!this.queueProvider) {
      this.context.error('QueueProvider not found. QueueListener cannot start.', null, 'QueueListener.onStartup');
      return;
    }
    this.context.log('QueueListener starting up', 'QueueListener.onStartup');
  }

  /**
   * Set the function to be called when a workflow needs to be invoked
   */
  setWorkflowInvoker(invoker: WorkflowInvoker) {
    this.workflowInvoker = invoker;
  }

  /**
   * Start listening to the specified queues
   */
  startListening(queues?: string[]) {
    if (this.isListening) {
      this.context.warn('QueueListener is already listening', 'QueueListener.startListening');
      return;
    }

    if (!this.workflowInvoker) {
      this.context.error('WorkflowInvoker not set. Cannot start listening.', null, 'QueueListener.startListening');
      return;
    }

    const queuesToListen = queues || this.config.queues;
    
    if (!queuesToListen || queuesToListen.length === 0) {
      this.context.warn('No queues configured to listen to.', 'QueueListener.startListening');
      return;
    }

    this.isListening = true;
    
    for (const queueId of queuesToListen) {
      this.subscribeToQueue(queueId);
    }
    
    this.context.log(`Started listening to queues: ${queuesToListen.join(', ')}`, 'QueueListener.startListening');
  }

  /**
   * Stop listening to all queues
   */
  stopListening() {
    this.isListening = false;
    for (const [queueId, timeoutId] of this.pollIntervalIds.entries()) {
      clearTimeout(timeoutId);
    }
    this.pollIntervalIds.clear();
    this.activeQueues.clear();
    this.context.log('Stopped listening to all queues', 'QueueListener.stopListening');
  }

  /**
   * Subscribe to a specific queue
   */
  subscribeToQueue(queueId: string) {
    if (this.activeQueues.has(queueId)) {
      return;
    }
    
    this.activeQueues.add(queueId);
    this.pollQueue(queueId);
  }

  /**
   * Unsubscribe from a specific queue
   */
  unsubscribeFromQueue(queueId: string) {
    this.activeQueues.delete(queueId);
    const timeoutId = this.pollIntervalIds.get(queueId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.pollIntervalIds.delete(queueId);
    }
  }

  /**
   * Poll a specific queue for messages
   */
  private async pollQueue(queueId: string) {
    if (!this.isListening || !this.activeQueues.has(queueId)) {
      return;
    }

    try {
      const queueService = this.queueProvider.getDefaultProvider();
      if (!queueService) {
        throw new Error("No default queue provider available");
      }

      // We use receiveMessages instead of dequeue to potentially get multiple messages
      // but for now we'll just process them one by one
      const messages = await queueService.receiveMessages({ queueId, max: 10 });
      
      if (messages && messages.length > 0) {
        for (const message of messages) {
          await this.processMessage(queueId, message);
        }
      }
    } catch (error) {
      this.context.error(`Error polling queue ${queueId}`, error, 'QueueListener.pollQueue');
    } finally {
      // Schedule next poll if still listening
      if (this.isListening && this.activeQueues.has(queueId)) {
        const timeoutId = setTimeout(() => this.pollQueue(queueId), this.config.pollInterval || 5000);
        this.pollIntervalIds.set(queueId, timeoutId);
      }
    }
  }

  /**
   * Process a received message
   */
  private async processMessage(queueId: string, message: EventEnvelope) {
    try {
      // Validate message structure
      const rawData = message.body as any;
      
      if (!rawData || !rawData.workflowId) {
        this.context.warn(`Received message on ${queueId} without workflowId. Ignoring.`, 'QueueListener.processMessage');
        await this.deleteMessage(queueId, message.header.id);
        return;
      }

      const { workflowId, id, data } = rawData;
      
      this.context.log(`Processing workflow request ${workflowId} (msg: ${id}) from ${queueId}`, 'QueueListener.processMessage');
      
      if (this.workflowInvoker) {
        // Execute the workflow
        // The data object should contain input, signature, sent as per requirement
        await this.workflowInvoker(workflowId, data, this.context);
      }
      
      // Delete message after successful processing
      await this.deleteMessage(queueId, message.header.id);
      
    } catch (error) {
      this.context.error(`Error processing message ${message.header.id} from queue ${queueId}`, error, 'QueueListener.processMessage');
      // Depending on retry logic, we might not want to delete the message here
      // But for simplicity, we'll log the error. The message might be re-processed or moved to DLQ by the provider
    }
  }

  private async deleteMessage(queueId: string, messageId: string) {
     try {
        const queueService = this.queueProvider.getDefaultProvider();
        if (queueService) {
           // Provide DeleteMessageOptions
           await queueService.deleteMessage(messageId, { queueId, reason: 'processed' });
        }
     } catch (err) {
         this.context.error(`Failed to delete message ${messageId} from ${queueId}`, err, 'QueueListener.deleteMessage');
     }
  }

  toString(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}${includeVersion ? '@' + this.version : ''}`;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): void {
    this.context = context;
  }
}
