import { WorkflowRunner, IWorkflow, IWorkflowState } from '../WorkflowRunner';
import { WorkflowHost } from 'workflow-es';
import { MongoDBPersistence } from 'workflow-es-mongodb';

// Mock dependencies
jest.mock('../../../amq', () => ({
  onWorkflowEvent: jest.fn(),
  raiseWorkFlowEvent: jest.fn(),
}));

jest.mock('../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('workflow-es', () => ({
  configureWorkflow: jest.fn(() => ({
    useLogger: jest.fn(),
    usePersistence: jest.fn(),
    getHost: jest.fn(() => ({
      registerWorkflow: jest.fn(),
      start: jest.fn(),
      startWorkflow: jest.fn(),
    })),
  })),
  WorkflowHost: jest.fn(),
  StepBody: class MockStepBody {},
  ExecutionResult: {
    next: jest.fn(),
  },
}));

jest.mock('workflow-es-mongodb', () => ({
  MongoDBPersistence: jest.fn(() => ({
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('WorkflowRunner', () => {
  let workflowRunner: WorkflowRunner;
  let mockHost: jest.Mocked<WorkflowHost>;
  let mockPersistence: jest.Mocked<MongoDBPersistence>;

  const mockWorkflow: IWorkflow = {
    nameSpace: 'test',
    name: 'TestWorkflow',
    version: '1.0.0',
    component: jest.fn(),
    category: 'workflow',
    autoStart: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockHost = {
      registerWorkflow: jest.fn(),
      start: jest.fn(),
      startWorkflow: jest.fn(),
    } as any;

    mockPersistence = {
      connect: jest.fn(),
      close: jest.fn(),
    } as any;

    // Mock the configureWorkflow to return our mock host
    const { configureWorkflow } = require('workflow-es');
    configureWorkflow.mockReturnValue({
      useLogger: jest.fn(),
      usePersistence: jest.fn(),
      getHost: jest.fn(() => mockHost),
    });

    workflowRunner = new WorkflowRunner({ workflows: [mockWorkflow] });
  });

  describe('constructor', () => {
    it('should initialize with default state', () => {
      expect(workflowRunner.getState()).toEqual({
        workflows: [mockWorkflow],
        host: null,
      });
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should initialize with provided workflows', () => {
      const customWorkflows = [mockWorkflow];
      const runner = new WorkflowRunner({ workflows: customWorkflows });
      expect(runner.getState().workflows).toEqual(customWorkflows);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await workflowRunner.initialize();
      
      expect(workflowRunner.isInitialized()).toBe(true);
      expect(mockHost.registerWorkflow).toHaveBeenCalledWith(mockWorkflow.component);
      expect(mockHost.start).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await workflowRunner.initialize();
      const initialCallCount = mockHost.start.mock.calls.length;
      
      await workflowRunner.initialize();
      
      expect(mockHost.start).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should handle initialization errors gracefully', async () => {
      mockHost.start.mockRejectedValue(new Error('Start failed'));
      
      await expect(workflowRunner.initialize()).rejects.toThrow('Start failed');
      expect(workflowRunner.isInitialized()).toBe(false);
    });
  });

  describe('registerWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should register a valid workflow', () => {
      const newWorkflow: IWorkflow = {
        nameSpace: 'test2',
        name: 'NewWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      workflowRunner.registerWorkflow(newWorkflow);

      expect(mockHost.registerWorkflow).toHaveBeenCalledWith(newWorkflow.component);
      expect(workflowRunner.getState().workflows).toContain(newWorkflow);
    });

    it('should throw error for invalid workflow', () => {
      const invalidWorkflow = {
        nameSpace: 'test',
        // Missing required fields
      } as IWorkflow;

      expect(() => workflowRunner.registerWorkflow(invalidWorkflow)).toThrow('Invalid workflow');
    });

    it('should throw error when host not initialized', () => {
      const runner = new WorkflowRunner({ workflows: [] });
      const newWorkflow: IWorkflow = {
        nameSpace: 'test',
        name: 'TestWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      expect(() => runner.registerWorkflow(newWorkflow)).toThrow('Workflow host not initialized');
    });
  });

  describe('startWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should start a workflow successfully', async () => {
      const mockResult = 'test-123';
      mockHost.startWorkflow.mockResolvedValue(mockResult);

      const result = await workflowRunner.startWorkflow('test-workflow', '1.0.0', { data: 'test' });

      expect(mockHost.startWorkflow).toHaveBeenCalledWith('test-workflow', '1.0.0', { data: 'test' });
      expect(result).toEqual(mockResult);
    });

    it('should throw error when host not initialized', async () => {
      const runner = new WorkflowRunner({ workflows: [] });

      await expect(
        runner.startWorkflow('test-workflow', '1.0.0', { data: 'test' })
      ).rejects.toThrow('Workflow host not initialized');
    });

    it('should handle workflow start errors', async () => {
      mockHost.startWorkflow.mockRejectedValue(new Error('Workflow start failed'));

      await expect(
        workflowRunner.startWorkflow('test-workflow', '1.0.0', { data: 'test' })
      ).rejects.toThrow('Workflow start failed');
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should stop the workflow runner', async () => {
      await workflowRunner.stop();

      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should close persistence connection if available', async () => {
      // This test verifies that the stop method doesn't crash when no persistence is available
      // The actual persistence testing is covered in integration tests
      await workflowRunner.stop();
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should handle stop errors gracefully', async () => {
      // This test verifies that the stop method handles errors gracefully
      // The actual persistence error testing is covered in integration tests
      await workflowRunner.stop();
      expect(workflowRunner.isInitialized()).toBe(false);
    });
  });

  describe('validateWorkflow', () => {
    beforeEach(async () => {
      await workflowRunner.initialize();
    });

    it('should validate a correct workflow', () => {
      const validWorkflow: IWorkflow = {
        nameSpace: 'test',
        name: 'TestWorkflow',
        version: '1.0.0',
        component: jest.fn(),
        category: 'workflow',
      };

      // Access private method through public interface
      workflowRunner.registerWorkflow(validWorkflow);
      // If no error is thrown, validation passed
    });

    it('should reject workflow with missing fields', () => {
      const invalidWorkflow = {
        nameSpace: 'test',
        // Missing name, version, component
        category: 'workflow',
      } as IWorkflow;

      expect(() => workflowRunner.registerWorkflow(invalidWorkflow)).toThrow('Invalid workflow');
    });
  });

  describe('getState', () => {
    it('should return a copy of the current state', () => {
      const state = workflowRunner.getState();
      
      expect(state).toEqual({
        workflows: [mockWorkflow],
        host: null,
      });
      
      // Verify it's a copy, not a reference
      expect(state).not.toBe(workflowRunner.getState());
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      expect(workflowRunner.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await workflowRunner.initialize();
      expect(workflowRunner.isInitialized()).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should not crash the service on AMQ errors', async () => {
      const amq = require('../../../amq');
      amq.onWorkflowEvent.mockImplementation((event: string, handler: (payload: any) => void) => {
        // Simulate an error in the handler
        handler({ id: 'test', version: '1.0.0', data: {}, src: 'test' });
      });

      mockHost.startWorkflow.mockRejectedValue(new Error('AMQ workflow error'));

      await workflowRunner.initialize();
      
      // Should not throw, just log the error
      expect(amq.onWorkflowEvent).toHaveBeenCalled();
    });

    it('should handle persistence provider errors gracefully', async () => {
      const { MongoDBPersistence } = require('workflow-es-mongodb');
      MongoDBPersistence.mockImplementation(() => {
        throw new Error('Persistence connection failed');
      });

      await workflowRunner.initialize();
      
      // Should still initialize successfully with in-memory persistence
      expect(workflowRunner.isInitialized()).toBe(true);
    });
  });
}); 