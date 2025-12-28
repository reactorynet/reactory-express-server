import Reactory from '@reactory/reactory-core';
import { WorkflowScheduleProps } from './types';

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
    const fetchSchedules = async () => {
      setLoading(true);
      try {
        const result = await reactory.graphqlQuery(`
          query WorkflowSchedules($pagination: PaginationInput) {
            workflowSchedules(pagination: $pagination) {
              schedules {
                id
                workflowName
                nameSpace
                cronExpression
                enabled
                nextExecution
                lastExecution
              }
            }
          }
        `, {
          pagination: { page: 1, limit: 100 }
        });

        const allSchedules = result.data?.workflowSchedules?.schedules || [];
        const filtered = allSchedules.filter((s: any) => 
          s.workflowName === workflow.name && s.nameSpace === workflow.nameSpace
        );
        setSchedules(filtered);
      } catch (err) {
        reactory.log('Error fetching schedules', err, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, [workflow.name, workflow.nameSpace]);

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
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
              {schedule.cronExpression}
            </Typography>
            <Typography variant="caption" color={schedule.enabled ? 'success.main' : 'text.secondary'}>
              {schedule.enabled ? 'ENABLED' : 'DISABLED'}
            </Typography>
          </Box>
          {schedule.nextExecution && (
            <Typography variant="caption" color="text.secondary">
              Next run: {new Date(schedule.nextExecution).toLocaleString()}
            </Typography>
          )}
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
