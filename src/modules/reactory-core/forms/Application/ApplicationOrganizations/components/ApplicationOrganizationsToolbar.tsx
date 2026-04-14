'use strict';

interface ApplicationOrganizationsToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  FullScreenModal: Reactory.Client.Components.FullScreenModal;
  ReactoryForm: React.ComponentType<any>;
}

interface ApplicationOrganizationsToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging: {
      hasNext: boolean;
      page: number;
      pageSize: number;
      total: number;
    };
    totalOrganizations?: number;
  };
  formData: any;
  formContext: {
    props: {
      applicationId: string;
    }
  };
  queryVariables: any;
  onQueryChange?: (query: string, variables: any) => void;
  onRefresh?: () => void;
  selectedRows?: any[];
}

const ApplicationOrganizationsToolbar = (props: ApplicationOrganizationsToolbarProps) => {
  const { reactory, data, queryVariables, onQueryChange, onRefresh, selectedRows = [] } = props;

  const { React, Material, FullScreenModal, ReactoryForm } = reactory.getComponents<ApplicationOrganizationsToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.FullScreenModal',
    'core.ReactoryForm@1.0.0',
  ]);

  const { useState, useCallback } = React;

  const {
    Box,
    TextField,
    IconButton,
    Toolbar,
    Typography,
    Chip,
    Button,
    InputAdornment,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
  } = Material.MaterialCore;

  const {
    Search: SearchIcon,
    Clear: ClearIcon,
    Refresh: RefreshIcon,
    Add: AddIcon,
    Business: BusinessIcon,
  } = Material.MaterialIcons;

  const [searchText, setSearchText] = useState(queryVariables?.search || '');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCode, setNewOrgCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Handle search input
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  }, []);

  // Execute search
  const handleSearch = useCallback(() => {
    if (onQueryChange) {
      onQueryChange('pagedOrganizations', {
        ...queryVariables,
        search: searchText,
        paging: {
          ...queryVariables?.paging,
          page: 1
        }
      });
    }
  }, [searchText, queryVariables, onQueryChange]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    if (onQueryChange) {
      onQueryChange('pagedOrganizations', {
        ...queryVariables,
        search: '',
        paging: {
          ...queryVariables?.paging,
          page: 1
        }
      });
    }
  }, [queryVariables, onQueryChange]);

  // Handle search on Enter key
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Create organization
  const handleCreateOrganization = useCallback(async () => {
    if (!newOrgName.trim()) {
      reactory.createNotification('Organization name is required', { showInAppNotification: true, type: 'warning' });
      return;
    }

    setIsCreating(true);
    try {
      const mutation = `mutation createOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          id
          name
          code
          createdAt
        }
      }`;

      await reactory.graphqlMutation(mutation, { input: { name: newOrgName.trim(), code: newOrgCode.trim() || undefined } });

      reactory.createNotification(`Organization "${newOrgName}" created successfully`, { showInAppNotification: true, type: 'success' });
      setCreateDialogOpen(false);
      setNewOrgName('');
      setNewOrgCode('');

      // Emit event to refresh the table
      reactory.amq.$pub.def('core.OrganizationCreatedEvent', {}, 'core.OrganizationCreatedEvent');

      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      reactory.createNotification(
        `Failed to create organization: ${error.message || 'Unknown error'}`,
        { showInAppNotification: true, type: 'error' }
      );
    } finally {
      setIsCreating(false);
    }
  }, [newOrgName, newOrgCode, reactory, onRefresh]);

  const handleCreateDialogClose = useCallback(() => {
    setCreateDialogOpen(false);
    setNewOrgName('');
    setNewOrgCode('');
  }, []);

  const totalOrganizations = data?.paging?.total || 0;

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 1 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 2,
        py: 2
      }}
    >
      {/* Header Row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon color="action" />
          <Typography variant="h6" component="div">
            Organizations
          </Typography>
          <Chip
            label={`${totalOrganizations} organization${totalOrganizations !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Create Organization">
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setCreateDialogOpen(true)}
            >
              New
            </Button>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Row */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search organizations by name, code..."
          value={searchText}
          onChange={handleSearchChange}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchText && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={handleClearSearch}>
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          startIcon={<SearchIcon />}
          sx={{ minWidth: 120 }}
        >
          Search
        </Button>
      </Box>

      {/* Create Organization Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <BusinessIcon />
            Create New Organization
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Organization Name"
              value={newOrgName}
              onChange={(e: any) => setNewOrgName(e.target.value)}
              fullWidth
              required
              autoFocus
              placeholder="Enter organization name"
              helperText="The day-to-day name used for this organization"
            />
            <TextField
              label="Organization Code"
              value={newOrgCode}
              onChange={(e: any) => setNewOrgCode(e.target.value)}
              fullWidth
              placeholder="Enter a short code (optional)"
              helperText="A short code identifier for the organization"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateDialogClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrganization}
            variant="contained"
            disabled={isCreating || !newOrgName.trim()}
            startIcon={<AddIcon />}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Toolbar>
  );
};

const ComponentDefinition = {
  name: 'ApplicationOrganizationsToolbar',
  nameSpace: 'core',
  version: '1.0.0',
  component: ApplicationOrganizationsToolbar,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'organizations', 'toolbar']
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationOrganizationsToolbar,
    [''],
    ComponentDefinition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    fqn: FQN,
    componentFqn: FQN,
    component: ApplicationOrganizationsToolbar
  });
}

export default ApplicationOrganizationsToolbar;
