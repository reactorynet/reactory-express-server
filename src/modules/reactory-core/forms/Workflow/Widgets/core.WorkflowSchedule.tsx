import Reactory from '@reactory/reactory-core';
import { WorkflowScheduleProps } from './types';

interface WorkflowScheduleQueryResult {  
    workflowWithId: {
      id: string;
      name: string;
      nameSpace: string;
      version: string;
      schedules: any[];
    }  
}

type WorkflowScheduleQueryData = WorkflowScheduleQueryResult | null;

interface WorkflowScheduleQueryVariables {
    id: string;
}

/**
 * WorkflowSchedule Component
 * 
 * Displays schedule information for the workflow
 */
const WorkflowSchedule = (props: WorkflowScheduleProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { 
    Box, 
    Typography, 
    Icon, 
    Button,
    CircularProgress
  } = MaterialCore;

  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchWorkflowSchedules = async () => {
      setLoading(true);
      try {
        // Construct the workflow ID from the workflow object
        const workflowId = `${workflow.nameSpace}.${workflow.name}@${workflow.version}`;
        
        const result = await reactory.graphqlQuery<WorkflowScheduleQueryData, WorkflowScheduleQueryVariables>(`
          query GetWorkflowSchedules($id: String!) {
            workflowWithId(id: $id) {
              id
              name
              nameSpace
              version
              schedules {
                id
                name
                description
                schedule {
                  cron
                  timezone
                  enabled
                }
                enabled
                workflow {
                  id
                  version
                  nameSpace
                }
                lastRun
                nextRun
                runCount
                errorCount
                isRunning
              }
            }
          }
        `, {
          id: workflowId
        });

        const workflowSchedules = result.data?.workflowWithId?.schedules || [];
        setSchedules(workflowSchedules);
      } catch (err) {
        reactory.log('Error fetching workflow schedules', err, 'error');
      } finally {
        setLoading(false);
      }
    };

    if (workflow?.name && workflow?.nameSpace && workflow?.version) {
      fetchWorkflowSchedules();
    } else {
      setLoading(false);
    }
  }, [workflow.name, workflow.nameSpace, workflow.version]);

  const createSchedule = () => {
    reactory.navigation('/workflows/schedules/new', {
      state: {
        workflow: {
          name: workflow.name,
          nameSpace: workflow.nameSpace
        }
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (schedules.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Icon sx={{ fontSize: 48, color: 'text.secondary' }}>schedule</Icon>
        <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
          No Schedules
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This workflow has no scheduled executions
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<Icon>add</Icon>}
          onClick={createSchedule}
        >
          Create Schedule
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Schedules ({schedules.length})
        </Typography>
        <Button 
          size="small"
          startIcon={<Icon>add</Icon>}
          onClick={createSchedule}
        >
          Add Schedule
        </Button>
      </Box>

      {schedules.map((schedule: any) => (
        <Box key={schedule.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {schedule.name}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                {schedule.schedule?.cron}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color={schedule.schedule?.enabled ? 'success.main' : 'text.secondary'} sx={{ display: 'block' }}>
                {schedule.schedule?.enabled ? 'ENABLED' : 'DISABLED'}
              </Typography>
              {schedule.isRunning && (
                <Typography variant="caption" color="primary.main" sx={{ display: 'block' }}>
                  RUNNING
                </Typography>
              )}
            </Box>
          </Box>
          {schedule.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {schedule.description}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            {schedule.nextRun && (
              <Typography variant="caption" color="text.secondary">
                Next: {new Date(schedule.nextRun).toLocaleString()}
              </Typography>
            )}
            {schedule.lastRun && (
              <Typography variant="caption" color="text.secondary">
                Last: {new Date(schedule.lastRun).toLocaleString()}
              </Typography>
            )}
            {schedule.runCount > 0 && (
              <Typography variant="caption" color="text.secondary">
                Runs: {schedule.runCount}
              </Typography>
            )}
            {schedule.errorCount > 0 && (
              <Typography variant="caption" color="error.main">
                Errors: {schedule.errorCount}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowSchedule',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowSchedule,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowSchedule,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowSchedule 
  });
}
