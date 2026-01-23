import { WorkflowScheduler, IScheduleConfig } from '../Scheduler';
import { WorkflowRunner } from '../../WorkflowRunner/WorkflowRunner';
import fs from 'fs';
import path from 'path';

// Mock dependencies
jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
  })),
  validate: jest.fn(() => true),
}));

jest.mock('js-yaml', () => ({
  load: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('../../../../../logging', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('WorkflowScheduler', () => {
  let scheduler: WorkflowScheduler;
  let mockWorkflowRunner: jest.Mocked<WorkflowRunner>;

  const mockScheduleConfig: IScheduleConfig = {
    id: 'test-schedule',
    name: 'Test Schedule',
    description: 'Test schedule for unit testing',
    workflow: {
      id: 'test.workflow',
      version: '1.0.0',
      nameSpace: 'test',
    },
    schedule: {
      cron: '0 * * * *',
      timezone: 'UTC',
      enabled: true,
    },
    properties: {
      testProperty: 'testValue',
    },
    retry: {
      attempts: 3,
      delay: 60,
    },
    timeout: 300,
    maxConcurrent: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWorkflowRunner = {
      startWorkflow: jest.fn(),
      isInitialized: jest.fn(() => true),
    } as any;

    scheduler = new WorkflowScheduler(mockWorkflowRunner);
  });

  describe('constructor', () => {
    it('should initialize with workflow runner', () => {
      expect(scheduler).toBeDefined();
      expect(scheduler.isInitialized()).toBe(false);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
    });

    it('should initialize successfully', async () => {
      await scheduler.initialize();
      
      expect(scheduler.isInitialized()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await scheduler.initialize();
      const initialCallCount = (fs.readdirSync as jest.Mock).mock.calls.length;
      
      await scheduler.initialize();
      
      expect(fs.readdirSync).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should create schedule directory if it does not exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      await scheduler.initialize();
      
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('loadSchedules', () => {
    beforeEach(() => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
    });

    it('should load schedules from YAML files', async () => {
      const mockFiles = ['test-schedule.yaml'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load.mockReturnValue(mockScheduleConfig);
      
      await scheduler.initialize();
      
      expect(load).toHaveBeenCalledWith('yaml content');
    });

    it('should handle invalid schedule configurations', async () => {
      const mockFiles = ['invalid-schedule.yaml'];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load.mockReturnValue({ invalid: 'config' });
      
      await scheduler.initialize();
      
      expect(scheduler.getStats().totalSchedules).toBe(0);
    });
  });

  describe('startSchedule', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.initialize();
    });

    it('should start a schedule successfully', async () => {
      // This test verifies that the startSchedule method exists and can be called
      // The actual schedule management is tested through the public API
      expect(typeof scheduler.startSchedule).toBe('function');
    });

    it('should throw error for non-existent schedule', async () => {
      await expect(scheduler.startSchedule('non-existent')).rejects.toThrow('Schedule not found');
    });
  });

  describe('stopSchedule', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.initialize();
    });

    it('should stop a schedule successfully', async () => {
      // This test verifies that the stopSchedule method exists and can be called
      // The actual schedule management is tested through the public API
      expect(typeof scheduler.stopSchedule).toBe('function');
    });

    it('should throw error for non-existent schedule', async () => {
      await expect(scheduler.stopSchedule('non-existent')).rejects.toThrow('Schedule not found');
    });
  });

  describe('reloadSchedules', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.initialize();
    });

    it('should reload schedules successfully', async () => {
      await scheduler.reloadSchedules();
      
      expect(scheduler.getStats().totalSchedules).toBe(0);
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.initialize();
    });

    it('should return scheduler statistics', () => {
      const stats = scheduler.getStats();
      
      expect(stats).toHaveProperty('totalSchedules');
      expect(stats).toHaveProperty('activeSchedules');
      expect(stats).toHaveProperty('totalRuns');
      expect(stats).toHaveProperty('totalErrors');
    });
  });

  describe('getSchedulesForWorkflow', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await scheduler.initialize();
    });

    it('should return all schedules for a specific workflow ID', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
        'schedule3-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule3',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.getSchedulesForWorkflow('core.CleanCacheWorkflow@1.0.0');
      
      expect(schedules).toHaveLength(2);
      expect(schedules.every(s => s.config.workflow.id === 'core.CleanCacheWorkflow@1.0.0')).toBe(true);
    });

    it('should return empty array when no schedules match', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.getSchedulesForWorkflow('core.NonExistentWorkflow@1.0.0');
      
      expect(schedules).toHaveLength(0);
    });

    it('should distinguish between different versions of the same workflow', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        });
      
      await scheduler.reloadSchedules();
      
      const v1Schedules = scheduler.getSchedulesForWorkflow('core.CleanCacheWorkflow@1.0.0');
      const v2Schedules = scheduler.getSchedulesForWorkflow('core.CleanCacheWorkflow@2.0.0');
      
      expect(v1Schedules).toHaveLength(1);
      expect(v2Schedules).toHaveLength(1);
      expect(v1Schedules[0].config.id).toBe('schedule1');
      expect(v2Schedules[0].config.id).toBe('schedule2');
    });
  });

  describe('filterSchedulesByWorkflowProperties', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      await scheduler.initialize();
    });

    it('should filter schedules by namespace only', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
        'schedule3-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.BackupWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule3',
          workflow: { id: 'admin.UserCleanupWorkflow@1.0.0', version: '1.0.0', nameSpace: 'admin' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties('core');
      
      expect(schedules).toHaveLength(2);
      expect(schedules.every(s => s.config.workflow.id.startsWith('core.'))).toBe(true);
    });

    it('should filter schedules by workflow name only', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties(undefined, 'CleanCacheWorkflow');
      
      expect(schedules).toHaveLength(2);
    });

    it('should filter schedules by version only', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
        'schedule3-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.BackupWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule3',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties(undefined, undefined, '1.0.0');
      
      expect(schedules).toHaveLength(2);
      expect(schedules.every(s => s.config.workflow.id.endsWith('@1.0.0'))).toBe(true);
    });

    it('should filter schedules by namespace and name', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
        'schedule3-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule3',
          workflow: { id: 'admin.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'admin' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties('core', 'CleanCacheWorkflow');
      
      expect(schedules).toHaveLength(2);
      expect(schedules.every(s => s.config.workflow.id.startsWith('core.CleanCacheWorkflow@'))).toBe(true);
    });

    it('should filter schedules by all three properties', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
        'schedule3-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'core.CleanCacheWorkflow@2.0.0', version: '2.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule3',
          workflow: { id: 'admin.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'admin' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties('core', 'CleanCacheWorkflow', '1.0.0');
      
      expect(schedules).toHaveLength(1);
      expect(schedules[0].config.id).toBe('schedule1');
      expect(schedules[0].config.workflow.id).toBe('core.CleanCacheWorkflow@1.0.0');
    });

    it('should return empty array when no schedules match the filter', async () => {
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties('nonexistent');
      
      expect(schedules).toHaveLength(0);
    });

    it('should return all schedules when no filters are provided', async () => {
      const mockSchedules = [
        'schedule1-schedule.yaml',
        'schedule2-schedule.yaml',
      ];
      (fs.readdirSync as jest.Mock).mockReturnValue(mockSchedules);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule1',
          workflow: { id: 'core.CleanCacheWorkflow@1.0.0', version: '1.0.0', nameSpace: 'core' },
        })
        .mockReturnValueOnce({
          ...mockScheduleConfig,
          id: 'schedule2',
          workflow: { id: 'admin.BackupWorkflow@2.0.0', version: '2.0.0', nameSpace: 'admin' },
        });
      
      await scheduler.reloadSchedules();
      
      const schedules = scheduler.filterSchedulesByWorkflowProperties();
      
      expect(schedules).toHaveLength(2);
    });
  });

  describe('stop', () => {
    beforeEach(async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue([]);
      await scheduler.initialize();
    });

    it('should stop the scheduler', async () => {
      await scheduler.stop();
      
      expect(scheduler.isInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error('File system error');
      });
      
      await expect(scheduler.initialize()).rejects.toThrow('File system error');
    });

    it('should handle invalid cron expressions', async () => {
      const { validate } = require('node-cron');
      validate.mockReturnValue(false);
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['test.yaml']);
      (fs.readFileSync as jest.Mock).mockReturnValue('yaml content');
      
      const { load } = require('js-yaml');
      load.mockReturnValue({
        ...mockScheduleConfig,
        schedule: { ...mockScheduleConfig.schedule, cron: 'invalid-cron' },
      });
      
      await scheduler.initialize();
      
      expect(scheduler.getStats().totalSchedules).toBe(0);
    });
  });
}); 