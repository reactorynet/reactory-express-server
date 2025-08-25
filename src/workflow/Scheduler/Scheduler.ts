import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import cron from 'node-cron';
import moment from 'moment';
import logger from '../../logging';
import { WorkflowRunner } from '../WorkflowRunner/WorkflowRunner';
import { IWorkflow } from '../WorkflowRunner/WorkflowRunner';

export interface IScheduleConfig {
  id: string;
  name: string;
  description?: string;
  workflow: {
    id: string;
    version: string;
    nameSpace?: string;
  };
  schedule: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  properties?: Record<string, any>;
  retry?: {
    attempts: number;
    delay: number; // in seconds
  };
  timeout?: number; // in seconds
  maxConcurrent?: number;
}

export interface IScheduledWorkflow {
  config: IScheduleConfig;
  task: any; // cron.ScheduledTask
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
  isRunning: boolean;
}

export interface ISchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  totalRuns: number;
  totalErrors: number;
  lastRun?: Date;
}

export class WorkflowScheduler {
  private workflowRunner: WorkflowRunner;
  private schedules: Map<string, IScheduledWorkflow> = new Map();
  private stats: ISchedulerStats = {
    totalSchedules: 0,
    activeSchedules: 0,
    totalRuns: 0,
    totalErrors: 0,
  };
  private _isInitialized: boolean = false;
  private scheduleDirectory: string;

  constructor(workflowRunner: WorkflowRunner) {
    this.workflowRunner = workflowRunner;
    this.scheduleDirectory = path.join(process.env.APP_DATA_ROOT || './data', 'workflows');
  }

  /**
   * Initialize the scheduler
   */
  public async initialize(): Promise<void> {
    if (this._isInitialized) {
      logger.warn('WorkflowScheduler already initialized');
      return;
    }

    try {
      logger.info('Initializing WorkflowScheduler');
      
      // Ensure the schedule directory exists
      await this.ensureScheduleDirectory();
      
      // Load all schedule configurations
      await this.loadSchedules();
      
      // Start all enabled schedules
      await this.startSchedules();
      
      this._isInitialized = true;
      logger.info(`WorkflowScheduler initialized with ${this.schedules.size} schedules`);
    } catch (error) {
      logger.error('Failed to initialize WorkflowScheduler', error);
      throw error;
    }
  }

