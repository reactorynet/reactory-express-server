import Reactory from '@reactory/reactory-core';
import { WorkflowOverviewProps } from './types';

/**
 * WorkflowOverview Component
 * 
 * Displays basic workflow information and metadata
 */
const WorkflowOverview = (props: WorkflowOverviewProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Grid, Chip, Divider, Icon, Paper } = MaterialCore;

  const InfoItem = ({ label, value, icon }: any) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {icon && <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>{icon}</Icon>}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ pl: icon ? 3 : 0 }}>
        {value || <em style={{ color: '#999' }}>Not specified</em>}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Left Column - Basic Info */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon>info</Icon>
            Basic Information
          </Typography>

          <InfoItem 
            label="Workflow Name" 
            value={workflow.name}
            icon="label"
          />
          
          <InfoItem 
            label="Namespace" 
            value={workflow.nameSpace}
            icon="folder"
          />
          
          <InfoItem 
            label="Version" 
            value={workflow.version}
            icon="tag"
          />
          
          <InfoItem 
            label="Author" 
            value={workflow.author}
            icon="person"
          />

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>description</Icon>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Description
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ pl: 3 }}>
              {workflow.description || <em style={{ color: '#999' }}>No description provided</em>}
            </Typography>
          </Box>

          {workflow.tags && workflow.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>sell</Icon>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  Tags
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, pl: 3 }}>
                {workflow.tags.map((tag: string) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Grid>

        {/* Right Column - Statistics & Status */}
        <Grid item xs={12} md={6}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Icon>analytics</Icon>
            Statistics & Status
          </Typography>

          <InfoItem 
            label="Status" 
            value={
              <Chip 
                label={workflow.isActive ? 'ACTIVE' : 'INACTIVE'}
                size="small"
                color={workflow.isActive ? 'success' : 'default'}
                icon={<Icon>{workflow.isActive ? 'check_circle' : 'cancel'}</Icon>}
              />
            }
            icon="toggle_on"
          />

          <InfoItem 
            label="Total Executions" 
            value={workflow.statistics?.totalExecutions || 0}
            icon="play_circle"
          />

          <InfoItem 
            label="Successful Executions" 
            value={workflow.statistics?.successfulExecutions || 0}
            icon="check_circle"
          />

          <InfoItem 
            label="Failed Executions" 
            value={workflow.statistics?.failedExecutions || 0}
            icon="error"
          />

          {workflow.statistics?.averageExecutionTime && (
            <InfoItem 
              label="Average Execution Time" 
              value={`${Math.round(workflow.statistics.averageExecutionTime / 1000)} seconds`}
              icon="timer"
            />
          )}

          <Divider sx={{ my: 2 }} />

          <InfoItem 
            label="Created" 
            value={workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : 'Unknown'}
            icon="event"
          />

          <InfoItem 
            label="Last Updated" 
            value={workflow.updatedAt ? new Date(workflow.updatedAt).toLocaleString() : 'Unknown'}
            icon="update"
          />
        </Grid>

        {/* Dependencies Section */}
        {workflow.dependencies && workflow.dependencies.length > 0 && (
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Icon>link</Icon>
              Dependencies ({workflow.dependencies.length})
            </Typography>

            <Grid container spacing={2}>
              {workflow.dependencies.map((dep: any, index: number) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Icon sx={{ fontSize: 16, color: 'primary.main' }}>
                        {dep.type === 'WORKFLOW' ? 'account_tree' : 
                         dep.type === 'SERVICE' ? 'settings' :
                         dep.type === 'DATA' ? 'storage' : 'cloud'}
                      </Icon>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {dep.name}
                      </Typography>
                      {dep.optional && (
                        <Chip label="Optional" size="small" variant="outlined" />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Type: {dep.type}
                    </Typography>
                    {dep.version && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                        Version: {dep.version}
                      </Typography>
                    )}
                    {dep.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic' }}>
                        {dep.description}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowOverview',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowOverview,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowOverview,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowOverview 
  });
}
