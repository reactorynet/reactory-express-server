import Reactory from '@reactorynet/reactory-core';

interface QuickFilterDefinition {
  id: string;
  label: string;
  icon?: string;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'default';
  filter: {
    field: string;
    value: any;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not-in' | 'is-null' | 'is-not-null' | 'contains';
    additionalFilters?: Array<{
      field: string;
      value: any;
      operator: string;
    }>;
  };
  badge?: string | number;
}

interface AdvancedFilterField {
  id: string;
  label: string;
  field: string;
  type: 'select' | 'multi-select' | 'date-range' | 'text' | 'number' | 'boolean';
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
}

interface SupportTicketsToolbarDependencies {
  React: Reactory.React;
  ReactRouterDom: any;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  AdvancedFilterPanel: any;
  BulkStatusChangeAction: any;
  BulkAssignAction: any;
  BulkTagAction: any;
  BulkDeleteAction: any;
  ExportAction: any;
}

interface SupportTicketsToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: Partial<Reactory.Models.IReactorySupportTicket>[];
    paging: {
      hasNext: boolean;
      hasPrevious: boolean;
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    selected?: Partial<Reactory.Models.IReactorySupportTicket>[] | null;    
  };
  queryVariables?: {
    filter?: {
      searchString?: string;
      [key: string]: any;
    };
    paging?: {
      page: number;
      pageSize: number;
    };
  };
  onDataChange?: (filteredData: any[]) => void;
  onPagingChange?: (paging: {
    page: number;
    pageSize: number;
  }) => void;
  onSelectedChange?: (selected: Partial<Reactory.Models.IReactorySupportTicket>[] | null) => void;
  onQueryChange?: (queryName: string, variables: any) => void;
  searchText?: string;
  onSearchChange?: (text: string) => void;
  onFilterChange?: (filters: any[]) => void;
  onSortChange?: (sort: {
    field: string;
    direction: 'asc' | 'desc';
  }) => void;
  onGroupChange?: (group: {
    field: string;
    direction: 'asc' | 'desc';
  }) => void;
}

/**
 * Custom toolbar for Support Tickets with Quick Filters, Search, Advanced Filters, and Bulk Actions
 */
