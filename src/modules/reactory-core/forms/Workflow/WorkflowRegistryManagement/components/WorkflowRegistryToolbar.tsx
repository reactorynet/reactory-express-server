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

interface WorkflowRegistryToolbarDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
  QuickFilters: any;
  SearchBar: any;
  AdvancedFilterPanel: any;
}

interface WorkflowRegistryToolbarProps {
  reactory: Reactory.Client.IReactoryApi;
  data: {
    data?: any[];
    paging: {
      hasNext: boolean;
      hasPrevious: boolean;
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
    selected?: any[] | null;    
  };
  onDataChange?: (filteredData: any[]) => void;
  onPagingChange?: (paging: {
    page: number;
    pageSize: number;
  }) => void;
  onSelectedChange?: (selected: any[] | null) => void;
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
 * Custom toolbar for Workflow Registry with Quick Filters, Search, and Advanced Filters
 */
const WorkflowRegistryToolbar = (props: WorkflowRegistryToolbarProps) => {
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
  } = reactory.getComponents<WorkflowRegistryToolbarDependencies>([
    'react.React',
    'material-ui.Material',
    'core.QuickFilters',
    'core.SearchBar',
    'core.AdvancedFilterPanel',
  ]);

  const { MaterialCore } = Material;
  const { Box, Button, Icon, Toolbar } = MaterialCore;

  // If components aren't loaded, show loading state
  if (!QuickFilters || !SearchBar || !AdvancedFilterPanel) {
    return (
      <Toolbar sx={{ p: 2, bgcolor: 'background.paper' }}>
        <Box>Loading filters...</Box>
      </Toolbar>
    );
  }

  const [advancedPanelOpen, setAdvancedPanelOpen] = React.useState(false);
  const [originalData] = React.useState(data);

  // Count workflows for badges
  const counts = React.useMemo(() => {
    return {
      active: data?.data?.filter((w: any) => w.isActive === true).length || 0,
      inactive: data?.data?.filter((w: any) => w.isActive === false).length || 0,
      hasErrors: data?.data?.filter((w: any) => (w.statistics?.failedExecutions || 0) > 0).length || 0,
      neverRun: data?.data?.filter((w: any) => (w.statistics?.totalExecutions || 0) === 0).length || 0,
      scheduled: data?.data?.filter((w: any) => w.hasSchedule).length || 0,
      recentlyUpdated: data?.data?.filter((w: any) => {
        if (!w.updatedAt) return false;
        const dayAgo = new Date();
        dayAgo.setDate(dayAgo.getDate() - 1);
        return new Date(w.updatedAt) > dayAgo;
      }).length || 0,
    };
  }, [data]);

  // Quick Filter Definitions
  const quickFilters: QuickFilterDefinition[] = [
    {
      id: 'active',
      label: 'Active',
      icon: 'check_circle',
      color: 'success',
      filter: {
        field: 'isActive',
        value: true,
        operator: 'eq',
      },
      badge: counts.active,
    },
    {
      id: 'inactive',
      label: 'Inactive',
      icon: 'cancel',
      color: 'default',
      filter: {
        field: 'isActive',
        value: false,
        operator: 'eq',
      },
      badge: counts.inactive,
    },
    {
      id: 'has-errors',
      label: 'Has Errors',
      icon: 'error',
      color: 'error',
      filter: {
        field: 'statistics.failedExecutions',
        value: 0,
        operator: 'gt',
      },
      badge: counts.hasErrors,
    },
    {
      id: 'never-run',
      label: 'Never Run',
      icon: 'play_disabled',
      color: 'warning',
      filter: {
        field: 'statistics.totalExecutions',
        value: 0,
        operator: 'eq',
      },
      badge: counts.neverRun,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      icon: 'schedule',
      color: 'info',
      filter: {
        field: 'hasSchedule',
        value: true,
        operator: 'eq',
      },
      badge: counts.scheduled,
    },
    {
      id: 'recent',
      label: 'Recently Updated',
      icon: 'update',
      color: 'primary',
      filter: {
        field: 'updatedAt',
        value: new Date(Date.now() - 24 * 60 * 60 * 1000),
        operator: 'gte',
      },
      badge: counts.recentlyUpdated,
    },
  ];

  // Advanced Filter Field Definitions
  const advancedFilterFields: AdvancedFilterField[] = [
    {
      id: 'status',
      label: 'Status',
      field: 'isActive',
      type: 'select',
      options: [
        { label: 'Active', value: true },
        { label: 'Inactive', value: false },
      ],
    },
    {
      id: 'namespace',
      label: 'Namespace',
      field: 'nameSpace',
      type: 'multi-select',
      options: [
        { label: 'Core', value: 'core' },
        { label: 'Reactory', value: 'reactory' },
        { label: 'Custom', value: 'custom' },
        { label: 'System', value: 'system' },
      ],
    },
    {
      id: 'tags',
      label: 'Tags',
      field: 'tags',
      type: 'text',
      placeholder: 'Search by tag (comma-separated)...',
    },
    {
      id: 'search-name',
      label: 'Workflow Name',
      field: 'name',
      type: 'text',
      placeholder: 'Type workflow name...',
    },
    {
      id: 'author',
      label: 'Author',
      field: 'author',
      type: 'text',
      placeholder: 'Type author name...',
    },
    {
      id: 'has-errors',
      label: 'Has Errors',
      field: 'statistics.failedExecutions',
      type: 'boolean',
    },
    {
      id: 'never-executed',
      label: 'Never Executed',
      field: 'statistics.totalExecutions',
      type: 'boolean',
    },
  ];

  const handleSearch = React.useCallback((text: string) => {
    if (onSearchChange) {
      onSearchChange(text);
    }

    if (!text.trim()) {
      onDataChange?.(originalData?.data || []);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = originalData?.data?.filter((workflow: any) => {
      return (
        workflow.name?.toLowerCase().includes(searchLower) ||
        workflow.nameSpace?.toLowerCase().includes(searchLower) ||
        workflow.description?.toLowerCase().includes(searchLower) ||
        workflow.author?.toLowerCase().includes(searchLower) ||
        workflow.version?.toLowerCase().includes(searchLower) ||
        workflow.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }) || [];

    onDataChange?.(filtered);
  }, [originalData, onDataChange, onSearchChange]);

  const handleQuickFilterChange = React.useCallback((activeFilters: string[]) => {
    if (activeFilters.length === 0) {
      onDataChange?.(originalData?.data || []);
      return;
    }

    // Apply active quick filters
    const activeFilterDefs = quickFilters.filter(f => activeFilters.includes(f.id));
    
    const filtered = originalData?.data?.filter((item: any) => {
      return activeFilterDefs.some(filterDef => {
        const { field, value, operator, additionalFilters } = filterDef.filter;
        const fieldValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], item);
        
        let matches = false;
        switch (operator) {
          case 'eq':
            matches = fieldValue === value;
            break;
          case 'gt':
            matches = fieldValue > value;
            break;
          case 'gte':
            matches = fieldValue >= value || new Date(fieldValue) >= value;
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
            const afValue = af.field.split('.').reduce((obj: any, key: string) => obj?.[key], item);
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
    }) || [];

    onDataChange?.(filtered);
  }, [originalData, onDataChange, quickFilters]);

  const handleAdvancedFilterChange = React.useCallback((filters: any[]) => {
    if (filters.length === 0) {
      onDataChange?.(originalData?.data || []);
      return;
    }

    const filtered = originalData?.data?.filter((item: any) => {
      return filters.every(filter => {
        const fieldValue = filter.field.split('.').reduce((obj: any, key: string) => obj?.[key], item);
        const { operator, value } = filter;

        switch (operator) {
          case 'eq':
            return fieldValue === value;
          case 'in':
            if (Array.isArray(value) && Array.isArray(fieldValue)) {
              // For tags array - check if any tag matches
              return fieldValue.some((tag: string) => 
                value.some((v: string) => tag.toLowerCase().includes(v.toLowerCase()))
              );
            }
            return Array.isArray(value) && value.includes(fieldValue);
          case 'contains':
            return typeof fieldValue === 'string' && 
                   typeof value === 'string' && 
                   fieldValue.toLowerCase().includes(value.toLowerCase());
          case 'gt':
            return fieldValue > value;
          case 'eq-boolean':
            // Special handling for boolean filters like "never executed"
            if (filter.field === 'statistics.totalExecutions' && value === true) {
              return fieldValue === 0;
            }
            if (filter.field === 'statistics.failedExecutions' && value === true) {
              return fieldValue > 0;
            }
            return true;
          default:
            return true;
        }
      });
    }) || [];

    onDataChange?.(filtered);
  }, [originalData, onDataChange]);

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
        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <SearchBar
            placeholder="Search workflows by name, namespace, description, author, or tags..."
            onSearch={handleSearch}
            initialValue={searchText}
            debounceDelay={300}
            showHelpTooltip
            helpText='Search in name, namespace, description, author, version, and tags'
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={<Icon>filter_list</Icon>}
            onClick={() => setAdvancedPanelOpen(true)}
            sx={{ minWidth: 'auto', whiteSpace: 'nowrap' }}
          >
            Advanced Filters
          </Button>
        </Box>

        {/* Quick Filters */}
        <QuickFilters
          filters={quickFilters}
          onFilterChange={handleQuickFilterChange}
          variant="buttons"
          multiSelect={false}
        />
      </Toolbar>

      {/* Advanced Filter Panel */}
      <AdvancedFilterPanel
        open={advancedPanelOpen}
        onClose={() => setAdvancedPanelOpen(false)}
        fields={advancedFilterFields}
        onFilterChange={handleAdvancedFilterChange}
        showPresets
      />
    </>
  );
};

const Definition: any = {
  name: 'WorkflowRegistryToolbar',
  nameSpace: 'core',
  version: '1.0.0',
  component: WorkflowRegistryToolbar,
  roles: ['USER', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    WorkflowRegistryToolbar,
    ['Workflow', 'Toolbar'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: WorkflowRegistryToolbar 
  });
}

export default WorkflowRegistryToolbar;
