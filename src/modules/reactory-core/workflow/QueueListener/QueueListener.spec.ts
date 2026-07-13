import Reactory from "@reactorynet/reactory-core";
import { QueueListener } from "./QueueListener";

// Mock the Reactory module
jest.mock("@reactorynet/reactory-core", () => {
  const mockContext = {
    getService: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  return {
    __esModule: true,
    default: {
      Service: {
        IReactoryDefaultService: jest.fn(),
      },
    },
    Server: {
      IReactoryContext: jest.fn(),
    },
  };
});

// Mock the decorators
jest.mock("@reactory/server-core/application/decorators", () => ({
  service: (config: any) => (target: any) => target,
}));

// Mock the QueueProvider
jest.mock("@reactory/server-modules/reactory-queue/services/queue/QueueProvider", () => {
  return jest.fn().mockImplementation(() => ({
    getDefaultProvider: jest.fn(),
  }));
});

// Mock the types
jest.mock("@reactory/server-modules/reactory-queue/services/queue/types", () => ({
  EventEnvelope: {
    header: {
      id: "test-id",
    },
    body: {},
  },
  DeleteMessageOptions: {
    queueId: "test-queue",
    reason: "processed",
  },
  ReceiveMessageOptions: {
    queueId: "test-queue",
    max: 10,
  },
}));

describe("QueueListener", () => {
  let queueListener: QueueListener;
  let mockContext: any;
  let mockQueueProvider: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockContext = {
      getService: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    mockQueueProvider = {
      getDefaultProvider: jest.fn(),
    };

    mockContext.getService.mockReturnValue(mockQueueProvider);
  });

  describe("constructor", () => {
    it("should create an instance with default config", () => {
      const props = { queues: ["queue1", "queue2"] };
      queueListener = new QueueListener(props, mockContext);

      expect(queueListener).toBeDefined();
      expect(queueListener.config.queues).toEqual(["queue1", "queue2"]);
      expect(queueListener.config.pollInterval).toBe(5000);
    });

    it("should create an instance with custom pollInterval", () => {
      const props = { queues: ["queue1"], pollInterval: 10000 };
      queueListener = new QueueListener(props, mockContext);

      expect(queueListener.config.pollInterval).toBe(10000);
    });
  });

  describe("onStartup", () => {
    it("should throw if QueueProvider is not found", async () => {
      mockContext.getService.mockReturnValue(undefined);

      await expect(queueListener.onStartup()).rejects.toThrow("QueueProvider not found");
    });

    it("should log startup message", async () => {
      await queueListener.onStartup();

      expect(mockContext.log).toHaveBeenCalledWith(
        "QueueListener starting up",
        "QueueListener.onStartup"
      );
    });
  });

  describe("onShutdown", () => {
    it("should stop listening when shutting down", async () => {
      queueListener.startListening(["queue1"]);
      await queueListener.onShutdown();

      expect(mockContext.log).toHaveBeenCalledWith(
        "QueueListener shut down cleanly",
        "QueueListener.onShutdown"
      );
    });
  });

  describe("setWorkflowInvoker", () => {
    it("should set the workflow invoker", () => {
      const invoker = jest.fn().mockResolvedValue(undefined);
      queueListener.setWorkflowInvoker(invoker);

      expect(queueListener.workflowInvoker).toBe(invoker);
    });
  });

  describe("startListening", () => {
    it("should throw if WorkflowInvoker is not set", () => {
      expect(() => queueListener.startListening()).toThrow("WorkflowInvoker not set");
    });

    it("should warn if no queues are configured", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening([]);

      expect(mockContext.warn).toHaveBeenCalledWith(
        "No queues configured to listen to.",
        "QueueListener.startListening"
      );
    });

    it("should not start listening if already listening", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1"]);
      queueListener.startListening(["queue2"]);

      expect(mockContext.warn).toHaveBeenCalledWith(
        "QueueListener is already listening",
        "QueueListener.startListening"
      );
    });

    it("should start listening to specified queues", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1", "queue2"]);

      expect(queueListener.isListening).toBe(true);
      expect(queueListener.activeQueues.size).toBe(2);
    });

    it("should log started queues", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1"]);

      expect(mockContext.log).toHaveBeenCalledWith(
        "Started listening to queues: queue1",
        "QueueListener.startListening"
      );
    });
  });

  describe("stopListening", () => {
    it("should stop listening and clear timers", () => {
      queueListener.startListening(["queue1"]);
      queueListener.stopListening();

      expect(queueListener.isListening).toBe(false);
      expect(queueListener.pollIntervalIds.size).toBe(0);
      expect(queueListener.activeQueues.size).toBe(0);
    });
  });

  describe("subscribeToQueue", () => {
    it("should not subscribe to an already active queue", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1"]);
      queueListener.subscribeToQueue("queue1");

      expect(queueListener.activeQueues.size).toBe(1);
    });

    it("should subscribe to a new queue", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1"]);
      queueListener.subscribeToQueue("queue2");

      expect(queueListener.activeQueues.size).toBe(2);
    });
  });

  describe("unsubscribeFromQueue", () => {
    it("should unsubscribe from a queue", () => {
      queueListener.setWorkflowInvoker(jest.fn());
      queueListener.startListening(["queue1"]);
      queueListener.unsubscribeFromQueue("queue1");

      expect(queueListener.activeQueues.size).toBe(0);
    });
  });
});
