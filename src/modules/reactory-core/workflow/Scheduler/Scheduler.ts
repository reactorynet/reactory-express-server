import fs from 'fs';
import os from 'os';
import path from 'path';
import yaml from 'js-yaml';
import cron from 'node-cron';
import moment from 'moment';
import logger from '../../../../logging';
import { WorkflowRunner } from '../WorkflowRunner/WorkflowRunner';
import { IWorkflow } from '../WorkflowRunner/WorkflowRunner';
import { ReactoryAuditService } from '@reactory/server-modules/reactory-core/services/ReactoryAuditService';
import { SchedulerLockModel } from './SchedulerLock.model';

/**
 * Stable identity string for this pod/process. Set REACTORY_POD_ID in the
 * deployment environment (e.g. the Pod name in Kubernetes) for a meaningful
 * value; falls back to hostname + PID so it is always unique.
 */
const POD_IDENTITY: string =
  process.env.REACTORY_POD_ID || `${os.hostname()}-${process.pid}`;

/**
 * How long a lock document lives in MongoDB before the TTL index removes it.
 * Must be comfortably longer than the worst-case workflow execution time so
 * the lock is not reclaimed while a workflow is still running.
 * Default: 10 minutes.  Override via REACTORY_SCHEDULE_LOCK_TTL_MS.
 */
const LOCK_TTL_MS: number =
  Number.parseInt(process.env.REACTORY_SCHEDULE_LOCK_TTL_MS || '600000', 10);

// Import cron-parser using require to avoid TypeScript import issues
const CronParser = require('cron-parser');

export interface IScheduleConfig {
  id: string;
  name: string;
  description?: string;
  workflow: {
    id: string;
    version?: string;
    name?: string;
    nameSpace?: string;
  };
  schedule: {
    cron: string;
    timezone?: string;
    enabled?: boolean;
  };
  properties?: Record<string, any>;
  propertiesFormId?: string; // Optional form ID for UI to render properties.  
  retry?: {
    attempts: number;
    delay: number; // in seconds
  };
  timeout?: number; // in seconds
  maxConcurrent?: number;
  monitoring?: { 
    enabled: boolean;
    metrics: string[];
  }
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
  private watcher: fs.FSWatcher | null = null;
  private reloadDebounceTimer: NodeJS.Timeout | null = null;
  private auditService: ReactoryAuditService;

