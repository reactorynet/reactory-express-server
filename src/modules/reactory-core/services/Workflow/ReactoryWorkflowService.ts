import Reactory from '@reactorynet/reactory-core';
import { service } from '@reactory/server-core/application/decorators';
import { 
  WorkflowRunner,  
} from 'modules/reactory-core/workflow/WorkflowRunner/WorkflowRunner';
import { 
  IReactoryWorkflowService,
  IWorkflowSystemStatus,
  IWorkflowExecutionInput,
  IScheduleConfigInput,
  IUpdateScheduleInput,
  IWorkflowFilterInput,
  IInstanceFilterInput,
  IAuditFilterInput,
  IPaginationInput,
  IWorkflowOperationResult,  
  IWorkflowErrorStats,
  IWorkflowMetrics,
  IWorkflowConfigurationResponse,
  IPaginatedWorkflows,
  IWorkflowRegistryResponse,
  RegisteredWorkflow,
  IPaginatedInstances,
  IPaginatedSchedules,
  IFilteredSchedulesResponse,
  IPaginatedAuditLogs,
  IWorkflowStatusResponse,
  IWorkflowHistoryFilter,
  IWorkflowHistoryPagination,
  IPaginatedWorkflowHistory,
  IWorkflowHistoryItem,
  IWorkflowExecutionStats,
  WorkflowESStatus,
  IYamlWorkflowDefinitionResult,
  IYamlLoadError,
  YamlLoadStatus,
  WorkflowSourceType,
  IWorkflowDefinitionInput,
  IWorkflowValidationResult,
  IWorkflowValidationError,
} from './types';
import { IScheduleConfig } from '@reactory/server-modules/reactory-core/workflow/Scheduler/Scheduler';
import { IWorkflowInstance, IWorkflowLifecycleStats } from '@reactory/server-modules/reactory-core/workflow/LifecycleManager/LifecycleManager';
import { IConfigurationStats } from '@reactory/server-modules/reactory-core/workflow/ConfigurationManager/ConfigurationManager';
import { ISecurityStats } from '@reactory/server-modules/reactory-core/workflow/SecurityManager/SecurityManager';
import { IScheduledWorkflow, ISchedulerStats } from 'modules/reactory-core/workflow/Scheduler/Scheduler';

@service({
  name: "ReactoryWorkflowService",
  nameSpace: "core",
  version: "1.0.0",
  description: "Service for managing workflows in Reactory",
  id: "core.ReactoryWorkflowService@1.0.0",
  serviceType: "workflow",
  dependencies: []
})
class ReactoryWorkflowService implements IReactoryWorkflowService {

  name: string;
  nameSpace: string;
  version: string;

  context: Reactory.Server.IReactoryContext;
  props: any;
  workflowRunner: WorkflowRunner;

  constructor(props: any, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;    
  }

  async onStartup(): Promise<any> {
    if(!this.workflowRunner) {
      this.workflowRunner = WorkflowRunner.getInstance({}, this.context);
    }
    if (!this.workflowRunner.isInitialized()) {      
      await this.workflowRunner.initialize();
    }
    await this.syncYamlWorkflowDefinitions();
    this.context.log(`Workflow service startup ${this.context.colors.green('STARTUP OKAY')} ✅`);
    return true;
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }
  
  setExecutionContext(executionContext: Reactory.Server.IReactoryContext): boolean {
    this.context = executionContext;
    return true;
  }

