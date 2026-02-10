import Reactory from '@reactory/reactory-core';

interface ApplicationUsersToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ApplicationUsersToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging: {
      hasNext: boolean;
      page: number;
      pageSize: number;
      total: number;
    };
    totalUsers?: number;
    clientName?: string;
    clientKey?: string;
  };
  formData: any;
  queryVariables: any;
  onQueryChange?: (query: string, variables: any) => void;
  onRefresh?: () => void;
  selectedRows?: any[];
}

const ApplicationUsersToolbar = (props: ApplicationUsersToolbarProps) => {
  const { reactory, data, queryVariables, onQueryChange, onRefresh, selectedRows = [] } = props;

  const { React, Material } = reactory.getComponents<ApplicationUsersToolbarDependencies>([
    'react.React',
    'material-ui.Material'
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
    Menu,
    MenuItem,
    Divider
  } = Material.MaterialCore;

  const {
    Search: SearchIcon,
    Clear: ClearIcon,
    Refresh: RefreshIcon,
    FilterList: FilterListIcon,
    GetApp: ExportIcon,
    PersonAdd: PersonAddIcon,
    MoreVert: MoreVertIcon
  } = Material.MaterialIcons;

  const [searchText, setSearchText] = useState(queryVariables?.filter?.searchString || '');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);

  // Handle search input
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  }, []);

  // Execute search
  const handleSearch = useCallback(() => {
    if (onQueryChange) {
      onQueryChange('applicationUsers', {
        ...queryVariables,
        filter: {
          ...queryVariables?.filter,
          searchString: searchText
        },
        paging: {
          ...queryVariables?.paging,
          page: 1 // Reset to first page on new search
        }
      });
    }
  }, [searchText, queryVariables, onQueryChange]);

  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchText('');
    if (onQueryChange) {
      onQueryChange('applicationUsers', {
        ...queryVariables,
        filter: {
          ...queryVariables?.filter,
          searchString: ''
        },
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

  // Menu handlers
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleFilterMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  }, []);

  const handleFilterMenuClose = useCallback(() => {
    setFilterAnchorEl(null);
  }, []);

  // Export functionality
  const handleExport = useCallback(() => {
    reactory.utils.showNotification('Export functionality coming soon', { variant: 'info' });
    handleMenuClose();
  }, [reactory]);

  // Add user functionality
  const handleAddUser = useCallback(() => {
    reactory.utils.showNotification('Add user functionality coming soon', { variant: 'info' });
    handleMenuClose();
  }, [reactory]);

  const totalUsers = data?.totalUsers || 0;
  const selectedCount = selectedRows.length;

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
          <Typography variant="h6" component="div">
            {data?.clientName || 'Application Users'}
          </Typography>
          {data?.clientKey && (
            <Chip label={data.clientKey} size="small" variant="outlined" />
          )}
          <Chip
            label={`${totalUsers} user${totalUsers !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
          />
          {selectedCount > 0 && (
            <Chip
              label={`${selectedCount} selected`}
              size="small"
              color="secondary"
            />
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={onRefresh} size="small">
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Filters">
            <IconButton onClick={handleFilterMenuOpen} size="small">
              <FilterListIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="More options">
            <IconButton onClick={handleMenuOpen} size="small">
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search Row */}
      <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search users by name, email..."
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

      {/* More Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleAddUser}>
          <PersonAddIcon sx={{ mr: 1 }} />
          Add User
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleExport}>
          <ExportIcon sx={{ mr: 1 }} />
          Export Users
        </MenuItem>
      </Menu>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterMenuClose}
      >
        <MenuItem onClick={() => {
          if (onQueryChange) {
            onQueryChange('applicationUsers', {
              ...queryVariables,
              filter: { ...queryVariables?.filter, includeDeleted: false }
            });
          }
          handleFilterMenuClose();
        }}>
          Active Users Only
        </MenuItem>
        <MenuItem onClick={() => {
          if (onQueryChange) {
            onQueryChange('applicationUsers', {
              ...queryVariables,
              filter: { ...queryVariables?.filter, includeDeleted: true }
            });
          }
          handleFilterMenuClose();
        }}>
          Include Deleted Users
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleFilterMenuClose}>
          Clear Filters
        </MenuItem>
      </Menu>
    </Toolbar>
  );
};

const ComponentDefinition = {
  name: 'ApplicationUsersToolbar',
  nameSpace: 'core',
  version: '1.0.0',
  component: ApplicationUsersToolbar,
  roles: ['USER', 'ADMIN'],
  tags: ['application', 'users', 'toolbar']
};

const FQN = `${ComponentDefinition.nameSpace}.${ComponentDefinition.name}@${ComponentDefinition.version}`;

//@ts-ignore
if (window && window.reactory) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    ComponentDefinition.nameSpace,
    ComponentDefinition.name,
    ComponentDefinition.version,
    ApplicationUsersToolbar,
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
    component: ApplicationUsersToolbar
  });
}

export default ApplicationUsersToolbar;
