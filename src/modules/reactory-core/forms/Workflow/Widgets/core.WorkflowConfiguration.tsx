import Reactory from '@reactory/reactory-core';
import { WorkflowConfigurationProps } from './types';

/**
 * WorkflowConfiguration Component
 * 
 * Displays configuration details and dependencies
 */
const WorkflowConfiguration = (props: WorkflowConfigurationProps) => {
  const { reactory, workflow } = props;

  const { React, Material } = reactory.getComponents<any>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const { Box, Typography, Icon, Grid, Paper, Divider } = MaterialCore;

  const ConfigItem = ({ label, value, icon }: any) => (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        {icon && <Icon sx={{ fontSize: 16, color: 'text.secondary' }}>{icon}</Icon>}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ pl: icon ? 3 : 0 }}>
        {value !== undefined && value !== null ? value : <em style={{ color: '#999' }}>Not configured</em>}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon>settings</Icon>
        Configuration
      </Typography>

      <Grid container spacing={3}>
        {/* Basic Configuration */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Basic Settings
            </Typography>
            
            <ConfigItem 
              label="Workflow ID" 
              value={`${workflow.nameSpace}.${workflow.name}@${workflow.version}`}
              icon="fingerprint"
            />

            <ConfigItem 
              label="Active Status" 
              value={workflow.isActive ? 'Active' : 'Inactive'}
              icon="toggle_on"
            />

            <ConfigItem 
              label="Author" 
              value={workflow.author}
              icon="person"
            />

            <ConfigItem 
              label="Created" 
              value={workflow.createdAt ? new Date(workflow.createdAt).toLocaleString() : 'Unknown'}
              icon="event"
            />
          </Paper>
        </Grid>

        {/* Runtime Configuration */}
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
              Runtime Settings
            </Typography>
            
            <ConfigItem 
              label="Timeout" 
              value={workflow.configuration?.timeout ? `${workflow.configuration.timeout}ms` : 'Default'}
              icon="timer"
            />

            <ConfigItem 
              label="Max Retries" 
              value={workflow.configuration?.maxRetries || 'Default'}
              icon="replay"
            />

            <ConfigItem 
              label="Priority" 
              value={workflow.configuration?.priority || 'Normal'}
              icon="flag"
            />

            <ConfigItem 
              label="Parallelism" 
              value={workflow.configuration?.parallelism || 'Default'}
              icon="schema"
            />
          </Paper>
        </Grid>

        {/* Dependencies */}
        {workflow.dependencies && workflow.dependencies.length > 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Icon>link</Icon>
                Dependencies ({workflow.dependencies.length})
              </Typography>

              <Grid container spacing={2}>
                {workflow.dependencies.map((dep: any, index: number) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <Box 
                      sx={{ 
                        p: 2, 
                        border: 1, 
                        borderColor: 'divider',
                        borderRadius: 1,
                        height: '100%'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Icon sx={{ fontSize: 20, color: 'primary.main' }}>
                            {dep.type === 'WORKFLOW' ? 'account_tree' : 
                             dep.type === 'SERVICE' ? 'settings' :
                             dep.type === 'DATA' ? 'storage' : 'cloud'}
                          </Icon>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {dep.name}
                          </Typography>
                        </Box>
                        {dep.optional && (
                          <Typography variant="caption" color="text.secondary">
                            optional
                          </Typography>
                        )}
                      </Box>

                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Type: {dep.type}
                      </Typography>

                      {dep.version && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Version: {dep.version}
                        </Typography>
                      )}

                      {dep.description && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {dep.description}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        )}

        {/* Environment Variables */}
        {workflow.configuration?.environment && Object.keys(workflow.configuration.environment).length > 0 && (
          <Grid item xs={12}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                Environment Variables
              </Typography>
              
              <Box 
                component="pre" 
                sx={{ 
                  p: 2, 
                  bgcolor: '#f5f5f5', 
                  borderRadius: 1,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem'
                }}
              >
                {JSON.stringify(workflow.configuration.environment, null, 2)}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

const Definition: any = {
  name: 'WorkflowConfiguration',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowConfiguration,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowConfiguration,
    ['Workflow'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowConfiguration 
  });
}
