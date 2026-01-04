import Reactory from '@reactory/reactory-core';

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
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
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
    },
    selected?: Partial<Reactory.Models.IReactorySupportTicket>[] | null;    
  };
  onDataChange?: (filteredData: any[]) => void;
  onPagingChange?: (paging: {
    page: number;
    pageSize: number;
  }) => void;
  onSelectedChange?: (selected: Partial<Reactory.Models.IReactorySupportTicket>[] | null) => void;
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
 * Custom toolbar for Support Tickets with Quick Filters, Search, and Advanced Filters
 */
const SupportTicketsToolbar = (props: SupportTicketsToolbarProps) => {
  const {
    reactory,
    data,
    onDataChange,
    searchText = '',
    onSearchChange,
  } = props;

  // Get dependencies from registry
  const {
    React,
    Material,
    QuickFilters,
    SearchBar,
    AdvancedFilterPanel,
    BulkStatusChangeAction,
    BulkAssignAction,
    BulkTagAction,
    BulkDeleteAction,
    ExportAction,
  } = reactory.getComponents<SupportTicketsToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.QuickFilters',
    'core.SearchBar',
    'core.AdvancedFilterPanel',
    'core.BulkStatusChangeAction',
    'core.BulkAssignAction',
    'core.BulkTagAction',
    'core.BulkDeleteAction',
    'core.ExportAction',
  ]);

  const { MaterialCore } = Material;
  const { Box, Button, Icon, Toolbar, Badge, Divider, ButtonGroup, Tooltip } = MaterialCore;

  // If components aren't loaded, show loading state
  if (!QuickFilters || !SearchBar || !AdvancedFilterPanel) {
    return (
      <Toolbar sx={{ p: 2 }}>
        <Box>Loading filters...</Box>
      </Toolbar>
    );
  }

  const [advancedPanelOpen, setAdvancedPanelOpen] = React.useState(false);
  const [originalData] = React.useState(data);
  const [activeBulkAction, setActiveBulkAction] = React.useState<'status' | 'assign' | 'tag' | 'delete' | 'export' | null>(null);

  const currentUser = reactory.getUser();
  const userId = currentUser?.loggedIn?.user?.id;

  // Get selected tickets
  const selectedTickets = data.selected || [];
  const hasSelection = selectedTickets.length > 0;

  // Count tickets for badges
  const counts = React.useMemo(() => {
    return {
      myTickets: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => t.assignedTo?.id === userId).length,
      unassigned: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => !t.assignedTo).length,
      open: data?.data?.filter(t => ['new', 'open', 'in-progress'].includes(t.status)).length,
      urgent: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => ['critical', 'high'].includes(t.priority)).length,
      overdue: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => t.isOverdue).length,
      resolvedToday: data?.data?.filter((t: Partial<Reactory.Models.IReactorySupportTicket>) => {
        if (t.status !== 'resolved') return false;
        const today = new Date().setHours(0, 0, 0, 0);
        const updated = new Date(t.updatedDate).setHours(0, 0, 0, 0);
        return updated === today;
      }).length,
    };
  }, [data, userId]);

  // Quick Filter Definitions
  const quickFilters: QuickFilterDefinition[] = [
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
  ];

  // Advanced Filter Field Definitions
  const advancedFilterFields: AdvancedFilterField[] = [
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
  ];

  const handleSearch = React.useCallback((text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    }

    if (!text.trim()) {
      onDataChange(originalData);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = originalData?.data.filter((ticket: Partial<Reactory.Models.IReactorySupportTicket>) => {
      return (
        ticket.reference?.toLowerCase().includes(searchLower) ||
        ticket.request?.toLowerCase().includes(searchLower) ||
        ticket.description?.toLowerCase().includes(searchLower) ||
        (ticket.createdBy as Reactory.Models.IUser)?.firstName?.toLowerCase().includes(searchLower) ||
        (ticket.createdBy as Reactory.Models.IUser)?.lastName?.toLowerCase().includes(searchLower) ||
        (ticket.assignedTo as Reactory.Models.IUser)?.firstName?.toLowerCase().includes(searchLower) ||
        (ticket.assignedTo as Reactory.Models.IUser)?.lastName?.toLowerCase().includes(searchLower)
      );
    });

    onDataChange(filtered);
  }, [originalData, onDataChange, onSearchChange]);

  const handleQuickFilterChange = React.useCallback((activeFilters: string[]) => {
    if (activeFilters.length === 0) {
      onDataChange(originalData);
      return;
    }

    // Apply active quick filters
    const activeFilterDefs = quickFilters.filter(f => activeFilters.includes(f.id));
    
    const filtered = originalData?.data?.filter((item: Partial<Reactory.Models.IReactorySupportTicket>) => {
      return activeFilterDefs.some(filterDef => {
        const { field, value, operator, additionalFilters } = filterDef.filter;
        const fieldValue = field.split('.').reduce((obj, key) => obj?.[key], item);
        
        let matches = false;
        switch (operator) {
          case 'eq':
            matches = fieldValue === value;
            break;
          case 'in':
            matches = Array.isArray(value) && value.includes(fieldValue);
            break;
          case 'is-null':
            matches = fieldValue === null || fieldValue === undefined;
            break;
          default:
            matches = false;
        }

        if (matches && additionalFilters) {
          matches = additionalFilters.every(af => {
            const afValue = af.field.split('.').reduce((obj, key) => obj?.[key], item);
            switch (af.operator) {
              case 'gte':
                return afValue >= af.value;
              default:
                return true;
            }
          });
        }

        return matches;
      });
    });

    onDataChange(filtered);
  }, [originalData, onDataChange, quickFilters]);

  const handleAdvancedFilterChange = React.useCallback((filters: any[]) => {
    if (filters.length === 0) {
      onDataChange(originalData);
      return;
    }

    const filtered = originalData?.data?.filter((item: Partial<Reactory.Models.IReactorySupportTicket>) => {
      return filters.every(filter => {
        const fieldValue = filter.field.split('.').reduce((obj, key) => obj?.[key], item);
        const { operator, value } = filter;

        switch (operator) {
          case 'eq':
            return fieldValue === value;
          case 'in':
            return Array.isArray(value) && value.includes(fieldValue);
          case 'contains':
            return typeof fieldValue === 'string' && 
                   typeof value === 'string' && 
                   fieldValue.toLowerCase().includes(value.toLowerCase());
          default:
            return true;
        }
      });
    });

    onDataChange(filtered);
  }, [originalData, onDataChange]);

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
          <SearchBar
            placeholder="Search tickets by reference, title, or assignee..."
            onSearch={handleSearch}
            initialValue={searchText}
            debounceDelay={300}
            showHelpTooltip
            helpText='Search in reference, title, description, and assignee names'
            fullWidth
          />
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