  /**
   * Ensure the schedule directory exists
   */
  private async ensureScheduleDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.scheduleDirectory)) {
        fs.mkdirSync(this.scheduleDirectory, { recursive: true });
        logger.debug(`Created schedule directory: ${this.scheduleDirectory}`);
      }
    } catch (error) {
      logger.error(`Failed to create schedule directory: ${this.scheduleDirectory}`, error);
      throw error;
    }
  }

  /**
   * Load all schedule configurations from YAML files
   */
  private async loadSchedules(): Promise<void> {
    try {
      const files = await this.getScheduleFiles();
      
      for (const file of files) {
        try {
          const config = await this.loadScheduleFromFile(file);
          if (config) {
            this.addSchedule(config);
          }
        } catch (error) {
          logger.error(`Failed to load schedule from file: ${file}`, error);
          // Continue loading other files
        }
      }
      
      logger.info(`Loaded ${this.schedules.size} schedule configurations`);
    } catch (error) {
      logger.error('Failed to load schedules', error);
      throw error;
    }
  }

  /**
   * Get all schedule YAML files
   */
  private async getScheduleFiles(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.scheduleDirectory)) {
        return [];
      }

      const files = fs.readdirSync(this.scheduleDirectory);
      return files
        .filter(file => file.endsWith('-schedule.yaml') || file.endsWith('-schedule.yml'))
        .map(file => path.join(this.scheduleDirectory, file));
    } catch (error) {
      logger.error('Failed to read schedule directory', error);
      return [];
    }
  }

  /**
   * Load a single schedule configuration from file
   */
  private async loadScheduleFromFile(filePath: string): Promise<IScheduleConfig | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const config = yaml.load(content) as IScheduleConfig;
      
      // Validate the configuration
      if (!this.validateScheduleConfig(config)) {
        logger.warn(`Invalid schedule configuration in file: ${filePath}`);
        return null;
      }
      
      return config;
    } catch (error) {
      logger.error(`Failed to load schedule from file: ${filePath}`, error);
      return null;
    }
  }

  /**
   * Validate a schedule configuration
   */
  private validateScheduleConfig(config: any): config is IScheduleConfig {
    return !!(
      config &&
      config.id &&
      config.name &&
      config.workflow &&
      config.workflow.id &&
      config.workflow.version &&
      config.schedule &&
      config.schedule.cron
    );
  }

  /**
   * Add a schedule to the scheduler
   */
  private addSchedule(config: IScheduleConfig): void {
    try {
      // Validate cron expression
      if (!cron.validate(config.schedule.cron)) {
        logger.error(`Invalid cron expression for schedule ${config.id}: ${config.schedule.cron}`);
        return;
      }

      const scheduledWorkflow: IScheduledWorkflow = {
        config,
        task: null as any, // Will be set when starting
        runCount: 0,
        errorCount: 0,
        isRunning: false,
      };

      this.schedules.set(config.id, scheduledWorkflow);
      logger.debug(`Added schedule: ${config.id} (${config.name})`);
    } catch (error) {
      logger.error(`Failed to add schedule ${config.id}`, error);
    }
  }

  /**
   * Start all enabled schedules
   */
  private async startSchedules(): Promise<void> {
    for (const [id, scheduledWorkflow] of this.schedules) {
      try {
        if (scheduledWorkflow.config.schedule.enabled !== false) {
          await this.startSchedule(id);
        }
      } catch (error) {
        logger.error(`Failed to start schedule ${id}`, error);
      }
    }
  }

  /**
   * Start a specific schedule
   */
  public async startSchedule(scheduleId: string): Promise<void> {
    const scheduledWorkflow = this.schedules.get(scheduleId);
    if (!scheduledWorkflow) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    try {
      const { config } = scheduledWorkflow;
      
      // Create the cron task
      const task = cron.schedule(
        config.schedule.cron,
        async () => {
          await this.executeScheduledWorkflow(scheduleId);
        },
        {
          timezone: config.schedule.timezone || 'UTC',
        }
      );

      scheduledWorkflow.task = task;
      scheduledWorkflow.nextRun = this.getNextRun(config.schedule.cron, config.schedule.timezone);
      
      // Start the task
      task.start();
      
      this.stats.activeSchedules++;
      logger.info(`Started schedule: ${config.id} (${config.name}) - Next run: ${scheduledWorkflow.nextRun}`);
    } catch (error) {
      logger.error(`Failed to start schedule ${scheduleId}`, error);
      throw error;
    }
  }

  /**
   * Stop a specific schedule
   */
  public async stopSchedule(scheduleId: string): Promise<void> {
    const scheduledWorkflow = this.schedules.get(scheduleId);
    if (!scheduledWorkflow) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    try {
      if (scheduledWorkflow.task) {
        scheduledWorkflow.task.stop();
        scheduledWorkflow.task.destroy();
        scheduledWorkflow.task = null as any;
      }
      
      this.stats.activeSchedules--;
      logger.info(`Stopped schedule: ${scheduleId}`);
    } catch (error) {
      logger.error(`Failed to stop schedule ${scheduleId}`, error);
      throw error;
    }
  }

  /**
   * Execute a scheduled workflow
   */
  private async executeScheduledWorkflow(scheduleId: string): Promise<void> {
    const scheduledWorkflow = this.schedules.get(scheduleId);
    if (!scheduledWorkflow) {
      logger.error(`Schedule not found during execution: ${scheduleId}`);
      return;
    }

    const { config } = scheduledWorkflow;
    
    // Check if already running and max concurrent limit
    if (scheduledWorkflow.isRunning && config.maxConcurrent === 1) {
      logger.warn(`Schedule ${scheduleId} is already running, skipping execution`);
      return;
    }

    try {
      scheduledWorkflow.isRunning = true;
      scheduledWorkflow.lastRun = new Date();
      scheduledWorkflow.runCount++;

      logger.info(`Executing scheduled workflow: ${config.id} (${config.name})`);

      // Prepare workflow data
      const workflowData = {
        ...config.properties,
        scheduledAt: scheduledWorkflow.lastRun.toISOString(),
        scheduleId: config.id,
        runCount: scheduledWorkflow.runCount,
        nameSpace: config.workflow.nameSpace,
      };

      // Execute the workflow with retry logic
      await this.executeWorkflowWithRetry(
        config.workflow.id,
        config.workflow.version,
        workflowData,
        config.retry
      );

      // Update next run time
      scheduledWorkflow.nextRun = this.getNextRun(config.schedule.cron, config.schedule.timezone);
      
      this.stats.totalRuns++;
      logger.info(`Successfully executed scheduled workflow: ${config.id}`);
    } catch (error) {
      scheduledWorkflow.errorCount++;
      this.stats.totalErrors++;
      logger.error(`Failed to execute scheduled workflow: ${config.id}`, error);
    } finally {
      scheduledWorkflow.isRunning = false;
    }
  }

  /**
   * Execute workflow with retry logic
   */
  private async executeWorkflowWithRetry(
    workflowId: string,
    version: string,
    data: any,
    retryConfig?: { attempts: number; delay: number }
  ): Promise<void> {
    const maxAttempts = retryConfig?.attempts || 1;
    const delaySeconds = retryConfig?.delay || 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.workflowRunner.startWorkflow(workflowId, version, data);
        return; // Success, exit retry loop
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error; // Last attempt failed
        }
        
        logger.warn(`Workflow execution failed (attempt ${attempt}/${maxAttempts}), retrying in ${delaySeconds}s`, error);
        
        if (delaySeconds > 0) {
          await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
        }
      }
    }
  }

  /**
   * Get the next run time for a cron expression
   */
  private getNextRun(cronExpression: string, timezone?: string): Date {
    try {
      // For now, return current time + 1 hour as a fallback
      // In a real implementation, you'd use a proper cron parser
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + 1);
      return nextRun;
    } catch (error) {
      logger.error(`Failed to calculate next run time for cron: ${cronExpression}`, error);
      return new Date();
    }
  }

  /**
   * Reload schedules from files
   */
  public async reloadSchedules(): Promise<void> {
    try {
      logger.info('Reloading schedules');
      
      // Stop all current schedules
      for (const [id] of this.schedules) {
        await this.stopSchedule(id);
      }
      
      // Clear current schedules
      this.schedules.clear();
      this.stats.activeSchedules = 0;
      
      // Reload from files
      await this.loadSchedules();
      await this.startSchedules();
      
      logger.info(`Reloaded ${this.schedules.size} schedules`);
    } catch (error) {
      logger.error('Failed to reload schedules', error);
      throw error;
    }
  }

  /**
   * Get scheduler statistics
   */
  public getStats(): ISchedulerStats {
    return {
      ...this.stats,
      totalSchedules: this.schedules.size,
    };
  }

  /**
   * Get all schedules
   */
  public getSchedules(): Map<string, IScheduledWorkflow> {
    return new Map(this.schedules);
  }

  /**
   * Get a specific schedule
   */
  public getSchedule(scheduleId: string): IScheduledWorkflow | undefined {
    return this.schedules.get(scheduleId);
  }

  /**
   * Stop the scheduler
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping WorkflowScheduler');
      
      // Stop all schedules
      for (const [id] of this.schedules) {
        await this.stopSchedule(id);
      }
      
      this._isInitialized = false;
      logger.info('WorkflowScheduler stopped');
    } catch (error) {
      logger.error('Failed to stop WorkflowScheduler', error);
      throw error;
    }
  }

  /**
   * Check if scheduler is initialized
   */
  public isInitialized(): boolean {
    return this._isInitialized;
  }
} 