const SupportTicketsToolbar = (props: SupportTicketsToolbarProps) => {
  const {
    reactory,
    data,
    onDataChange,
    searchText = '',
    onSearchChange,
    onQueryChange,
    queryVariables,
  } = props;

  // Get dependencies from registry
  const {
    React,
    ReactRouterDom,
    Material,
    QuickFilters,
    AdvancedFilterPanel,
    BulkStatusChangeAction,
    BulkAssignAction,
    BulkTagAction,
    BulkDeleteAction,
    ExportAction,
  } = reactory.getComponents<SupportTicketsToolbarDependencies>([
    'react.React',
    'react-router.ReactRouterDom',
    'material-ui.Material',
    'core.QuickFilters',
    'core.AdvancedFilterPanel',
    'core.BulkStatusChangeAction',
    'core.BulkAssignAction',
    'core.BulkTagAction',
    'core.BulkDeleteAction',
    'core.ExportAction',
  ]);

  // ✅ All React hooks must be called unconditionally before any conditional returns
  const location = ReactRouterDom.useLocation();
  const navigate = ReactRouterDom.useNavigate();

  const [advancedPanelOpen, setAdvancedPanelOpen] = React.useState(false);
  const [activeBulkAction, setActiveBulkAction] = React.useState<'status' | 'assign' | 'tag' | 'delete' | 'export' | null>(null);

  // searchInput for typing; committed value drives query + URL
  const [searchInput, setSearchInput] = React.useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || queryVariables?.filter?.searchString || searchText || '';
  });

  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  // Count tickets for badges
  const counts = React.useMemo(() => {
    return {
      myTickets: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => t.assignedTo?.id === userId).length || 0,
      unassigned: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => !t.assignedTo).length || 0,
      open: data?.data?.filter(t => ['new', 'open', 'in-progress'].includes(t.status || '')).length || 0,
      urgent: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => ['critical', 'high'].includes(t.priority || '')).length || 0,
      overdue: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => t.isOverdue).length || 0,
      resolvedToday: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => {
        if (t.status !== 'resolved') return false;
        const today = new Date().setHours(0, 0, 0, 0);
        const updated = t.updatedDate ? new Date(t.updatedDate).setHours(0, 0, 0, 0) : 0;
        return updated === today;
      }).length || 0,
    };
  }, [data, userId]);

  // Quick Filter Definitions
  const quickFilters: QuickFilterDefinition[] = React.useMemo(() => [
    {
      id: 'my-tickets',
      label: 'My Tickets',
      icon: 'person',
      color: 'primary',
      filter: {
        field: 'assignedTo.id',
        value: userId,
        operator: 'eq',
      },
      badge: counts.myTickets,
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      icon: 'person_add_disabled',
      color: 'default',
      filter: {
        field: 'assignedTo',
        value: null,
        operator: 'is-null',
      },
      badge: counts.unassigned,
    },
    {
      id: 'open',
      label: 'Open',
      icon: 'folder_open',
      color: 'info',
      filter: {
        field: 'status',
        value: ['new', 'open', 'in-progress'],
        operator: 'in',
      },
      badge: counts.open,
    },
    {
      id: 'urgent',
      label: 'Urgent',
      icon: 'priority_high',
      color: 'error',
      filter: {
        field: 'priority',
        value: ['critical', 'high'],
        operator: 'in',
      },
      badge: counts.urgent,
    },
    {
      id: 'overdue',
      label: 'Overdue',
      icon: 'schedule',
      color: 'warning',
      filter: {
        field: 'isOverdue',
        value: true,
        operator: 'eq',
      },
      badge: counts.overdue,
    },
    {
      id: 'resolved-today',
      label: 'Resolved Today',
      icon: 'check_circle',
      color: 'success',
      filter: {
        field: 'status',
        value: 'resolved',
        operator: 'eq',
        additionalFilters: [
          {
            field: 'updatedDate',
            value: new Date().setHours(0, 0, 0, 0),
            operator: 'gte',
          },
        ],
      },
      badge: counts.resolvedToday,
    },
  ], [counts, userId]);

  // Advanced Filter Field Definitions
  const advancedFilterFields: AdvancedFilterField[] = React.useMemo(() => [
    {
      id: 'status',
      label: 'Status',
      field: 'status',
      type: 'multi-select',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in-progress' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Closed', value: 'closed' },
        { label: 'On Hold', value: 'on-hold' },
      ],
    },
    {
      id: 'priority',
      label: 'Priority',
      field: 'priority',
      type: 'multi-select',
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
    },
    {
      id: 'requestType',
      label: 'Request Type',
      field: 'requestType',
      type: 'multi-select',
      options: [
        { label: 'Bug', value: 'bug' },
        { label: 'Feature Request', value: 'feature' },
        { label: 'Question', value: 'question' },
        { label: 'Support', value: 'support' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      id: 'search',
      label: 'Search in Title',
      field: 'request',
      type: 'text',
      placeholder: 'Type to search in ticket title...',
    },
    {
      id: 'reference',
      label: 'Reference Number',
      field: 'reference',
      type: 'text',
      placeholder: 'e.g., TKT-1234',
    },
    {
      id: 'overdue',
      label: 'Show Overdue Only',
      field: 'isOverdue',
      type: 'boolean',
    },
  ], []);

  // URL <-> search + filters helpers (search + filters/tags sync to query string)
  const parseUrlToSearchAndFilters = React.useCallback(() => {
    const params = new URLSearchParams(location.search);
    const searchTerm = params.get('search') || '';
    let filterObj: any = {};
    const filtersParam = params.get('filters');
    if (filtersParam) {
      try { filterObj = JSON.parse(decodeURIComponent(filtersParam)); } catch (e) { /* ignore */ }
    }
    // Support flat params for common ticket filters
    ['status', 'priority', 'requestType', 'isOverdue', 'assignedTo.id', 'reference'].forEach((k) => {
      if (params.has(k)) {
        const v = params.get(k);
        if (v === 'true') filterObj[k] = true;
        else if (v === 'false') filterObj[k] = false;
        else if (v && v.includes(',')) filterObj[k] = v.split(',').map((s: string) => s.trim());
        else if (v) filterObj[k] = v;
      }
    });
    return { search: searchTerm, filter: filterObj };
  }, [location.search]);

  const syncUrlFromSearchAndFilters = React.useCallback((searchTerm: string, filterObj: any) => {
    const params = new URLSearchParams(location.search);
    if (searchTerm && searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }
    const { searchString: _ignore, ...restFilters } = filterObj || {};
    if (Object.keys(restFilters).length > 0) {
      params.set('filters', encodeURIComponent(JSON.stringify(restFilters)));
    } else {
      params.delete('filters');
    }
    const qs = params.toString();
    const newPath = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash || ''}`;
    navigate(newPath, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  // Sync from URL on location change (supports direct links + back/forward)
  React.useEffect(() => {
    const { search: urlSearch, filter: urlFilter } = parseUrlToSearchAndFilters();
    if (urlSearch !== searchInput) {
      setSearchInput(urlSearch);
    }
    if (onQueryChange) {
      const currentSearch = queryVariables?.filter?.searchString || '';
      const currentFilter = queryVariables?.filter || {};
      
      // Compare if URL search or any filter actually differs
      let hasFilterDiff = false;
      const urlFilterKeys = Object.keys(urlFilter);
      for (const k of urlFilterKeys) {
        if (JSON.stringify(urlFilter[k]) !== JSON.stringify(currentFilter[k])) {
          hasFilterDiff = true;
          break;
        }
      }

      const needsUpdate = urlSearch !== currentSearch || hasFilterDiff;
      if (needsUpdate) {
        onQueryChange('supportTickets', {
          ...queryVariables,
          filter: {
            ...queryVariables?.filter,
            searchString: urlSearch,
            ...urlFilter
          },
          paging: { ...queryVariables?.paging, page: 1 }
        });
      }
    }
  }, [location.search]);

  // Handle search input change (just update local state - typing does NOT trigger query)
  const handleSearchInputChange = React.useCallback((event: any) => {
    setSearchInput(event.target.value);
  }, []);

  // Execute search (only when button clicked or Enter pressed) + URL sync
  const handleSearch = React.useCallback(() => {
    if (onSearchChange) {
      onSearchChange(searchInput);
    }

    if (onQueryChange) {
      const nextFilter = {
        ...queryVariables?.filter,
        searchString: searchInput
      };
      onQueryChange('supportTickets', {
        ...queryVariables,
        filter: nextFilter,
        paging: {
          ...queryVariables?.paging,
          page: 1
        }
      });
      syncUrlFromSearchAndFilters(searchInput, nextFilter);
    }
  }, [searchInput, queryVariables, onQueryChange, onSearchChange, syncUrlFromSearchAndFilters]);

  // Clear search + URL sync
  const handleClearSearch = React.useCallback(() => {
    setSearchInput('');
    if (onSearchChange) {
      onSearchChange('');
    }
    if (onQueryChange) {
      const nextFilter = { ...queryVariables?.filter, searchString: '' };
      onQueryChange('supportTickets', {
        ...queryVariables,
        filter: nextFilter,
        paging: { ...queryVariables?.paging, page: 1 }
      });
      syncUrlFromSearchAndFilters('', nextFilter);
    }
  }, [queryVariables, onQueryChange, onSearchChange, syncUrlFromSearchAndFilters]);

  // Handle search on Enter key
  const handleKeyPress = React.useCallback((event: any) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  const handleQuickFilterChange = React.useCallback((activeFilters: string[]) => {
    if (!onQueryChange) return;

    // Build filter object based on active quick filters
    const filterUpdates: any = {
      ...queryVariables?.filter,
      searchString: searchInput // Preserve search
    };

    // Clear all quick filter fields first
    delete filterUpdates['assignedTo.id'];
    delete filterUpdates.assignedTo;
    delete filterUpdates.status;
    delete filterUpdates.priority;
    delete filterUpdates.isOverdue;
    delete filterUpdates.resolvedToday;

    if (activeFilters.length === 0) {
      // No filters - reset to base state
      onQueryChange('supportTickets', {
        ...queryVariables,
        filter: filterUpdates,
        paging: {
          ...queryVariables?.paging,
          page: 1
        }
      });
      syncUrlFromSearchAndFilters(searchInput, filterUpdates);
      return;
    }

    // Apply first active quick filter (single select mode)
    const firstFilter = activeFilters[0];

    switch (firstFilter) {
      case 'my-tickets':
        filterUpdates['assignedTo.id'] = userId;
        break;
      case 'unassigned':
        filterUpdates.assignedTo = null;
        break;
      case 'open':
        filterUpdates.status = ['new', 'open', 'in-progress'];
        break;
      case 'urgent':
        filterUpdates.priority = ['critical', 'high'];
        break;
      case 'overdue':
        filterUpdates.isOverdue = true;
        break;
      case 'resolved-today':
        filterUpdates.status = 'resolved';
        break;
    }

    // Update query with new filters + URL sync
    onQueryChange('supportTickets', {
      ...queryVariables,
      filter: filterUpdates,
      paging: {
        ...queryVariables?.paging,
        page: 1
      }
    });
    syncUrlFromSearchAndFilters(searchInput, filterUpdates);
  }, [queryVariables, onQueryChange, searchInput, userId, syncUrlFromSearchAndFilters]);

  const handleAdvancedFilterChange = React.useCallback((filters: any[]) => {
    if (!onQueryChange) return;

    const filterUpdates: any = {
      ...queryVariables?.filter,
      searchString: searchInput // Preserve search
    };

    if (filters.length === 0) {
      // Clear advanced filters
      onQueryChange('supportTickets', {
        ...queryVariables,
        filter: filterUpdates,
        paging: {
          ...queryVariables?.paging,
          page: 1
        }
      });
      syncUrlFromSearchAndFilters(searchInput, filterUpdates);
      return;
    }

    // Convert advanced filters to query variables
    filters.forEach(filter => {
      switch (filter.field) {
        case 'status':
          filterUpdates.status = Array.isArray(filter.value) ? filter.value : [filter.value];
          break;
        case 'priority':
          filterUpdates.priority = Array.isArray(filter.value) ? filter.value : [filter.value];
          break;
        case 'requestType':
          filterUpdates.requestType = Array.isArray(filter.value) ? filter.value : [filter.value];
          break;
        case 'request':
          filterUpdates.searchString = filter.value;
          break;
        case 'reference':
          filterUpdates.reference = filter.value;
          break;
        case 'isOverdue':
          filterUpdates.isOverdue = filter.value;
          break;
      }
    });

    // Update query with new filters + URL sync
    onQueryChange('supportTickets', {
      ...queryVariables,
      filter: filterUpdates,
      paging: {
        ...queryVariables?.paging,
        page: 1
      }
    });
    syncUrlFromSearchAndFilters(searchInput, filterUpdates);
  }, [queryVariables, onQueryChange, searchInput, syncUrlFromSearchAndFilters]);

  // Bulk action handlers
  const handleBulkActionComplete = (actionType: string) => {
    setActiveBulkAction(null);
    // Refresh data (would typically refetch from server)
    if (onDataChange) {
      // For now, just close the dialog
      // In production, you'd refetch the data here
    }
  };

  const handleBulkActionCancel = () => {
    setActiveBulkAction(null);
  };

  const handleExport = () => {
    setActiveBulkAction('export');
  };

  // Guard: all hooks have been called above. Now safe to bail out if dependencies are missing.
  if (!QuickFilters || !AdvancedFilterPanel || !Material) {
    return (
      <div style={{ padding: '16px' }}>Loading filters...</div>
    );
  }

  const { MaterialCore, MaterialIcons } = Material;
  const { Box, Button, Icon, Toolbar, Badge, Divider, ButtonGroup, Tooltip, TextField, InputAdornment, IconButton } = MaterialCore;
  const { Search: SearchIcon, Clear: ClearIcon } = MaterialIcons || {};

  // Derived values (not state)
  const selectedTickets = data.selected || [];
  const hasSelection = selectedTickets.length > 0;

  return (
    <>
      <Toolbar
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 2,
          p: 2,          
        }}
      >
        {/* Search Bar and Actions Row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search tickets by reference, title, or assignee..."
            value={searchInput}
            onChange={handleSearchInputChange}
            onKeyPress={handleKeyPress}
            InputProps={{
              startAdornment: SearchIcon && (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchInput && ClearIcon && (
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
            startIcon={SearchIcon && <SearchIcon />}
            sx={{ minWidth: 120 }}
          >
            Search
          </Button>
          <Tooltip title="Advanced Filters">
            <Button
              variant="outlined"
              startIcon={<Icon>filter_list</Icon>}
              onClick={() => setAdvancedPanelOpen(true)}
              sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
            >
              Filters
            </Button>
          </Tooltip>
          <Tooltip title="Export Data">
            <Button
              variant="outlined"
              startIcon={<Icon>file_download</Icon>}
              onClick={handleExport}
              sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
            >
              Export
            </Button>
          </Tooltip>
        </Box>

        {/* Quick Filters Row */}
        <QuickFilters
          filters={quickFilters}
          onFilterChange={handleQuickFilterChange}
          variant="buttons"
          multiSelect={false}
        />

        {/* Bulk Actions Row (shown when items are selected) */}
        {hasSelection && (
          <>
            <Divider />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Badge badgeContent={selectedTickets.length} color="primary" max={999}>
                <Icon>check_box</Icon>
              </Badge>
              <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                {selectedTickets.length} ticket{selectedTickets.length > 1 ? 's' : ''} selected
              </Box>
              <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
              <ButtonGroup variant="outlined" size="small">
                <Tooltip title="Change Status">
                  <Button
                    startIcon={<Icon>edit</Icon>}
                    onClick={() => setActiveBulkAction('status')}
                  >
                    Status
                  </Button>
                </Tooltip>
                <Tooltip title="Assign to User">
                  <Button
                    startIcon={<Icon>person_add</Icon>}
                    onClick={() => setActiveBulkAction('assign')}
                  >
                    Assign
                  </Button>
                </Tooltip>
                <Tooltip title="Manage Tags">
                  <Button
                    startIcon={<Icon>label</Icon>}
                    onClick={() => setActiveBulkAction('tag')}
                  >
                    Tags
                  </Button>
                </Tooltip>
                <Tooltip title="Delete Selected">
                  <Button
                    startIcon={<Icon>delete</Icon>}
                    onClick={() => setActiveBulkAction('delete')}
                    color="error"
                  >
                    Delete
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>
          </>
        )}
      </Toolbar>

      {/* Advanced Filter Panel */}
      <AdvancedFilterPanel
        open={advancedPanelOpen}
        onClose={() => setAdvancedPanelOpen(false)}
        fields={advancedFilterFields}
        onFilterChange={handleAdvancedFilterChange}
        showPresets
        storageKey="core.SupportTicketsManagement"
        initialFilters={(() => {
          const { searchString: _s, ...activeFields } = (queryVariables?.filter || {}) as any;
          return Object.entries(activeFields)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([field, value]) => ({ field, value, operator: 'eq' }));
        })()}
      />

      {/* Bulk Action Modals */}
      {activeBulkAction === 'status' && BulkStatusChangeAction && (
        <BulkStatusChangeAction
          reactory={reactory}
          selectedTickets={selectedTickets}
          onComplete={() => handleBulkActionComplete('status')}
          onCancel={handleBulkActionCancel}
        />
      )}

      {activeBulkAction === 'assign' && BulkAssignAction && (
        <BulkAssignAction
          reactory={reactory}
          selectedTickets={selectedTickets}
          onComplete={() => handleBulkActionComplete('assign')}
          onCancel={handleBulkActionCancel}
        />
      )}

      {activeBulkAction === 'tag' && BulkTagAction && (
        <BulkTagAction
          reactory={reactory}
          selectedTickets={selectedTickets}
          onComplete={() => handleBulkActionComplete('tag')}
          onCancel={handleBulkActionCancel}
        />
      )}

      {activeBulkAction === 'delete' && BulkDeleteAction && (
        <BulkDeleteAction
          reactory={reactory}
          selectedTickets={selectedTickets}
          onComplete={() => handleBulkActionComplete('delete')}
          onCancel={handleBulkActionCancel}
        />
      )}

      {activeBulkAction === 'export' && ExportAction && (
        <ExportAction
          reactory={reactory}
          tickets={data?.data || []}
          onComplete={() => handleBulkActionComplete('export')}
          onCancel={handleBulkActionCancel}
        />
      )}
    </>
  );
};

const Definition: any = {
  name: 'SupportTicketsToolbar',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketsToolbar,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketsToolbar,
    ['Support Tickets', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: SupportTicketsToolbar 
  });
}

export default SupportTicketsToolbar;
