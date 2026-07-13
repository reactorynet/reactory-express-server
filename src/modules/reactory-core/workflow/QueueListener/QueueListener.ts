import Reactory from "@reactorynet/reactory-core";
import { service } from "@reactory/server-core/application/decorators";
import { QueueProvider } from "@reactory/server-modules/reactory-queue/services/queue/QueueProvider";
import { EventEnvelope, DeleteMessageOptions, ReceiveMessageOptions } from "@reactory/server-modules/reactory-queue/services/queue/types";

export interface IQueueListenerConfig {
  queues: string[];
  pollInterval?: number;
}

export type WorkflowInvoker = (workflowId: string, input: unknown, context: Reactory.Server.IReactoryContext) => Promise<unknown>;

@service({
  id: "reactory.WorkflowQueueListener@1.0.0",
  nameSpace: "reactory",
  name: "WorkflowQueueListener",
  version: "1.0.0",
  description: "Listens to specified queues and invokes workflows",
  dependencies: [
    { id: "reactory.QueueProvider@1.0.0", alias: "queueProvider" }
  ],
  serviceType: "workflow",
  roles: ["SYSTEM"]
})
export class QueueListener implements Reactory.Service.IReactoryDefaultService {
  description?: string;
  tags?: string[];
  nameSpace: string;
  name: string;
  version: string;

  props: IQueueListenerConfig;
  context: Reactory.Server.IReactoryContext;

  private queueProvider: QueueProvider;
  private config: IQueueListenerConfig;
  private isListening: boolean = false;
  private pollIntervalIds: Map<string, NodeJS.Timeout> = new Map();
  private workflowInvoker: WorkflowInvoker | null = null;
  private activeQueues: Set<string> = new Set();

  constructor(props: IQueueListenerConfig, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
    this.config = {
      queues: props.queues,
      pollInterval: props.pollInterval ?? 5000,
    };
  }

  /**
   * Service lifecycle hook - called when the service starts
   */
  async onStartup(): Promise<void> {
    this.queueProvider = this.context.getService("reactory.QueueProvider@1.0.0") as QueueProvider;
    if (!this.queueProvider) {
      const error = new Error("QueueProvider not found. QueueListener cannot start.");
      this.context.error(error.message, error, "QueueListener.onStartup");
      throw error;
    }
    this.context.log("QueueListener starting up", "QueueListener.onStartup");
  }

  /**
   * Service lifecycle hook - called when the service shuts down
   */
  async onShutdown(): Promise<void> {
    this.stopListening();
    this.context.log("QueueListener shut down cleanly", "QueueListener.onShutdown");
  }

  /**
   * Set the function to be called when a workflow needs to be invoked
   */
  setWorkflowInvoker(invoker: WorkflowInvoker): void {
    this.workflowInvoker = invoker;
  }

  /**
   * Start listening to the specified queues
   */
  startListening(queues?: string[]): void {
    if (this.isListening) {
      this.context.warn("QueueListener is already listening", "QueueListener.startListening");
      return;
    }

    if (!this.workflowInvoker) {
      const error = new Error("WorkflowInvoker not set. Cannot start listening.");
      this.context.error(error.message, error, "QueueListener.startListening");
      throw error;
    }

    const queuesToListen = queues ?? this.config.queues;

    if (!queuesToListen || queuesToListen.length === 0) {
      this.context.warn("No queues configured to listen to.", "QueueListener.startListening");
      return;
    }

    this.isListening = true;

    for (const queueId of queuesToListen) {
      this.subscribeToQueue(queueId);
    }

    this.context.log(`Started listening to queues: ${queuesToListen.join(", ")}`, "QueueListener.startListening");
  }

  /**
   * Stop listening to all queues
   */
  stopListening(): void {
    this.isListening = false;
    for (const [queueId, timeoutId] of this.pollIntervalIds.entries()) {
      clearTimeout(timeoutId);
    }
    this.pollIntervalIds.clear();
    this.activeQueues.clear();
    this.context.log("Stopped listening to all queues", "QueueListener.stopListening");
  }

  /**
   * Subscribe to a specific queue
   */
  subscribeToQueue(queueId: string): void {
    if (this.activeQueues.has(queueId)) {
      return;
    }

    this.activeQueues.add(queueId);
    this.pollQueue(queueId);
  }

  /**
   * Unsubscribe from a specific queue
   */
  unsubscribeFromQueue(queueId: string): void {
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
  private async pollQueue(queueId: string): Promise<void> {
    if (!this.isListening || !this.activeQueues.has(queueId)) {
      return;
    }

    try {
      const queueService = this.queueProvider.getDefaultProvider();
      if (!queueService) {
        throw new Error("No default queue provider available");
      }

      const messages = await queueService.receiveMessages({ queueId, max: 10 } as ReceiveMessageOptions);

      if (messages && messages.length > 0) {
        for (const message of messages) {
          await this.processMessage(queueId, message);
        }
      }
    } catch (error) {
      this.context.error(`Error polling queue ${queueId}`, error, "QueueListener.pollQueue");
    } finally {
      if (this.isListening && this.activeQueues.has(queueId)) {
        const timeoutId = setTimeout(() => this.pollQueue(queueId), this.config.pollInterval);
        this.pollIntervalIds.set(queueId, timeoutId);
      }
    }
  }

  /**
   * Process a received message
   */
  private async processMessage(queueId: string, message: EventEnvelope): Promise<void> {
    try {
      const body = message.body as Record<string, unknown>;

      if (!body || typeof body !== "object" || !body.workflowId) {
        this.context.warn(
          `Received message on ${queueId} without workflowId. Ignoring.`,
          "QueueListener.processMessage"
        );
        await this.deleteMessage(queueId, message.header.id);
        return;
      }

      const { workflowId, id, data } = body;

      this.context.log(`Processing workflow request ${workflowId} (msg: ${id}) from ${queueId}`, "QueueListener.processMessage");

      if (this.workflowInvoker) {
        await this.workflowInvoker(workflowId, data ?? {}, this.context);
      }

      await this.deleteMessage(queueId, message.header.id);

    } catch (error) {
      this.context.error(`Error processing message ${message.header.id} from queue ${queueId}`, error, "QueueListener.processMessage");
      // Do not delete the message on error — the provider may retry it.
    }
  }

  private async deleteMessage(queueId: string, messageId: string): Promise<void> {
    try {
      const queueService = this.queueProvider.getDefaultProvider();
      if (queueService) {
        await queueService.deleteMessage(messageId, { queueId, reason: "processed" } as DeleteMessageOptions);
      }
    } catch (err) {
      this.context.error(`Failed to delete message ${messageId} from ${queueId}`, err, "QueueListener.deleteMessage");
    }
  }

  toString(includeVersion?: boolean): string {
    return `${this.nameSpace}.${this.name}${includeVersion ? "@" + this.version : ""}`;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): void {
    this.context = context;
  }
}
