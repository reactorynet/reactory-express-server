import express from 'express';
import { WorkflowRunner, DefaultWorkflows } from '@reactory/server-core/workflow/WorkflowRunner';
import { WorkflowPriority, WorkflowStatus } from '@reactory/server-core/workflow/LifecycleManager/LifecycleManager';
import logger from '@reactory/server-core/logging';

const workflowRunner = new WorkflowRunner({
  workflows: DefaultWorkflows
});

// Initialize the workflow runner
workflowRunner.initialize()
.then(() => {
  logger.info('WorkflowRunner initialized successfully');
})
.catch((error) => {
  logger.error('Failed to initialize WorkflowRunner', error);
});

const router = express.Router();

// Error handling middleware for async routes
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Input validation helper
const validateRequired = (fields: string[], data: any): string[] => {
  const missing: string[] = [];
  fields.forEach(field => {
    if (!data[field]) {
      missing.push(field);
    }
  });
  return missing;
};

// System Status Routes
router.get('/status', asyncHandler(async (req: any, res: any) => {
  try {
    const isInitialized = workflowRunner.isInitialized();
    const lifecycleStats = workflowRunner.getLifecycleStats();
    const errorStats = Array.from(workflowRunner.getAllErrorStats().entries()).map(([workflowId, stats]) => ({
      workflowId,
      errorCount: stats.count,
      lastError: stats.lastError
    }));
    const configStats = workflowRunner.getConfigurationStats();
    const securityStats = workflowRunner.getSecurityStats();

    const status = {
      system: {
        initialized: isInitialized,
        status: isInitialized ? 'healthy' : 'initializing',
        timestamp: new Date().toISOString()
      },
      lifecycle: lifecycleStats,
      errors: errorStats,
      configuration: configStats,
      security: securityStats
    };

    res.status(200).json(status);
  } catch (error) {
    logger.error('Failed to get workflow status', error);
    res.status(500).json({
      error: 'Failed to retrieve system status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Workflow Registry Routes
router.get('/workflows', asyncHandler(async (req: any, res: any) => {
  try {
    const { nameSpace, category, search } = req.query;
    
    let workflows = workflowRunner.getRegisteredWorkflows();
    
    // Filter by namespace if provided
    if (nameSpace) {
      workflows = workflows.filter(workflow => workflow.nameSpace === nameSpace);
    }
    
    // Filter by category if provided
    if (category) {
      workflows = workflows.filter(workflow => workflow.category === category);
    }
    
    // Search by name or namespace if provided
    if (search) {
      const searchLower = search.toLowerCase();
      workflows = workflows.filter(workflow => 
        workflow.name.toLowerCase().includes(searchLower) ||
        workflow.nameSpace.toLowerCase().includes(searchLower)
      );
    }
    
    // Get workflow statistics
    const stats = workflowRunner.getWorkflowStats();
    
    // Transform workflows to remove component references for API response
    const workflowsResponse = workflows.map(workflow => ({
      nameSpace: workflow.nameSpace,
      name: workflow.name,
      version: workflow.version,
      category: workflow.category,
      autoStart: workflow.autoStart || false,
      hasProps: !!workflow.props,
      propsKeys: workflow.props ? Object.keys(workflow.props) : []
    }));

    res.status(200).json({
      workflows: workflowsResponse,
      stats,
      filters: {
        nameSpace: nameSpace || null,
        category: category || null,
        search: search || null
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get registered workflows', error);
    res.status(500).json({
      error: 'Failed to retrieve registered workflows',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.get('/workflows/:nameSpace/:name', asyncHandler(async (req: any, res: any) => {
  try {
    const { nameSpace, name } = req.params;
    const { version } = req.query;
    
    if (!nameSpace || !name) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'nameSpace and name are required'
      });
    }

    const workflow = workflowRunner.getWorkflowByName(nameSpace, name, version);
    
    if (!workflow) {
      return res.status(404).json({
        error: 'Not found',
        message: `Workflow ${nameSpace}.${name}${version ? `@${version}` : ''} not found`
      });
    }

    // Transform workflow for API response
    const workflowResponse = {
      nameSpace: workflow.nameSpace,
      name: workflow.name,
      version: workflow.version,
      category: workflow.category,
      autoStart: workflow.autoStart || false,
      hasProps: !!workflow.props,
      props: workflow.props || {},
      fullId: `${workflow.nameSpace}.${workflow.name}@${workflow.version}`
    };

    res.status(200).json(workflowResponse);
  } catch (error) {
    logger.error(`Failed to get workflow ${req.params.nameSpace}.${req.params.name}`, error);
    res.status(500).json({
      error: 'Failed to retrieve workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Workflow Execution Routes
router.post('/start/:workflowId', asyncHandler(async (req: any, res: any) => {
  try {
    const { workflowId } = req.params;
    const version = typeof req.query.version === 'string' ? req.query.version : '1';
    const data = { ...req.query, ...req.body };
    
    if (!workflowId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'workflowId is required'
      });
    }

    const result = await workflowRunner.startWorkflow(workflowId, version, data);
    
    res.status(201).json({
      instanceId: result,
      workflowId,
      version,
      status: 'started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to start workflow ${req.params.workflowId}`, error);
    res.status(500).json({
      error: 'Failed to start workflow',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Workflow Instance Management Routes
router.get('/instance/:instanceId', asyncHandler(async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    
    if (!instanceId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'instanceId is required'
      });
    }

    const instance = workflowRunner.getWorkflowInstance(instanceId);
    
    if (!instance) {
      return res.status(404).json({
        error: 'Not found',
        message: `Workflow instance ${instanceId} not found`
      });
    }

    res.status(200).json(instance);
  } catch (error) {
    logger.error(`Failed to get workflow instance ${req.params.instanceId}`, error);
    res.status(500).json({
      error: 'Failed to retrieve workflow instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/instance/:instanceId/pause', asyncHandler(async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    
    if (!instanceId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'instanceId is required'
      });
    }

    const instance = workflowRunner.getWorkflowInstance(instanceId);
    if (!instance) {
      return res.status(404).json({
        error: 'Not found',
        message: `Workflow instance ${instanceId} not found`
      });
    }

    if (instance.status !== WorkflowStatus.RUNNING) {
      return res.status(400).json({
        error: 'Invalid state',
        message: `Cannot pause workflow in ${instance.status} state`
      });
    }

    workflowRunner.pauseWorkflowInstance(instanceId);
    
    res.status(200).json({
      instanceId,
      status: 'paused',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to pause workflow instance ${req.params.instanceId}`, error);
    res.status(500).json({
      error: 'Failed to pause workflow instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/instance/:instanceId/resume', asyncHandler(async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    
    if (!instanceId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'instanceId is required'
      });
    }

    const instance = workflowRunner.getWorkflowInstance(instanceId);
    if (!instance) {
      return res.status(404).json({
        error: 'Not found',
        message: `Workflow instance ${instanceId} not found`
      });
    }

    if (instance.status !== WorkflowStatus.PAUSED) {
      return res.status(400).json({
        error: 'Invalid state',
        message: `Cannot resume workflow in ${instance.status} state`
      });
    }

    workflowRunner.resumeWorkflowInstance(instanceId);
    
    res.status(200).json({
      instanceId,
      status: 'resumed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to resume workflow instance ${req.params.instanceId}`, error);
    res.status(500).json({
      error: 'Failed to resume workflow instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.delete('/instance/:instanceId', asyncHandler(async (req: any, res: any) => {
  try {
    const { instanceId } = req.params;
    const { reason } = req.body;
    
    if (!instanceId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'instanceId is required'
      });
    }

    const instance = workflowRunner.getWorkflowInstance(instanceId);
    if (!instance) {
      return res.status(404).json({
        error: 'Not found',
        message: `Workflow instance ${instanceId} not found`
      });
    }

    workflowRunner.cancelWorkflowInstance(instanceId, reason);
    
    res.status(200).json({
      instanceId,
      status: 'cancelled',
      reason: reason || 'User requested cancellation',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to cancel workflow instance ${req.params.instanceId}`, error);
    res.status(500).json({
      error: 'Failed to cancel workflow instance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Schedule Management Routes
router.get('/schedules', asyncHandler(async (req: any, res: any) => {
  try {
    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const schedules = Array.from(scheduler.getSchedules().entries()).map(([id, scheduledWorkflow]) => ({
      id,
      ...scheduledWorkflow
    }));
    const stats = scheduler.getStats();
    
    res.status(200).json({
      schedules,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get schedules', error);
    res.status(500).json({
      error: 'Failed to retrieve schedules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/schedules', asyncHandler(async (req: any, res: any) => {
  try {
    const requiredFields = ['id', 'name', 'workflowId', 'cron'];
    const missing = validateRequired(requiredFields, req.body);
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    // Check if schedule already exists
    const existingSchedule = scheduler.getSchedule(req.body.id);
    if (existingSchedule) {
      return res.status(409).json({
        error: 'Conflict',
        message: `Schedule with ID ${req.body.id} already exists`
      });
    }

    const scheduleConfig: any = {
      id: req.body.id,
      name: req.body.name,
      description: req.body.description,
      workflow: {
        id: req.body.workflowId,
        version: req.body.version || '1',
        nameSpace: req.body.nameSpace
      },
      schedule: {
        cron: req.body.cron,
        timezone: req.body.timezone || 'UTC',
        enabled: req.body.enabled !== false
      },
      properties: req.body.properties || req.body.data || {},
      retry: req.body.retry || {
        attempts: req.body.retryAttempts || 0,
        delay: req.body.retryDelay ? Math.floor(req.body.retryDelay / 1000) : 60
      },
      timeout: req.body.timeout,
      maxConcurrent: req.body.maxConcurrent || 1
    };

    // Note: Since addSchedule is private, we need to save the schedule to file and reload
    // This is a limitation of the current architecture
    res.status(501).json({
      error: 'Not implemented',
      message: 'Schedule creation via API is not currently supported. Please create schedule configuration files in the schedules directory.',
      scheduleFormat: scheduleConfig
    });
  } catch (error) {
    logger.error('Failed to create schedule', error);
    res.status(500).json({
      error: 'Failed to create schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.get('/schedules/:scheduleId', asyncHandler(async (req: any, res: any) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'scheduleId is required'
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const schedule = scheduler.getSchedule(scheduleId);
    
    if (!schedule) {
      return res.status(404).json({
        error: 'Not found',
        message: `Schedule ${scheduleId} not found`
      });
    }

    res.status(200).json({
      id: scheduleId,
      ...schedule
    });
  } catch (error) {
    logger.error(`Failed to get schedule ${req.params.scheduleId}`, error);
    res.status(500).json({
      error: 'Failed to retrieve schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.put('/schedules/:scheduleId', asyncHandler(async (req: any, res: any) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'scheduleId is required'
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const existingSchedule = scheduler.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Not found',
        message: `Schedule ${scheduleId} not found`
      });
    }

    // Note: Schedule updates require file system changes and scheduler reload
    res.status(501).json({
      error: 'Not implemented',
      message: 'Schedule updates via API are not currently supported. Please modify schedule configuration files and reload schedules.',
      currentSchedule: existingSchedule
    });
  } catch (error) {
    logger.error(`Failed to update schedule ${req.params.scheduleId}`, error);
    res.status(500).json({
      error: 'Failed to update schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.delete('/schedules/:scheduleId', asyncHandler(async (req: any, res: any) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'scheduleId is required'
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const existingSchedule = scheduler.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Not found',
        message: `Schedule ${scheduleId} not found`
      });
    }

    // Stop the schedule
    await scheduler.stopSchedule(scheduleId);
    
    res.status(200).json({
      scheduleId,
      status: 'stopped',
      message: 'Schedule stopped. To permanently delete, remove the configuration file and reload schedules.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to delete schedule ${req.params.scheduleId}`, error);
    res.status(500).json({
      error: 'Failed to delete schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Schedule control routes
router.post('/schedules/:scheduleId/start', asyncHandler(async (req: any, res: any) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'scheduleId is required'
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const existingSchedule = scheduler.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Not found',
        message: `Schedule ${scheduleId} not found`
      });
    }

    await scheduler.startSchedule(scheduleId);
    
    res.status(200).json({
      scheduleId,
      status: 'started',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to start schedule ${req.params.scheduleId}`, error);
    res.status(500).json({
      error: 'Failed to start schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/schedules/:scheduleId/stop', asyncHandler(async (req: any, res: any) => {
  try {
    const { scheduleId } = req.params;
    
    if (!scheduleId) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'scheduleId is required'
      });
    }

    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    const existingSchedule = scheduler.getSchedule(scheduleId);
    if (!existingSchedule) {
      return res.status(404).json({
        error: 'Not found',
        message: `Schedule ${scheduleId} not found`
      });
    }

    await scheduler.stopSchedule(scheduleId);
    
    res.status(200).json({
      scheduleId,
      status: 'stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Failed to stop schedule ${req.params.scheduleId}`, error);
    res.status(500).json({
      error: 'Failed to stop schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/schedules/reload', asyncHandler(async (req: any, res: any) => {
  try {
    const scheduler = workflowRunner.getScheduler();
    if (!scheduler) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Scheduler not initialized'
      });
    }

    await scheduler.reloadSchedules();
    const stats = scheduler.getStats();
    
    res.status(200).json({
      status: 'reloaded',
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to reload schedules', error);
    res.status(500).json({
      error: 'Failed to reload schedules',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Audit and Monitoring Routes
router.get('/audit', asyncHandler(async (req: any, res: any) => {
  try {
    const {
      userId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (action) filter.action = action;
    if (resource) filter.resource = resource;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate as string);
      if (endDate) filter.timestamp.$lte = new Date(endDate as string);
    }

    const auditLogs = workflowRunner.getAuditLogs(filter);
    
    // Simple pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedLogs = auditLogs.slice(startIndex, endIndex);
    
    res.status(200).json({
      logs: paginatedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: auditLogs.length,
        pages: Math.ceil(auditLogs.length / limitNum)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to get audit logs', error);
    res.status(500).json({
      error: 'Failed to retrieve audit logs',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.get('/metrics', asyncHandler(async (req: any, res: any) => {
  try {
    const lifecycleStats = workflowRunner.getLifecycleStats();
    const errorStats = Array.from(workflowRunner.getAllErrorStats().entries()).map(([workflowId, stats]) => ({
      workflowId,
      errorCount: stats.count,
      lastError: stats.lastError
    }));
    const configStats = workflowRunner.getConfigurationStats();
    const securityStats = workflowRunner.getSecurityStats();
    
    const scheduler = workflowRunner.getScheduler();
    const schedulerStats = scheduler ? scheduler.getStats() : null;

    const metrics = {
      system: {
        initialized: workflowRunner.isInitialized(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      workflows: {
        lifecycle: lifecycleStats,
        errors: errorStats,
        scheduler: schedulerStats
      },
      configuration: configStats,
      security: securityStats
    };

    res.status(200).json(metrics);
  } catch (error) {
    logger.error('Failed to get metrics', error);
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.get('/configs', asyncHandler(async (req: any, res: any) => {
  try {
    const { workflowId, version, format = 'json' } = req.query;
    
    if (workflowId && version) {
      // Get specific configuration
      const config = workflowRunner.getConfiguration(workflowId as string, version as string);
      if (!config) {
        return res.status(404).json({
          error: 'Not found',
          message: `Configuration for workflow ${workflowId}@${version} not found`
        });
      }
      res.status(200).json(config);
    } else {
      // Export all configurations
      const configs = workflowRunner.exportConfigurations(format as 'json' | 'yaml');
      const stats = workflowRunner.getConfigurationStats();
      
      if (format === 'yaml') {
        res.setHeader('Content-Type', 'text/yaml');
        res.status(200).send(configs);
      } else {
        res.status(200).json({
          configurations: JSON.parse(configs),
          stats,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    logger.error('Failed to get configurations', error);
    res.status(500).json({
      error: 'Failed to retrieve configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Error handling middleware
router.use((error: any, req: any, res: any, next: any) => {
  logger.error('Workflow route error', error);
  
  if (res.headersSent) {
    return next(error);
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString()
  });
});

export default router;