  /**
   * Copies YAML workflow definition files from their registered module location
   * to the $REACTORY_DATA/workflows/catalog directory so they can be loaded at
   * runtime.  This runs once during service startup.
   *
   * For each registered YAML workflow whose `location` is an absolute file path
   * the method:
   *   1. Resolves the catalog target path:
   *      $REACTORY_DATA/workflows/catalog/<nameSpace>/<name>/<version>/<name>.yaml
   *   2. Creates the target directory if it doesn't exist.
   *   3. Copies the source file if the catalog file is absent or stale.
   */
  private async syncYamlWorkflowDefinitions(): Promise<void> {
    const reactoryData = process.env.REACTORY_DATA;
    if (!reactoryData) {
      this.context.log('REACTORY_DATA env var is not set – skipping YAML workflow sync', {}, 'warn');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/prefer-node-protocol
    const { existsSync, mkdirSync, copyFileSync, statSync } = await import('fs');
    // eslint-disable-next-line @typescript-eslint/prefer-node-protocol
    const path = await import('path');
    const fsDeps = { existsSync, mkdirSync, copyFileSync, statSync, path };

    const runner = await this.getWorkflowRunner();
    const workflows = runner.getRegisteredWorkflows();
    let copied = 0, skipped = 0, failed = 0;

    for (const workflow of workflows) {
      if (workflow.workflowType !== 'YAML') continue;
      const { nameSpace, name, version = '1.0.0' } = workflow;
      const sourceFile = this.resolveYamlSourceFile(workflow, fsDeps);
      if (sourceFile == null) { skipped++; continue; }

      const result = this.copyYamlToCatalog(sourceFile, nameSpace, name, version, reactoryData, fsDeps);
      if (result === 'copied') copied++;
      else if (result === 'skipped') skipped++;
      else failed++;
    }

    this.context.log(
      `YAML workflow catalog sync complete: ${copied} copied, ${skipped} skipped, ${failed} failed`,
      { copied, skipped, failed },
      failed > 0 ? 'warn' : 'info'
    );
  }

  /** Resolve the absolute source YAML file path from a workflow registration. Returns null and logs when unresolvable. */
  private resolveYamlSourceFile(
    workflow: { nameSpace: string; name: string; version?: string; location?: string },
    deps: { existsSync: (p: string) => boolean; path: typeof import('path') }
  ): string | null {
    const { nameSpace, name, version = '1.0.0', location } = workflow;
    if (location && !location.startsWith('yaml:') && deps.path.isAbsolute(location) && deps.existsSync(location)) {
      return location;
    }
    if (location?.startsWith('yaml:')) {
      this.context.log(
        `Workflow ${nameSpace}.${name}@${version} uses legacy yaml: URI ("${location}"). ` +
        `Update the registration to an absolute file path.`,
        { nameSpace, name, version, location }, 'warn'
      );
      return null;
    }
    this.context.log(
      `Workflow ${nameSpace}.${name}@${version} is YAML but location is unresolvable ("${location ?? '(none)'}").`,
      { nameSpace, name, version }, 'warn'
    );
    return null;
  }

  /** Copy a single YAML file from its module source to the workflow catalog. */
  private copyYamlToCatalog(
    sourceFile: string,
    nameSpace: string,
    name: string,
    version: string,
    reactoryData: string,
    deps: {
      existsSync: (p: string) => boolean;
      mkdirSync: (p: string, opts?: any) => void;
      copyFileSync: (src: string, dst: string) => void;
      statSync: (p: string) => { mtime: Date };
      path: typeof import('path');
    }
  ): 'copied' | 'skipped' | 'error' {
    const { existsSync, mkdirSync, copyFileSync, statSync, path } = deps;
    const targetDir = path.join(reactoryData, 'workflows', 'catalog', nameSpace, name, version);
    const targetFile = path.join(targetDir, path.basename(sourceFile));
    try {
      if (existsSync(targetFile) && statSync(sourceFile).mtime <= statSync(targetFile).mtime) {
        return 'skipped';
      }
      if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });
      copyFileSync(sourceFile, targetFile);
      this.context.log(
        `Synced YAML workflow ${nameSpace}.${name}@${version} → ${targetFile}`,
        { sourceFile, targetFile }, 'info'
      );
      return 'copied';
    } catch (err) {
      this.context.log(
        `Failed to sync YAML workflow ${nameSpace}.${name}@${version}: ${err instanceof Error ? err.message : String(err)}`,
        { sourceFile, targetFile, err }, 'error'
      );
      return 'error';
    }
  }

  // Helper method to get WorkflowRunner instance
  private async getWorkflowRunner(): Promise<WorkflowRunner> {
    if (!this.workflowRunner) {
      this.workflowRunner = WorkflowRunner.getInstance({}, this.context);
    }
    if (!this.workflowRunner.isInitialized()) {
      await this.workflowRunner.initialize();
    }
    return this.workflowRunner;
  }

  // System Status & Health
  async getSystemStatus(): Promise<IWorkflowSystemStatus> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      
      // Get data from WorkflowRunner singleton
      const lifecycleStats: IWorkflowLifecycleStats = workflowRunner
        ?.getLifecycleManager()
        ?.getStats() || {
          pausedWorkflows: 0,
          runningWorkflows: 0,
          completedWorkflows: 0,
          failedWorkflows: 0,
          cancelledWorkflows: 0,
          totalWorkflows: 0,
          averageExecutionTime: 0,
          lastCleanupTime: new Date(),
          resourceUtilization: {
            memory: 0,
            cpu: 0,
            disk: 0
          }
      };

      const errorStats: Map<string, IWorkflowErrorStats> =  workflowRunner.getAllErrorStats();
      const configStats: IConfigurationStats = workflowRunner.getConfigurationStats();
      const securityStats: ISecurityStats = workflowRunner.getSecurityStats();

      return {
        system: {
          initialized: workflowRunner?.isInitialized() || false,
          status: workflowRunner?.isInitialized() ? 'HEALTHY' : 'INITIALIZING',
          timestamp: new Date()
        },
        lifecycle: lifecycleStats,
        errors: errorStats,
        configuration: configStats,
        security: securityStats
      };
    } catch (error) {
      this.context.log('Error getting system status', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowMetrics(): Promise<IWorkflowMetrics> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const systemStatus = await this.getSystemStatus();
      
      const schedulerStats: ISchedulerStats = workflowRunner?.getScheduler()?.getStats() || {
        activeSchedules: 0,
        totalSchedules: 0,
        totalRuns: 0,
        totalErrors: 0,
      };

      return {
        lifecycle: systemStatus.lifecycle,
        scheduler: schedulerStats,
        errors: systemStatus.errors,
        configuration: systemStatus.configuration,
        security: systemStatus.security
      };
    } catch (error) {
      this.context.log('Error getting workflow metrics', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowConfigurations(): Promise<IWorkflowConfigurationResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const configManager = workflowRunner?.getConfigurationManager();
      
      const configurations = configManager?.getAllConfigurations() || {};
      
      // Validate all configurations
      const errors: any[] = [];
      const warnings: any[] = [];
      let isValid = true;
      
      for (const [key, config] of Object.entries(configurations)) {
        const validation = configManager?.validateConfiguration(config as any);
        if (validation && !validation.isValid) {
          isValid = false;
          if (validation.errors) {
            errors.push(...validation.errors.map((e: any) => ({ ...e, configKey: key })));
          }
        }
        if (validation?.warnings) {
          warnings.push(...validation.warnings.map((w: any) => ({ ...w, configKey: key })));
        }
      }

      return {
        configurations,
        validation: {
          isValid,
          errors,
          warnings
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow configurations', { error }, 'error');
      throw error;
    }
  }

  // Workflow Registry
  async getWorkflows(filter?: IWorkflowFilterInput, pagination?: IPaginationInput): Promise<IPaginatedWorkflows> {
    try {
      const workflowRunner = await this.getWorkflowRunner();

      // Get registered workflows from WorkflowRunner
      const allWorkflows = await workflowRunner?.getRegisteredWorkflows() as any as RegisteredWorkflow[] || [];

      // Get execution stats from MongoDB
      const executionStats = await this.getWorkflowExecutionStats();

      // Get scheduler and lifecycle manager for active status
      const scheduler = workflowRunner?.getScheduler();
      const lifecycleManager = workflowRunner?.getLifecycleManager();

      // Get counts of non-terminated instances with failed execution pointers
      // This captures step-level failures that workflow-es hasn't marked as TERMINATED
      const failedStepCounts = await lifecycleManager?.getInstancesWithFailedSteps() || {};

      // Enrich workflows with execution stats and active status
      const enrichedWorkflows = await Promise.all(allWorkflows.map(async (workflow: any) => {
        const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;

        // Get execution statistics from MongoDB
        const stats = executionStats.byWorkflowDefinition.find(
          s => s.workflowDefinitionId === workflowId
        );

        const totalExecutions = stats?.total || 0;
        const successfulExecutions = stats?.complete || 0;
        // Count both terminated workflows AND non-terminated instances with failed steps
        const terminatedCount = stats?.terminated || 0;
        const failedStepInstanceCount = failedStepCounts[workflowId] || 0;
        const failedExecutions = terminatedCount + failedStepInstanceCount;

        // Determine active status based on schedules and running instances
        let isActive = false;
        let hasSchedule = false;

        // Check if workflow has active schedules
        const schedules = scheduler?.getSchedulesForWorkflow(workflowId) || [];
        if (schedules.length > 0) {
          hasSchedule = true;
          // Check if any schedule is enabled
          isActive = schedules.some((schedule: any) => schedule.config?.schedule?.enabled === true);
        }

        // Check if workflow has running instances
        if (!isActive) {
          const instances = lifecycleManager?.getInstancesByWorkflowId(workflowId) || [];
          const runningInstances = instances.filter((instance: any) =>
            instance.status === 'RUNNING' || instance.status === 'running'
          );
          if (runningInstances.length > 0) {
            isActive = true;
          }
        }

        return {
          ...workflow,
          isActive,
          hasSchedule,
          status: isActive ? 'ACTIVE' : 'INACTIVE',
          workflowType: workflow.workflowType || 'CODE',
          location: workflow.location || undefined,
          statistics: {
            totalExecutions,
            successfulExecutions,
            failedExecutions,
            averageExecutionTime: executionStats.averageCompletionTime || 0
          }
        };
      }));

      // Apply filters
      let filteredWorkflows = enrichedWorkflows;
      if (filter) {
        filteredWorkflows = enrichedWorkflows.filter((workflow: any) => {
          // Filter by searchString (searches across multiple fields)
          if (filter.searchString) {
            const searchLower = filter.searchString.toLowerCase().trim();
            const matchesSearch =
              workflow.name?.toLowerCase().includes(searchLower) ||
              workflow.nameSpace?.toLowerCase().includes(searchLower) ||
              workflow.description?.toLowerCase().includes(searchLower) ||
              workflow.version?.toLowerCase().includes(searchLower) ||
              workflow.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower)) ||
              workflow.author?.toLowerCase().includes(searchLower) ||
              `${workflow.nameSpace}.${workflow.name}@${workflow.version}`.toLowerCase().includes(searchLower);

            if (!matchesSearch) return false;
          }

          // Filter by specific fields
          if (filter.nameSpace && workflow.nameSpace !== filter.nameSpace) return false;
          if (filter.name && workflow.name !== filter.name) return false;
          if (filter.version && workflow.version !== filter.version) return false;
          if (filter.isActive !== undefined && workflow.isActive !== filter.isActive) return false;
          if (filter.tags && !filter.tags.some((tag: string) => workflow.tags?.includes(tag))) return false;
          if (filter.author && workflow.author !== filter.author) return false;

          // Filter by IDs array
          if (filter.ids && filter.ids.length > 0) {
            const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
            if (!filter.ids.includes(workflowId)) return false;
          }

          // Filter by hasSchedule
          if (filter.hasSchedule !== undefined && workflow.hasSchedule !== filter.hasSchedule) return false;

          // Filter by hasErrors (workflows with failed executions)
          if (filter.hasErrors !== undefined) {
            const hasErrors = (workflow.statistics?.failedExecutions || 0) > 0;
            if (hasErrors !== filter.hasErrors) return false;
          }

          // Filter by neverRun (workflows with no executions)
          if (filter.neverRun !== undefined) {
            const neverRun = (workflow.statistics?.totalExecutions || 0) === 0;
            if (neverRun !== filter.neverRun) return false;
          }

          // Filter by recentlyUpdated (workflows updated in last 24 hours)
          if (filter.recentlyUpdated !== undefined) {
            let recentlyUpdated = false;
            if (workflow.updatedAt) {
              const dayAgo = new Date();
              dayAgo.setDate(dayAgo.getDate() - 1);
              recentlyUpdated = new Date(workflow.updatedAt) > dayAgo;
            }
            if (recentlyUpdated !== filter.recentlyUpdated) return false;
          }

          return true;
        });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      const paginatedWorkflows = filteredWorkflows.slice(startIndex, endIndex);
      const total = filteredWorkflows.length;
      const pages = Math.ceil(total / limit);

      return {
        workflows: paginatedWorkflows,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflows', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowRegistry(): Promise<IWorkflowRegistryResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const allWorkflows = workflowRunner?.getRegisteredWorkflows() as any as  RegisteredWorkflow[] || [];
      
      const stats = {
        totalWorkflows: allWorkflows.length,
        activeWorkflows: allWorkflows.filter((w: any) => w.isActive).length,
        inactiveWorkflows: allWorkflows.filter((w: any) => !w.isActive).length,
        nameSpaces: [...new Set(allWorkflows.map((w: any) => w.nameSpace))],
        versions: allWorkflows.reduce((acc: any, w: any) => {
          if (!acc[`${w.nameSpace}.${w.name}`]) acc[`${w.nameSpace}.${w.name}`] = [];
          acc[`${w.nameSpace}.${w.name}`].push(w.version);
          return acc;
        }, {}),
        lastRegistered: new Date(),
        registrationErrors: 0
      };

      return {
        workflows: allWorkflows,
        stats
      };
    } catch (error) {
      this.context.log('Error getting workflow registry', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowWithId(id: string): Promise<RegisteredWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowWithId(id) as any as RegisteredWorkflow;
      
      if (!workflow) {
        throw new Error(`Workflow with ID ${id} not found`);
      }

      // Get instances directly using the workflow ID
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      const workflowInstances = lifecycleManager?.getInstancesByWorkflowId(id) || [];
      
      const stats = {
        totalExecutions: workflowInstances.length,
        successfulExecutions: workflowInstances.filter((i: any) => i.status === 'COMPLETED' || i.status === 'completed').length,
        failedExecutions: workflowInstances.filter((i: any) => i.status === 'FAILED' || i.status === 'failed').length,
        averageExecutionTime: 0 // TODO: Calculate from instances
      };

      return {
        ...workflow,
        instances: workflowInstances,
        statistics: stats
      };
    } catch (error) {
      this.context.log('Error getting workflow by ID', { error }, 'error');
      throw error;
    }
  }

  async getWorkflow(nameSpace: string, name: string): Promise<RegisteredWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowByName(nameSpace, name) as any as RegisteredWorkflow;
      
      if (!workflow) {
        throw new Error(`Workflow ${nameSpace}.${name} not found`);
      }

      // Get additional details
      const instances = await this.getWorkflowInstances({ name: name, nameSpace });
      const stats = {
        totalExecutions: instances.instances?.length || 0,
        successfulExecutions: instances.instances?.filter((i: any) => i.status === 'COMPLETED')?.length || 0,
        failedExecutions: instances.instances?.filter((i: any) => i.status === 'FAILED')?.length || 0,
        averageExecutionTime: 0 // TODO: Calculate from instances
      };

      return {
        ...workflow,
        instances: instances.instances || [],
        statistics: stats
      };
    } catch (error) {
      this.context.log('Error getting workflow', { error }, 'error');
      throw error;
    }
  }

  /**
   * Load and parse a YAML workflow definition from the workflow's registered location.
   * Always returns a result – check loadStatus and errors for failure details.
   */
  async getWorkflowYamlDefinition(
    nameSpace: string,
    name: string,
    version?: string
  ): Promise<IYamlWorkflowDefinitionResult> {
    // eslint-disable-next-line @typescript-eslint/prefer-node-protocol
    const { readFileSync, existsSync } = await import('fs');
    // eslint-disable-next-line @typescript-eslint/prefer-node-protocol
    const path = await import('path');
    const yaml = await import('js-yaml');
    const deps = { existsSync, path, readFileSync, yaml };

    const errors: IYamlLoadError[] = [];
    let yamlSource: string | undefined;
    let resolvedFilePath: string | null = null;
    let resolvedSourceType: WorkflowSourceType = 'MODULE';
    let parsed: any;

    const workflow = await this.yamlStageRegistryLookup(nameSpace, name, errors);
    let loadStatus = this.yamlRegistryStatus(workflow, nameSpace, name, errors);

    if (loadStatus === 'SUCCESS') {
      const resolved = this.yamlStageFileResolve(workflow, nameSpace, name, version, errors, deps);
      resolvedFilePath = resolved.filePath;
      resolvedSourceType = resolved.sourceType;

      if (resolvedFilePath) {
        const rp = this.yamlStageReadAndParse(resolvedFilePath, nameSpace, name, errors, deps);
        yamlSource = rp.yamlSource;
        parsed = rp.parsed;
        loadStatus = rp.loadStatus;
      } else {
        loadStatus = 'NOT_FOUND';
      }
    }

    const hasErrors = errors.length > 0;
    if (hasErrors) {
      const isWarning = loadStatus === 'SUCCESS';
      this.context.log(
        `YAML workflow definition load for ${nameSpace}.${name} completed with status=${loadStatus}`,
        { errors },
        isWarning ? 'warn' : 'error'
      );
    }

    const result = {
      nameSpace: parsed?.nameSpace || nameSpace,
      name: parsed?.name || name,
      version: parsed?.version || version || workflow?.version || '1.0.0',
      description: parsed?.description,
      author: parsed?.author,
      tags: parsed?.tags,
      inputs: parsed?.inputs,
      outputs: parsed?.outputs,
      variables: parsed?.variables,
      steps: parsed?.steps || [],
      designer: parsed?.metadata?.designer || null,
      yamlSource,
      sourceType: resolvedSourceType,
      location: resolvedFilePath ?? undefined,
      loadStatus,
      errors: hasErrors ? errors : undefined,
    };
    return result;
  }

  /** Stage 1 – look up the workflow in the runner registry. */
  private async yamlStageRegistryLookup(
    nameSpace: string,
    name: string,
    errors: IYamlLoadError[]
  ): Promise<any> {
    try {
      const runner = await this.getWorkflowRunner();
      return runner?.getWorkflowByName(nameSpace, name) ?? null;
    } catch (err) {
      errors.push({
        stage: 'REGISTRY',
        message: err instanceof Error ? err.message : String(err),
        code: 'RUNNER_UNAVAILABLE',
      });
      return null;
    }
  }

  /** Validate registry result and return initial load status. */
  private yamlRegistryStatus(
    workflow: any,
    nameSpace: string,
    name: string,
    errors: IYamlLoadError[]
  ): YamlLoadStatus {
    if (!workflow) {
      errors.push({ stage: 'REGISTRY', message: `Workflow ${nameSpace}.${name} not found in registry`, code: 'WORKFLOW_NOT_FOUND' });
      return 'NOT_FOUND';
    }
    if (workflow.workflowType !== 'YAML') {
      errors.push({
        stage: 'REGISTRY',
        message: `Workflow ${nameSpace}.${name} is a ${workflow.workflowType || 'CODE'} workflow and does not have a YAML definition`,
        code: 'NOT_YAML_WORKFLOW',
      });
      return 'REGISTRY_ERROR';
    }
    return 'SUCCESS';
  }

  /** Stage 2 – resolve the YAML file path. Returns null filePath on failure. */
  private yamlStageFileResolve(
    workflow: any,
    nameSpace: string,
    name: string,
    version: string | undefined,
    errors: IYamlLoadError[],
    deps: { existsSync: (p: string) => boolean; path: typeof import('path') }
  ): { filePath: string | null; sourceType: WorkflowSourceType } {
    try {
      const resolvedPath = this.resolveWorkflowYamlPath(
        workflow.location,
        nameSpace,
        name,
        version || workflow.version,
        deps
      );
      if (!resolvedPath.filePath || !deps.existsSync(resolvedPath.filePath)) {
        const searched = resolvedPath.searchedPaths?.join(', ') || '(none)';
        errors.push({ stage: 'FILE_RESOLVE', message: `YAML file for ${nameSpace}.${name} not found. Searched: ${searched}`, code: 'FILE_NOT_FOUND' });
        return { filePath: null, sourceType: 'MODULE' };
      }
      return { filePath: resolvedPath.filePath, sourceType: resolvedPath.sourceType };
    } catch (err) {
      errors.push({ stage: 'FILE_RESOLVE', message: err instanceof Error ? err.message : String(err), code: 'RESOLVE_ERROR' });
      return { filePath: null, sourceType: 'MODULE' };
    }
  }

  /** Stage 3 – read file content. Returns undefined on failure. */
  private yamlStageFileRead(
    filePath: string,
    errors: IYamlLoadError[],
    deps: { readFileSync: (p: string, enc: string) => string }
  ): string | undefined {
    try {
      return deps.readFileSync(filePath, 'utf8');
    } catch (err) {
      errors.push({ stage: 'FILE_READ', message: err instanceof Error ? err.message : String(err), code: 'READ_ERROR' });
      return undefined;
    }
  }

  /** Stage 4 – parse YAML text into an object. Returns null on failure. */
  private yamlStageParse(
    source: string,
    nameSpace: string,
    name: string,
    errors: IYamlLoadError[],
    deps: { yaml: typeof import('js-yaml') }
  ): any {
    try {
      const parsed = deps.yaml.load(source);
      if (!parsed || typeof parsed !== 'object') {
        errors.push({ stage: 'PARSE', message: `Parsed YAML for ${nameSpace}.${name} is not an object (got ${typeof parsed})`, code: 'NOT_AN_OBJECT' });
        return null;
      }
      return parsed;
    } catch (err: any) {
      const line = err?.mark?.line == null ? undefined : (err.mark.line as number) + 1;
      const column = err?.mark?.column == null ? undefined : (err.mark.column as number) + 1;
      errors.push({
        stage: 'PARSE',
        message: err instanceof Error ? err.message : String(err),
        code: 'YAML_PARSE_ERROR',
        line,
        column,
      });
      return null;
    }
  }

  /** Stage 3+4 combined – read file then parse. Returns { yamlSource, parsed, loadStatus }. */
  private yamlStageReadAndParse(
    filePath: string,
    nameSpace: string,
    name: string,
    errors: IYamlLoadError[],
    deps: { readFileSync: (p: string, enc: string) => string; yaml: typeof import('js-yaml') }
  ): { yamlSource: string | undefined; parsed: any; loadStatus: YamlLoadStatus } {
    const yamlSource = this.yamlStageFileRead(filePath, errors, deps);
    if (yamlSource == null) {
      return { yamlSource: undefined, parsed: null, loadStatus: 'IO_ERROR' };
    }
    const parsed = this.yamlStageParse(yamlSource, nameSpace, name, errors, deps);
    return { yamlSource, parsed, loadStatus: parsed == null ? 'PARSE_ERROR' : 'SUCCESS' };
  }

  /**
   * Resolve the file path for a YAML workflow definition.
   * 
   * Search order:
   * 1. If location is an absolute path, use it directly
   * 2. Workflow catalog: $REACTORY_DATA/workflows/catalog/<nameSpace>/<name>/<version>/<name>.yaml
   * 3. The location as a relative path from the server root
   */
  /**
   * Infer the workflow source type based on the file path.
   */
  private inferSourceType(filePath: string): WorkflowSourceType {
    const reactoryData = process.env.REACTORY_DATA || '';
    if (filePath.includes(reactoryData + '/workflows/catalog')) {
      return 'CATALOG';
    }
    if (filePath.includes('/home/') || filePath.includes('/Users/')) {
      return 'USER';
    }
    return 'MODULE';
  }

  /**
   * Search the workflow catalog directory for a YAML file.
   */
  private searchCatalog(
    reactoryData: string,
    nameSpace: string,
    name: string,
    version: string,
    deps: { existsSync: (p: string) => boolean; path: typeof import('path') }
  ): { filePath: string | null; searchedPaths: string[] } {
    const { existsSync, path } = deps;
    const searchedPaths: string[] = [];
    const yamlExtensions = ['.yaml', '.yml'];

    // Alternate filename: PascalCase → kebab-case
    // e.g. ProcessDirectMessages → process-direct-messages
    const kebabName = name
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/([a-z\d])([A-Z])/g, '$1-$2')
      .toLowerCase();
    const filenames = kebabName !== name.toLowerCase()
      ? [name, kebabName]
      : [name];

    // With version directory
    for (const fname of filenames) {
      for (const ext of yamlExtensions) {
        const catalogPath = path.join(
          reactoryData, 'workflows', 'catalog',
          nameSpace, name, version, `${fname}${ext}`
        );
        searchedPaths.push(catalogPath);
        if (existsSync(catalogPath)) {
          return { filePath: catalogPath, searchedPaths };
        }
      }
    }

    // Without version directory
    for (const fname of filenames) {
      for (const ext of yamlExtensions) {
        const catalogPath = path.join(
          reactoryData, 'workflows', 'catalog',
          nameSpace, name, `${fname}${ext}`
        );
        searchedPaths.push(catalogPath);
        if (existsSync(catalogPath)) {
          return { filePath: catalogPath, searchedPaths };
        }
      }
    }

    return { filePath: null, searchedPaths };
  }

  /**
   * Resolve the file path for a YAML workflow definition.
   *
   * Search order:
   * 1. If location is an absolute path, use it directly
   * 2. Workflow catalog: $REACTORY_DATA/workflows/catalog/<nameSpace>/<name>/<version>/<name>.yaml
   * 3. The location as a relative path from the server root
   */
  private resolveWorkflowYamlPath(
    location: string | undefined,
    nameSpace: string,
    name: string,
    version: string,
    deps: { existsSync: (p: string) => boolean; path: typeof import('path') }
  ): { filePath: string | null; sourceType: WorkflowSourceType; searchedPaths?: string[] } {
    const { existsSync, path } = deps;
    const searchedPaths: string[] = [];

    // Normalise legacy "yaml:<ns>.<name>@<ver>/<filename>" URIs – the file won't
    // be present at the raw URI string; rely on the catalog search below.
    const isLegacyYamlUri = location?.startsWith('yaml:');

    // 1. Explicit absolute path from the workflow registration
    if (location && !isLegacyYamlUri && path.isAbsolute(location)) {
      searchedPaths.push(location);
      if (existsSync(location)) {
        return { filePath: location, sourceType: this.inferSourceType(location) };
      }
    }

    // 2. Workflow catalog ($REACTORY_DATA/workflows/catalog/…)
    //    This is populated at startup by syncYamlWorkflowDefinitions().
    const reactoryData = process.env.REACTORY_DATA;
    if (reactoryData) {
      const catalogResult = this.searchCatalog(reactoryData, nameSpace, name, version, deps);
      searchedPaths.push(...catalogResult.searchedPaths);
      if (catalogResult.filePath) {
        return { filePath: catalogResult.filePath, sourceType: 'CATALOG' };
      }
    }

    // 3. Relative path from server root (only when a real relative path was given)
    if (location && !isLegacyYamlUri) {
      const serverRoot = process.env.REACTORY_SERVER || process.cwd();
      const relativePath = path.resolve(serverRoot, location);
      searchedPaths.push(relativePath);
      if (existsSync(relativePath)) {
        return { filePath: relativePath, sourceType: 'MODULE' };
      }
    }

    return { filePath: null, sourceType: 'MODULE', searchedPaths };
  }

  // Workflow Instances
  async getWorkflowInstances(filter?: IInstanceFilterInput, pagination?: IPaginationInput): Promise<IPaginatedInstances> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      let instances: IWorkflowInstance[] = [];
      if (filter?.id) { 
        instances = await lifecycleManager?.getInstancesByWorkflowId(filter.id) || [];
      } else {
        instances = await lifecycleManager?.getAllWorkflowInstances() || [];
      }
      // Apply additional filters
      if (filter) {
        instances = instances.filter((instance: any) => {
          if (filter.name && instance.workflowName !== filter.name) return false; // Note: filter.name maps to workflowName
          if (filter.nameSpace && instance.nameSpace !== filter.nameSpace) return false;
          if (filter.status && instance.status !== filter.status) return false;
          if (filter.createdBy && instance.createdBy !== filter.createdBy) return false;
          if (filter.startTimeFrom && new Date(instance.startTime) < new Date(filter.startTimeFrom)) return false;
          if (filter.startTimeTo && new Date(instance.startTime) > new Date(filter.startTimeTo)) return false;
          return true;
        });
      }

      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedInstances = instances.slice(startIndex, endIndex);
      const total = instances.length;
      const pages = Math.ceil(total / limit);

      return {
        instances: paginatedInstances,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow instances', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowInstance(instanceId: string): Promise<IWorkflowInstance> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const instance = await workflowRunner?.lifecycleManager.getWorkflowInstance(instanceId);
      
      if (!instance) {
        throw new Error(`Workflow instance ${instanceId} not found`);
      }

      return instance;
    } catch (error) {
      this.context.log('Error getting workflow instance', { error }, 'error');
      throw error;
    }
  }

  async startWorkflow(workflowId: string, input?: IWorkflowExecutionInput): Promise<IWorkflowInstance> {
    try {
      const workflowRunner = await this.getWorkflowRunner();

      // Parse workflow ID: format is "namespace.name@version"
      // Example: "core.CleanCacheWorkflow@1.0.0"
      const atIndex = workflowId.lastIndexOf('@');
      const version = atIndex > -1 ? workflowId.substring(atIndex + 1) : '1.0.0';
    
      // Pass the full workflow ID (with namespace) to the runner
      const instanceId = await workflowRunner?.startWorkflow(workflowId, version, input, this.context);
      const instance = await workflowRunner?.lifecycleManager.getWorkflowInstance(instanceId);
      // the object here does not have the full details of the instance, so we need to fetch it again from the lifecycle manager to get all the details including status, start time, etc.
      // get the regustered workflow 

      return instance;
    } catch (error) {
      this.context.log('Error starting workflow', { error, workflowId, input }, 'error');
      throw error;
    }
  }

  async pauseWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.pauseWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} paused successfully`
      };
    } catch (error) {
      this.context.log('Error pausing workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to pause workflow instance: ${error.message}`
      };
    }
  }

  async resumeWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.resumeWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} resumed successfully`
      };
    } catch (error) {
      this.context.log('Error resuming workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to resume workflow instance: ${error.message}`
      };
    }
  }

  async cancelWorkflowInstance(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.cancelWorkflowInstance(instanceId);
      
      return {
        success: true,
        message: `Workflow instance ${instanceId} cancelled successfully`
      };
    } catch (error) {
      this.context.log('Error cancelling workflow instance', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to cancel workflow instance: ${error.message}`
      };
    }
  }

  // ============================================
  // Workflow History (MongoDB Persistence)
  // ============================================

  /**
   * Get paginated workflow history from MongoDB
   * @param filter - Filter options for querying workflow history
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistory(
    filter?: IWorkflowHistoryFilter,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistory(filter, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history', { error, filter, pagination }, 'error');
      throw error;
    }
  }

  /**
   * Get a single workflow history item by instance ID
   * @param instanceId - The workflow instance ID
   * @returns The workflow history item or null if not found
   */
  async getWorkflowHistoryById(instanceId: string): Promise<IWorkflowHistoryItem | null> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryById(instanceId);
    } catch (error) {
      this.context.log('Error getting workflow history by ID', { error, instanceId }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow history by workflow definition ID
   * @param workflowDefinitionId - The workflow definition ID (e.g., 'core.CleanCacheWorkflow@1.0.0')
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistoryByDefinitionId(
    workflowDefinitionId: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryByDefinitionId(workflowDefinitionId, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history by definition ID', { error, workflowDefinitionId }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow history by status
   * @param status - The status or array of statuses to filter by
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async getWorkflowHistoryByStatus(
    status: WorkflowESStatus | WorkflowESStatus[],
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowHistoryByStatus(status, pagination);
    } catch (error) {
      this.context.log('Error getting workflow history by status', { error, status }, 'error');
      throw error;
    }
  }

  /**
   * Get workflow execution statistics from MongoDB
   * @returns Workflow execution statistics including counts by status and by workflow definition
   */
  async getWorkflowExecutionStats(): Promise<IWorkflowExecutionStats> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getWorkflowExecutionStats();
    } catch (error) {
      this.context.log('Error getting workflow execution stats', { error }, 'error');
      throw error;
    }
  }

  /**
   * Search workflow history with text search
   * @param searchTerm - The search term to match against workflow definition ID, description, or instance ID
   * @param pagination - Pagination options
   * @returns Paginated workflow history
   */
  async searchWorkflowHistory(
    searchTerm: string,
    pagination?: IWorkflowHistoryPagination
  ): Promise<IPaginatedWorkflowHistory> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.searchWorkflowHistory(searchTerm, pagination);
    } catch (error) {
      this.context.log('Error searching workflow history', { error, searchTerm }, 'error');
      throw error;
    }
  }

  /**
   * Get recent workflow executions
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of recent workflow history items
   */
  async getRecentWorkflowExecutions(limit: number = 10): Promise<IWorkflowHistoryItem[]> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      return await lifecycleManager.getRecentWorkflowExecutions(limit);
    } catch (error) {
      this.context.log('Error getting recent workflow executions', { error, limit }, 'error');
      throw error;
    }
  }

  // ============================================
  // Workflow History Management
  // ============================================

  /**
   * Delete a single workflow execution history item
   * @param instanceId - The workflow instance ID to delete
   * @returns Operation result
   */
  async deleteWorkflowHistory(instanceId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.deleteWorkflowHistory(instanceId);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error deleting workflow history', { error, instanceId }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow history: ${error.message}`
      };
    }
  }

  /**
   * Delete multiple workflow execution history items
   * @param instanceIds - Array of workflow instance IDs to delete
   * @returns Operation result
   */
  async deleteWorkflowHistoryBatch(instanceIds: string[]): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.deleteWorkflowHistoryBatch(instanceIds);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error deleting workflow history batch', { error, instanceIds }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow history batch: ${error.message}`
      };
    }
  }

  /**
   * Clear all workflow execution history for a specific workflow definition
   * @param workflowDefinitionId - The workflow definition ID
   * @returns Operation result
   */
  async clearWorkflowHistory(workflowDefinitionId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      
      const result = await lifecycleManager.clearWorkflowHistory(workflowDefinitionId);
      
      return {
        success: result.success,
        message: result.message,
        data: { deletedCount: result.deletedCount }
      };
    } catch (error) {
      this.context.log('Error clearing workflow history', { error, workflowDefinitionId }, 'error');
      return {
        success: false,
        message: `Failed to clear workflow history: ${error.message}`
      };
    }
  }

  // Workflow Schedules
  async getWorkflowSchedules(pagination?: IPaginationInput): Promise<IPaginatedSchedules> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = Array.from(await scheduler?.getSchedules() || []).map((entry: any) => entry[1]);
      
      // Apply pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedSchedules = schedules.slice(startIndex, endIndex);
      const total = schedules.length;
      const pages = Math.ceil(total / limit);

      return {
        schedules: paginatedSchedules,
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow schedules', { error }, 'error');
      throw error;
    }
  }

  async getWorkflowSchedule(scheduleId: string): Promise<IScheduledWorkflow> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedule = await scheduler?.getSchedule(scheduleId);
      
      if (!schedule) {
        throw new Error(`Workflow schedule ${scheduleId} not found`);
      }

      return schedule;
    } catch (error) {
      this.context.log('Error getting workflow schedule', { error }, 'error');
      throw error;
    }
  }

  /**
   * Flatten an IScheduledWorkflow into the shape expected by the WorkflowSchedule GraphQL type
   */
  private flattenScheduledWorkflow(scheduled: IScheduledWorkflow): any {
    return {
      ...scheduled.config,
      lastRun: scheduled.lastRun,
      nextRun: scheduled.nextRun,
      runCount: scheduled.runCount,
      errorCount: scheduled.errorCount,
      isRunning: scheduled.isRunning,
      enabled: scheduled.config.schedule?.enabled !== false,
    };
  }

  async createWorkflowSchedule(config: IScheduleConfigInput): Promise<any> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      // Build the full IScheduleConfig from the input
      const scheduleConfig: IScheduleConfig = {
        id: config.id || `${config.workflow.nameSpace || 'default'}.${config.workflow.id}`.toLowerCase().replace(/[^a-z0-9.]/g, '-'),
        name: config.name,
        description: config.description,
        workflow: {
          id: config.workflow.id,
          version: config.workflow.version || '1',
          nameSpace: config.workflow.nameSpace,
        },
        schedule: {
          cron: config.schedule.cron,
          timezone: config.schedule.timezone,
          enabled: config.schedule.enabled !== false,
        },
        properties: config.properties,
        propertiesFormId: config.propertiesFormId,
        retry: config.retry,
        timeout: config.timeout,
        maxConcurrent: config.maxConcurrent,
      };

      const newSchedule = await scheduler.createSchedule(scheduleConfig);
      return this.flattenScheduledWorkflow(newSchedule);
    } catch (error) {
      this.context.log('Error creating workflow schedule', { error, config }, 'error');
      throw error;
    }
  }

  async updateWorkflowSchedule(scheduleId: string, updates: IUpdateScheduleInput): Promise<any> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      // Build partial IScheduleConfig from the update input
      const configUpdates: Partial<IScheduleConfig> = {};
      if (updates.name !== undefined) configUpdates.name = updates.name;
      if (updates.description !== undefined) configUpdates.description = updates.description;
      if (updates.workflow) configUpdates.workflow = { id: updates.workflow.id, version: updates.workflow.version || '1', nameSpace: updates.workflow.nameSpace };
      if (updates.schedule) configUpdates.schedule = { cron: updates.schedule.cron, timezone: updates.schedule.timezone, enabled: updates.schedule.enabled };
      if (updates.properties !== undefined) configUpdates.properties = updates.properties;
      if (updates.propertiesFormId !== undefined) configUpdates.propertiesFormId = updates.propertiesFormId;
      if (updates.retry !== undefined) configUpdates.retry = updates.retry;
      if (updates.timeout !== undefined) configUpdates.timeout = updates.timeout;
      if (updates.maxConcurrent !== undefined) configUpdates.maxConcurrent = updates.maxConcurrent;

      const schedule = await scheduler.updateScheduleConfig(scheduleId, configUpdates);
      return this.flattenScheduledWorkflow(schedule);
    } catch (error) {
      this.context.log('Error updating workflow schedule', { error, scheduleId, updates }, 'error');
      throw error;
    }
  }

  async deleteWorkflowSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();

      if (!scheduler) {
        throw new Error('Workflow scheduler is not available');
      }

      await scheduler.removeSchedule(scheduleId);
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} deleted successfully`
      };
    } catch (error) {
      this.context.log('Error deleting workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to delete workflow schedule: ${error.message}`
      };
    }
  }

  async startSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.startSchedule(scheduleId); // Corrected from resumeSchedule to startSchedule
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} started successfully`
      };
    } catch (error) {
      this.context.log('Error starting workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to start workflow schedule: ${error.message}`
      };
    }
  }

  async stopSchedule(scheduleId: string): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.stopSchedule(scheduleId); // Corrected from pauseSchedule to stopSchedule
      
      return {
        success: true,
        message: `Workflow schedule ${scheduleId} stopped successfully`
      };
    } catch (error) {
      this.context.log('Error stopping workflow schedule', { error, scheduleId }, 'error');
      return {
        success: false,
        message: `Failed to stop workflow schedule: ${error.message}`
      };
    }
  }

  async reloadSchedules(): Promise<IWorkflowOperationResult> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      await scheduler?.reloadSchedules();
      
      return {
        success: true,
        message: 'Workflow schedules reloaded successfully'
      };
    } catch (error) {
      this.context.log('Error reloading workflow schedules', { error }, 'error');
      return {
        success: false,
        message: `Failed to reload workflow schedules: ${error.message}`
      };
    }
  }

  /**
   * Get all schedules for a specific workflow by its complete ID
   * Workflow IDs follow the pattern: "namespace.WorkflowName@version"
   * @param workflowId - The complete workflow ID (e.g., "core.CleanCacheWorkflow@1.0.0")
   * @returns Array of schedules for the specified workflow
   */
  async getWorkflowSchedulesForWorkflowId(workflowId: string): Promise<any[]> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = scheduler?.getSchedulesForWorkflow(workflowId) || [];
      
      this.context.log(
        `Retrieved ${schedules.length} schedules for workflow ${workflowId}`,
        { workflowId, count: schedules.length },
        'debug'
      );

      return schedules.map((schedule: IScheduledWorkflow) => {
        return {
          ...schedule.config,
          lastRun: schedule.lastRun,
          nextRun: schedule.nextRun,
          runCount: schedule.runCount,
          errorCount: schedule.errorCount,
          isRunning: schedule.isRunning,
          enabled: schedule.config.schedule?.enabled !== false,
        };
      }) || [];
    } catch (error) {
      this.context.log('Error getting schedules for workflow', { error, workflowId }, 'error');
      throw error;
    }
  }

  /**
   * Filter schedules by workflow properties (namespace, name, version)
   * This method parses workflow IDs and matches against the provided criteria
   * @param nameSpace - Optional namespace to filter by (e.g., "core")
   * @param name - Optional workflow name to filter by (e.g., "CleanCacheWorkflow")
   * @param version - Optional version to filter by (e.g., "1.0.0")
   * @param pagination - Optional pagination parameters
   * @returns Filtered schedules with pagination
   */
  async filterSchedulesByWorkflowProperties(
    nameSpace?: string,
    name?: string,
    version?: string,
    pagination?: IPaginationInput
  ): Promise<IFilteredSchedulesResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const scheduler = workflowRunner?.getScheduler();
      const schedules = scheduler?.filterSchedulesByWorkflowProperties(nameSpace, name, version) || [];
      
      // Apply pagination if provided
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedSchedules = Array.from(schedules).slice(startIndex, endIndex);
      const total = schedules.length;
      const pages = Math.ceil(total / limit);

      this.context.log(
        'Filtered schedules by workflow properties',
        { 
          nameSpace, 
          name, 
          version, 
          total,
          page,
          limit
        },
        'debug'
      );

      return {
        schedules: paginatedSchedules,
        filter: {
          nameSpace,
          name,
          version
        },
        pagination: {
          page,
          pages,
          limit,
          total
        }
      };
    } catch (error) {
      this.context.log(
        'Error filtering schedules by workflow properties',
        { error, nameSpace, name, version },
        'error'
      );
      throw error;
    }
  }

  // Audit and Monitoring
  async getWorkflowAuditLog(filter?: IAuditFilterInput, pagination?: IPaginationInput): Promise<IPaginatedAuditLogs> {
    try {
      // This would typically query MongoDB for audit logs
      // For now, return empty structure
      const entries: any[] = [];
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      
      return {
        entries,
        pagination: {
          page,
          pages: 0,
          limit,
          total: 0
        }
      };
    } catch (error) {
      this.context.log('Error getting workflow audit log', { error }, 'error');
      throw error;
    }
  }

  // Legacy Support
  async getWorkflowStatus(workflowId: string): Promise<IWorkflowStatusResponse> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const workflow = workflowRunner?.getWorkflowWithId(workflowId);
            
      let status: IWorkflowStatusResponse = {
        status: 'INACTIVE',
        errors: workflow?.errors || [],
        statistics: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0
        },
        configuration: workflowRunner?.getConfiguration(workflowId, workflow.version),
        instances: workflowRunner?.getAllWorkflowInstances().filter((instance: IWorkflowInstance) => instance.workflowId === workflowId),
        dependencies: workflow.dependencies || [],
        schedules: await this.getWorkflowSchedulesForWorkflowId(workflowId) || []
      };

      // check the configuration for the workflow
      if (status.configuration && status.configuration.enabled === false) {
        status.status = 'INACTIVE';
      }

      if(status.schedules?.length && status.schedules?.length > 0) {
        let hasEnabledSchedules = false;
        status.schedules.forEach(async (schedule: IScheduleConfig) => {
          if (schedule.schedule.enabled) {
            hasEnabledSchedules = true;
          }          
        });
        if (!hasEnabledSchedules) {
          status.status = 'INACTIVE';
        }
      }
      return status;
    } catch (error) {
      this.context.log('Error getting workflow status', { error, name }, 'error');
      throw error;
    }
  }

  async startWorkflowLegacy(name: string, data: any): Promise<boolean> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      await workflowRunner?.startWorkflow(name, '1.0.0', data.input || {}, this.context);
      return true;
    } catch (error) {
      this.context.log('Error starting workflow (legacy)', { error, name, data }, 'error');
      return false;
    }
  }

  /**
   * Get combined error information for a specific workflow definition.
   * Merges ErrorHandler in-memory stats with execution history step-level failures from MongoDB.
   * @param workflowId - The workflow definition ID (e.g., 'kb.CollectSystemDocsWorkflow@1.0.0')
   * @returns Array of error objects with message, code, and stack
   */
  async getWorkflowErrors(workflowId: string): Promise<Array<{ message: string; code: string; stack?: string }>> {
    try {
      const workflowRunner = await this.getWorkflowRunner();
      const errors: Array<{ message: string; code: string; stack?: string }> = [];

      // 1. Get ErrorHandler in-memory stats (captures startWorkflow-level failures)
      const errorStats = workflowRunner?.getAllErrorStats();
      if (errorStats) {
        const stats = errorStats.get(workflowId);
        if (stats) {
          errors.push({
            message: stats.message || `${stats.errorType} error (${stats.count} occurrence(s))`,
            code: stats.errorType || 'UNKNOWN',
            stack: stats.stack,
          });
        }
      }

      // 2. Get execution history step-level failures from MongoDB
      const lifecycleManager = workflowRunner?.getLifecycleManager();
      if (lifecycleManager) {
        const errorDetails = await lifecycleManager.getWorkflowErrorDetails(workflowId, 10);
        for (const detail of errorDetails) {
          for (const step of detail.failedSteps) {
            const errorMessage = step.persistenceData?.message 
              || step.persistenceData?.error?.message
              || `Step ${step.stepId} failed (${step.statusLabel})`;
            errors.push({
              message: `[Instance ${detail.instanceId}] ${errorMessage}`,
              code: `STEP_FAILED_${step.stepId}`,
              stack: step.persistenceData?.stack || step.persistenceData?.error?.stack,
            });
          }
        }
      }

      return errors;
    } catch (error) {
      this.context.log('Error getting workflow errors', { error, workflowId }, 'error');
      return [];
    }
  }

  // ─── Workflow Definition CRUD ───────────────────────────────────────────────

  /**
   * Validate a workflow definition without saving it.
   */
  async validateWorkflowDefinition(
    definition: IWorkflowDefinitionInput
  ): Promise<IWorkflowValidationResult> {
    const errors: IWorkflowValidationError[] = [];
    const warnings: IWorkflowValidationError[] = [];

    if (!definition.nameSpace || definition.nameSpace.trim().length === 0) {
      errors.push({ field: 'nameSpace', message: 'nameSpace is required', code: 'REQUIRED' });
    }
    if (!definition.name || definition.name.trim().length === 0) {
      errors.push({ field: 'name', message: 'name is required', code: 'REQUIRED' });
    }
    if (!definition.version || definition.version.trim().length === 0) {
      errors.push({ field: 'version', message: 'version is required', code: 'REQUIRED' });
    }

    // Reject path traversal characters in identifiers
    const pathSegmentPattern = /^[a-zA-Z0-9_.\-]+$/;
    for (const field of ['nameSpace', 'name', 'version'] as const) {
      const value = definition[field];
      if (value && !pathSegmentPattern.test(value)) {
        errors.push({
          field,
          message: `${field} contains invalid characters. Only alphanumeric, dash, underscore, and dot are allowed.`,
          code: 'INVALID_CHARACTERS',
        });
      }
    }

    if (!definition.steps || definition.steps.length === 0) {
      errors.push({ field: 'steps', message: 'At least one step is required', code: 'REQUIRED' });
    }

    if (definition.steps) {
      const stepIds = new Set<string>();
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        if (!step.id) {
          errors.push({ field: `steps[${i}].id`, message: 'Step id is required', code: 'REQUIRED' });
        } else if (stepIds.has(step.id)) {
          errors.push({ field: `steps[${i}].id`, message: `Duplicate step id: ${step.id}`, code: 'DUPLICATE' });
        } else {
          stepIds.add(step.id);
        }
        if (!step.type) {
          errors.push({ field: `steps[${i}].type`, message: 'Step type is required', code: 'REQUIRED' });
        }
      }

      // Validate designer connections reference existing steps
      if (definition.designer?.connections) {
        for (const conn of definition.designer.connections) {
          if (conn.sourceStepId && !stepIds.has(conn.sourceStepId)) {
            warnings.push({
              field: 'designer.connections',
              message: `Connection references unknown source step: ${conn.sourceStepId}`,
              code: 'UNKNOWN_STEP_REF',
            });
          }
          if (conn.targetStepId && !stepIds.has(conn.targetStepId)) {
            warnings.push({
              field: 'designer.connections',
              message: `Connection references unknown target step: ${conn.targetStepId}`,
              code: 'UNKNOWN_STEP_REF',
            });
          }
        }
      }
    }

    if (!definition.description) {
      warnings.push({ field: 'description', message: 'Description is recommended', code: 'RECOMMENDED' });
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Save (create or update) a workflow definition to the YAML catalog.
   * Builds the YAML structure from the input, writes to the catalog directory,
   * and returns the definition via the standard load pipeline.
   */
  async saveWorkflowDefinition(
    definition: IWorkflowDefinitionInput
  ): Promise<IYamlWorkflowDefinitionResult> {
    const validation = await this.validateWorkflowDefinition(definition);
    if (!validation.isValid) {
      return {
        nameSpace: definition.nameSpace,
        name: definition.name,
        version: definition.version,
        steps: [],
        loadStatus: 'PARSE_ERROR',
        errors: (validation.errors || []).map((e) => ({
          stage: 'VALIDATION' as const,
          message: e.message,
          code: e.code,
        })),
      };
    }

    const { writeFileSync, mkdirSync, existsSync } = await import('fs');
    const path = await import('path');
    const yaml = await import('js-yaml');

    const reactoryData = process.env.REACTORY_DATA;
    if (!reactoryData) {
      return {
        nameSpace: definition.nameSpace,
        name: definition.name,
        version: definition.version,
        steps: [],
        loadStatus: 'NOT_FOUND',
        errors: [{ stage: 'FILE_RESOLVE' as const, message: 'REACTORY_DATA environment variable is not set' }],
      };
    }

    const { nameSpace, name, version } = definition;
    const targetDir = path.join(reactoryData, 'workflows', 'catalog', nameSpace, name, version);
    const targetFile = path.join(targetDir, `${name}.yaml`);

    // Build the YAML object structure matching the expected parse format
    const yamlObject: Record<string, any> = {
      nameSpace,
      name,
      version,
    };
    if (definition.description) yamlObject.description = definition.description;
    if (definition.author) yamlObject.author = definition.author;
    if (definition.tags && definition.tags.length > 0) yamlObject.tags = definition.tags;
    if (definition.inputs) yamlObject.inputs = definition.inputs;
    if (definition.outputs) yamlObject.outputs = definition.outputs;
    if (definition.variables) yamlObject.variables = definition.variables;

    // Build steps, separating designer metadata from step definitions
    yamlObject.steps = definition.steps.map((step) => {
      const yamlStep: Record<string, any> = { id: step.id, type: step.type };
      if (step.name) yamlStep.name = step.name;
      if (step.description) yamlStep.description = step.description;
      if (step.enabled !== undefined) yamlStep.enabled = step.enabled;
      if (step.continueOnError !== undefined) yamlStep.continueOnError = step.continueOnError;
      if (step.timeout !== undefined) yamlStep.timeout = step.timeout;
      if (step.inputs) yamlStep.inputs = step.inputs;
      if (step.outputs) yamlStep.outputs = step.outputs;
      if (step.condition) yamlStep.condition = step.condition;
      if (step.dependsOn) yamlStep.dependsOn = step.dependsOn;
      if (step.config) yamlStep.config = step.config;
      if (step.steps) yamlStep.steps = step.steps;
      if (step.designer) yamlStep.designer = step.designer;
      return yamlStep;
    });

    // Store designer metadata under metadata.designer (matches read pipeline)
    if (definition.designer) {
      yamlObject.metadata = { designer: definition.designer };
    }

    try {
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }

      const yamlContent = yaml.dump(yamlObject, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false,
      });
      writeFileSync(targetFile, yamlContent, 'utf8');

      this.context.log(
        `Saved workflow definition ${nameSpace}.${name}@${version} to ${targetFile}`,
        { targetFile },
        'info'
      );

      // Return the definition through the standard load pipeline for consistency
      return this.getWorkflowYamlDefinition(nameSpace, name, version);
    } catch (err) {
      this.context.log(
        `Failed to save workflow definition ${nameSpace}.${name}@${version}: ${err instanceof Error ? err.message : String(err)}`,
        { targetFile, err },
        'error'
      );
      return {
        nameSpace,
        name,
        version,
        steps: [],
        loadStatus: 'NOT_FOUND',
        errors: [{
          stage: 'FILE_RESOLVE' as const,
          message: `Failed to write workflow file: ${err instanceof Error ? err.message : String(err)}`,
        }],
      };
    }
  }

  /**
   * Delete a workflow definition from the YAML catalog.
   */
  async deleteWorkflowDefinition(
    nameSpace: string,
    name: string,
    version?: string
  ): Promise<IWorkflowOperationResult> {
    const pathSegmentPattern = /^[a-zA-Z0-9_.\-]+$/;
    for (const [field, value] of [['nameSpace', nameSpace], ['name', name], ['version', version]] as const) {
      if (value && !pathSegmentPattern.test(value)) {
        return { success: false, message: `${field} contains invalid characters` };
      }
    }

    const { unlinkSync, existsSync, readdirSync, rmdirSync } = await import('fs');
    const path = await import('path');

    const reactoryData = process.env.REACTORY_DATA;
    if (!reactoryData) {
      return { success: false, message: 'REACTORY_DATA environment variable is not set' };
    }

    const resolvedVersion = version || '1.0.0';
    const targetDir = path.join(reactoryData, 'workflows', 'catalog', nameSpace, name, resolvedVersion);

    // Search for the YAML file (could be .yaml or .yml)
    const extensions = ['.yaml', '.yml'];
    let targetFile: string | null = null;

    for (const ext of extensions) {
      const candidate = path.join(targetDir, `${name}${ext}`);
      if (existsSync(candidate)) {
        targetFile = candidate;
        break;
      }
    }

    if (!targetFile) {
      return { success: false, message: `Workflow definition ${nameSpace}.${name}@${resolvedVersion} not found in catalog` };
    }

    try {
      unlinkSync(targetFile);

      // Clean up empty version directory
      if (existsSync(targetDir) && readdirSync(targetDir).length === 0) {
        rmdirSync(targetDir);
      }

      this.context.log(
        `Deleted workflow definition ${nameSpace}.${name}@${resolvedVersion} from ${targetFile}`,
        { targetFile },
        'info'
      );

      return { success: true, message: `Workflow definition ${nameSpace}.${name}@${resolvedVersion} deleted` };
    } catch (err) {
      this.context.log(
        `Failed to delete workflow definition ${nameSpace}.${name}@${resolvedVersion}: ${err instanceof Error ? err.message : String(err)}`,
        { targetFile, err },
        'error'
      );
      return {
        success: false,
        message: `Failed to delete workflow file: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}


export default  ReactoryWorkflowService;