  constructor(workflowRunner: WorkflowRunner) {
    this.workflowRunner = workflowRunner;
    this.scheduleDirectory = path.join(process.env.APP_DATA_ROOT || './data', 'workflows', 'schedules');
    this.auditService = new ReactoryAuditService({}, workflowRunner.context);
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
      
      // Setup the schedule directory watcher
      this.setupScheduleDirectoryWatcher();
      
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

  private setupScheduleDirectoryWatcher(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    try {
      // add a watch on the schedule directory for new files or file changes
      this.watcher = fs.watch(this.scheduleDirectory, (eventType, filename) => {
        if (filename && (filename.endsWith('.yaml') || filename.endsWith('.yml'))) {
          logger.info(`Schedule file event: ${eventType} on ${filename}`);
          this.debouncedReload();
        }
      });

      this.watcher.on('error', (error) => {
        logger.error('Schedule directory watcher error', error);
      });
      
    } catch (error) {
      logger.error('Failed to setup schedule directory watcher', error);
    }
  }

  private debouncedReload(): void {
    if (this.reloadDebounceTimer) {
      clearTimeout(this.reloadDebounceTimer);
    }

    this.reloadDebounceTimer = setTimeout(() => {
      this.reloadSchedules().catch(err => logger.error('Error reloading schedules from watcher', err));
    }, 1000); // 1 second debounce
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
   * Generate a sanitized filename for a schedule config
   */
  private getScheduleFileName(scheduleId: string): string {
    const sanitized = scheduleId.replace(/[^a-zA-Z0-9_.-]/g, '-').toLowerCase();
    return sanitized.endsWith('schedule') ? `${sanitized}.yaml` : `${sanitized}-schedule.yaml`;
  }

  /**
   * Save a schedule configuration to a YAML file on disk.
   * If a file already exists for this schedule ID, it will be overwritten.
   * @param config - The schedule configuration to save
   */
  private saveScheduleToFile(config: IScheduleConfig): void {
    const fileName = this.getScheduleFileName(config.id);
    const filePath = path.join(this.scheduleDirectory, fileName);
    const yamlContent = yaml.dump(config, { indent: 2, lineWidth: 120, noRefs: true });
    fs.writeFileSync(filePath, yamlContent, 'utf8');
    logger.info(`Saved schedule config to file: ${filePath}`);
  }

  /**
   * Delete a schedule configuration YAML file from disk.
   * @param scheduleId - The schedule ID whose file should be deleted
   */
  private deleteScheduleFile(scheduleId: string): void {
    const fileName = this.getScheduleFileName(scheduleId);
    const filePath = path.join(this.scheduleDirectory, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted schedule file: ${filePath}`);
    } else {
      logger.warn(`Schedule file not found for deletion: ${filePath}`);
    }
  }

  /**
   * Create a new schedule, persist it to YAML, add to in-memory map, and optionally start it.
   * @param config - The schedule configuration
   * @returns The created IScheduledWorkflow
   */
  public async createSchedule(config: IScheduleConfig): Promise<IScheduledWorkflow> {
    if (this.schedules.has(config.id)) {
      throw new Error(`Schedule with ID '${config.id}' already exists`);
    }

    if (!this.validateScheduleConfig(config)) {
      throw new Error('Invalid schedule configuration: id, name, workflow.id, and schedule.cron are required');
    }

    if (!cron.validate(config.schedule.cron)) {
      throw new Error(`Invalid cron expression: ${config.schedule.cron}`);
    }

    // Persist to disk
    this.saveScheduleToFile(config);

    // Add to in-memory map
    this.addSchedule(config);

    // Start if enabled
    if (config.schedule.enabled !== false) {
      await this.startSchedule(config.id);
    }

    const scheduled = this.schedules.get(config.id);
    if (!scheduled) {
      throw new Error('Failed to create schedule');
    }

    logger.info(`Created schedule: ${config.id} (${config.name})`);
    return scheduled;
  }

  /**
   * Update an existing schedule's configuration, persist changes to YAML,
   * and restart the schedule if it was running.
   * @param scheduleId - The ID of the schedule to update
   * @param updates - Partial schedule config updates
   * @returns The updated IScheduledWorkflow
   */
  public async updateScheduleConfig(scheduleId: string, updates: Partial<IScheduleConfig>): Promise<IScheduledWorkflow> {
    const existing = this.schedules.get(scheduleId);
    if (!existing) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Merge updates into existing config (deep merge for nested objects)
    const updatedConfig: IScheduleConfig = {
      ...existing.config,
      ...updates,
      workflow: {
        ...existing.config.workflow,
        ...(updates.workflow || {}),
      },
      schedule: {
        ...existing.config.schedule,
        ...(updates.schedule || {}),
      },
    };

    // Preserve the original ID
    updatedConfig.id = scheduleId;

    if (!this.validateScheduleConfig(updatedConfig)) {
      throw new Error('Updated configuration is invalid');
    }

    if (!cron.validate(updatedConfig.schedule.cron)) {
      throw new Error(`Invalid cron expression: ${updatedConfig.schedule.cron}`);
    }

    // Stop the current schedule if running
    const wasRunning = existing.task != null;
    if (wasRunning) {
      await this.stopSchedule(scheduleId);
    }

    // Persist updated config to disk
    this.saveScheduleToFile(updatedConfig);

    // Update in-memory
    existing.config = updatedConfig;

    // Restart if it was running or if enabled
    if (wasRunning || updatedConfig.schedule.enabled !== false) {
      await this.startSchedule(scheduleId);
    }

    logger.info(`Updated schedule: ${scheduleId}`);
    return existing;
  }

  /**
   * Remove a schedule completely — stop it, remove from memory, and delete the YAML file.
   * @param scheduleId - The ID of the schedule to remove
   */
  public async removeSchedule(scheduleId: string): Promise<void> {
    const existing = this.schedules.get(scheduleId);
    if (!existing) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Stop if running
    if (existing.task) {
      await this.stopSchedule(scheduleId);
    }

    // Remove from in-memory map
    this.schedules.delete(scheduleId);

    // Delete the YAML file
    this.deleteScheduleFile(scheduleId);

    logger.info(`Removed schedule: ${scheduleId}`);
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

    // ── In-process guard (fast path — no DB round-trip needed within one pod) ──
    if (scheduledWorkflow.isRunning && config.maxConcurrent === 1) {
      logger.warn(`Schedule ${scheduleId} is already running in this process, skipping execution`);
      return;
    }

    // ── Distributed guard — acquire a MongoDB lock for this (schedule, slot) ──
    // Only one pod across the entire cluster can create the lock document.
    // All others receive a duplicate-key error and skip.
    const slot = this.slotTimeForNow();
    const lockAcquired = await this.acquireScheduleLock(scheduleId, slot);
    if (!lockAcquired) {
      logger.debug(
        `Schedule ${scheduleId} slot ${slot.toISOString()} already claimed by another pod — skipping`
      );
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
   * Return the current wall-clock time truncated to the minute.
   *
   * All pods racing on the same cron tick derive an identical slot value,
   * which is what makes the compound unique index (scheduleId, slotTime)
   * act as a single serialisation point across the cluster.
   */
  private slotTimeForNow(): Date {
    const slot = new Date();
    slot.setSeconds(0, 0);
    return slot;
  }

  /**
   * Attempt to insert a lock document for (scheduleId, slotTime).
   *
   * Returns `true` when this pod wins the race (insert succeeds).
   * Returns `false` when another pod already holds the lock (duplicate-key
   * error, code 11000).
   * Re-throws any other unexpected database errors so the caller can log them.
   */
  private async acquireScheduleLock(
    scheduleId: string,
    slotTime: Date
  ): Promise<boolean> {
    try {
      await SchedulerLockModel.create({
        scheduleId,
        slotTime,
        instanceId: POD_IDENTITY,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + LOCK_TTL_MS),
      });
      logger.debug(
        `Acquired schedule lock: ${scheduleId} slot=${slotTime.toISOString()} pod=${POD_IDENTITY}`
      );
      return true;
    } catch (err: any) {
      if (err?.code === 11000) {
        // Expected: another pod inserted first
        return false;
      }
      // Unexpected DB error — propagate so the caller can decide
      logger.error(`Failed to acquire schedule lock for ${scheduleId}`, err);
      throw err;
    }
  }

  /**
   * Get the next run time for a cron expression
   */
  private getNextRun(cronExpression: string, timezone?: string): Date {
    try {
      // Parse the cron expression
      const interval = CronParser.default.parse(cronExpression, {
        tz: timezone || 'UTC'
      });
      
      // Get the next run time
      const nextRun = interval.next().toDate();
      
      logger.debug(`Calculated next run for cron '${cronExpression}' (${timezone || 'UTC'}): ${nextRun.toISOString()}`);
      
      return nextRun;
    } catch (error) {
      logger.error(`Failed to calculate next run time for cron: ${cronExpression}`, error);
      
      // Fallback: return current time + 1 hour as a safe default
      const fallbackTime = new Date();
      fallbackTime.setHours(fallbackTime.getHours() + 1);
      
      logger.warn(`Using fallback time for cron '${cronExpression}': ${fallbackTime.toISOString()}`);
      return fallbackTime;
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
   * Get all schedules for a specific workflow by ID
   * Workflow IDs follow the pattern: "namespace.WorkflowName@version" (e.g., "core.CleanCacheWorkflow@1.0.0")
   * @param workflowId - The complete workflow ID to filter by
   * @returns Array of scheduled workflows matching the workflow ID
   */
  public getSchedulesForWorkflow(workflowId: string): IScheduledWorkflow[] {
    const matchingSchedules: IScheduledWorkflow[] = [];

    for (const [, scheduledWorkflow] of this.schedules) {
      const { workflow } = scheduledWorkflow.config;
      
      // Check workflow ID match
      if (workflow.id === workflowId) {
        matchingSchedules.push(scheduledWorkflow);
      }
    }

    logger.debug(`Found ${matchingSchedules.length} schedules for workflow ${workflowId}`);

    return matchingSchedules;
  }

  /**
   * Filter schedules by workflow properties (namespace, name, version)
   * This method parses workflow IDs and matches against the provided criteria.
   * Workflow IDs follow the pattern: "namespace.WorkflowName@version" (e.g., "core.CleanCacheWorkflow@1.0.0")
   * @param nameSpace - Optional namespace to filter by (e.g., "core")
   * @param name - Optional workflow name to filter by (e.g., "CleanCacheWorkflow")
   * @param version - Optional version to filter by (e.g., "1.0.0")
   * @returns Array of scheduled workflows matching the criteria
   */
  public filterSchedulesByWorkflowProperties(
    nameSpace?: string,
    name?: string,
    version?: string
  ): IScheduledWorkflow[] {
    const matchingSchedules: IScheduledWorkflow[] = [];

    for (const [, scheduledWorkflow] of this.schedules) {
      const { workflow } = scheduledWorkflow.config;
      
      // Parse workflow ID: "namespace.WorkflowName@version"
      const workflowIdParts = this.parseWorkflowId(workflow.id);
      
      // Check namespace match if specified
      if (nameSpace && workflowIdParts.nameSpace !== nameSpace) {
        continue;
      }
      
      // Check name match if specified
      if (name && workflowIdParts.name !== name) {
        continue;
      }
      
      // Check version match if specified
      if (version && workflowIdParts.version !== version) {
        continue;
      }
      
      matchingSchedules.push(scheduledWorkflow);
    }

    logger.debug(
      `Found ${matchingSchedules.length} schedules matching criteria` +
      (nameSpace ? ` (namespace: ${nameSpace})` : '') +
      (name ? ` (name: ${name})` : '') +
      (version ? ` (version: ${version})` : '')
    );

    return matchingSchedules;
  }

  /**
   * Parse a workflow ID into its component parts
   * @param workflowId - The workflow ID to parse (e.g., "core.CleanCacheWorkflow@1.0.0")
   * @returns Object containing namespace, name, and version
   */
  private parseWorkflowId(workflowId: string): { nameSpace: string; name: string; version: string } {
    // Default values
    let nameSpace = '';
    let name = workflowId;
    let version = '';

    try {
      // Split by @ to separate version
      const atIndex = workflowId.lastIndexOf('@');
      if (atIndex !== -1) {
        version = workflowId.substring(atIndex + 1);
        name = workflowId.substring(0, atIndex);
      }

      // Split by . to separate namespace and name
      const dotIndex = name.lastIndexOf('.');
      if (dotIndex !== -1) {
        nameSpace = name.substring(0, dotIndex);
        name = name.substring(dotIndex + 1);
      }
    } catch (error) {
      logger.warn(`Failed to parse workflow ID: ${workflowId}`, error);
    }

    return { nameSpace, name, version };
  }

  /**
   * Stop the scheduler
   */
  public async stop(): Promise<void> {
    try {
      logger.info('Stopping WorkflowScheduler');

      if (this.watcher) {
        this.watcher.close();
        this.watcher = null;
      }

      if (this.reloadDebounceTimer) {
        clearTimeout(this.reloadDebounceTimer);
        this.reloadDebounceTimer = null;
      }
      
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