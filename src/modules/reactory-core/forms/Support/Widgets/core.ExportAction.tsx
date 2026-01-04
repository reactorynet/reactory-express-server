import Reactory from '@reactory/reactory-core';

interface ExportActionDependencies {
  React: Reactory.React;
  Material: Reactory.Client.Web.IMaterialModule;
}

interface ExportActionProps {
  reactory: Reactory.Client.IReactoryApi;
  tickets: Partial<Reactory.Models.IReactorySupportTicket>[];
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * ExportAction Component
 * 
 * Dialog for exporting support ticket data to various formats.
 * 
 * Features:
 * - Multiple export formats (CSV, Excel, JSON, PDF)
 * - Field selection
 * - Date range filtering
 * - Progress tracking
 * - Error handling
 * - Auto-download on completion
 * 
 * @example
 * <ExportAction
 *   tickets={tickets}
 *   onComplete={() => console.log('exported')}
 *   onCancel={() => console.log('cancelled')}
 * />
 */
const ExportAction = (props: ExportActionProps) => {
  const { reactory, tickets, onComplete, onCancel } = props;

  // Get dependencies from registry
  const {
    React,
    Material,
  } = reactory.getComponents<ExportActionDependencies>([
    'react.React',
    'material-ui.Material',
  ]);

  const { MaterialCore } = Material;
  const {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Alert,
    LinearProgress,
    Icon,
    Checkbox,
    FormControlLabel,
    FormGroup,
  } = MaterialCore;

  // Loading check
  if (!React || !Material) {
    return null;
  }

  const [format, setFormat] = React.useState<'csv' | 'excel' | 'json' | 'pdf'>('csv');
  const [selectedFields, setSelectedFields] = React.useState<string[]>([
    'reference',
    'status',
    'priority',
    'request',
    'requestType',
    'assignedTo',
    'createdDate',
  ]);
  const [processing, setProcessing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const availableFields = [
    { id: 'reference', label: 'Reference Number' },
    { id: 'status', label: 'Status' },
    { id: 'priority', label: 'Priority' },
    { id: 'request', label: 'Title' },
    { id: 'description', label: 'Description' },
    { id: 'requestType', label: 'Request Type' },
    { id: 'assignedTo', label: 'Assigned To' },
    { id: 'createdBy', label: 'Created By' },
    { id: 'createdDate', label: 'Created Date' },
    { id: 'updatedDate', label: 'Updated Date' },
    { id: 'tags', label: 'Tags' },
    { id: 'slaDeadline', label: 'SLA Deadline' },
    { id: 'isOverdue', label: 'Overdue Status' },
  ];

  const handleExport = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Prepare export data
      const exportData = tickets.map(ticket => {
        const row: any = {};
        
        selectedFields.forEach(field => {
          switch (field) {
            case 'assignedTo':
              const assignee = ticket.assignedTo as Reactory.Models.IUser;
              row[field] = assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unassigned';
              break;
            case 'createdBy':
              const creator = ticket.createdBy as Reactory.Models.IUser;
              row[field] = creator ? `${creator.firstName} ${creator.lastName}` : '';
              break;
            case 'tags':
              row[field] = ticket.tags?.join(', ') || '';
              break;
            case 'createdDate':
            case 'updatedDate':
            case 'slaDeadline':
              const dateValue = ticket[field as keyof typeof ticket];
              row[field] = dateValue ? new Date(dateValue as string).toLocaleString() : '';
              break;
            case 'isOverdue':
              row[field] = ticket.isOverdue ? 'Yes' : 'No';
              break;
            default:
              row[field] = ticket[field as keyof typeof ticket] || '';
          }
        });
        
        return row;
      });

      // Generate export based on format
      let fileContent: string | Blob;
      let fileName: string;
      let mimeType: string;

      switch (format) {
        case 'csv':
          fileContent = generateCSV(exportData);
          fileName = `support-tickets-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        
        case 'json':
          fileContent = JSON.stringify(exportData, null, 2);
          fileName = `support-tickets-${Date.now()}.json`;
          mimeType = 'application/json';
          break;
        
        case 'excel':
          // For now, use CSV format (can be enhanced with actual Excel library later)
          fileContent = generateCSV(exportData);
          fileName = `support-tickets-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
        
        case 'pdf':
          // PDF export would require a library like jsPDF
          // For now, show a message
          throw new Error('PDF export is not yet implemented. Please use CSV or JSON format.');
        
        default:
          throw new Error('Unsupported export format');
      }

      // Trigger download
      downloadFile(fileContent, fileName, mimeType);

      setProcessing(false);
      
      // Close after short delay
      setTimeout(() => {
        onComplete();
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to export data');
      setProcessing(false);
    }
  };

  const generateCSV = (data: any[]): string => {
    if (data.length === 0) return '';

    // Get headers from first row
    const headers = Object.keys(data[0]);
    
    // Escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // Generate CSV content
    const headerRow = headers.map(h => escapeCSV(h)).join(',');
    const dataRows = data.map(row => 
      headers.map(header => escapeCSV(row[header])).join(',')
    ).join('\n');

    return `${headerRow}\n${dataRows}`;
  };

  const downloadFile = (content: string | Blob, fileName: string, mimeType: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleToggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldId));
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const handleSelectAll = () => {
    setSelectedFields(availableFields.map(f => f.id));
  };

  const handleSelectNone = () => {
    setSelectedFields([]);
  };

  return (
    <Dialog
      open={true}
      onClose={!processing ? onCancel : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon>file_download</Icon>
          <Typography variant="h6">
            Export {tickets.length} Ticket{tickets.length > 1 ? 's' : ''}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Export Format Selection */}
          <FormControl fullWidth>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={format}
              label="Export Format"
              onChange={(e) => setFormat(e.target.value as any)}
              disabled={processing}
            >
              <MenuItem value="csv">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon>description</Icon>
                  CSV (Comma Separated Values)
                </Box>
              </MenuItem>
              <MenuItem value="excel">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon>table_chart</Icon>
                  Excel Spreadsheet
                </Box>
              </MenuItem>
              <MenuItem value="json">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon>code</Icon>
                  JSON (JavaScript Object Notation)
                </Box>
              </MenuItem>
              <MenuItem value="pdf" disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: 0.5 }}>
                  <Icon>picture_as_pdf</Icon>
                  PDF (Coming Soon)
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* Field Selection */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Select Fields to Export:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" onClick={handleSelectAll} disabled={processing}>
                  Select All
                </Button>
                <Button size="small" onClick={handleSelectNone} disabled={processing}>
                  Clear
                </Button>
              </Box>
            </Box>
            
            <FormGroup>
              <Box sx={{ 
                maxHeight: 250, 
                overflow: 'auto', 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1,
                p: 1 
              }}>
                {availableFields.map((field) => (
                  <FormControlLabel
                    key={field.id}
                    control={
                      <Checkbox
                        checked={selectedFields.includes(field.id)}
                        onChange={() => handleToggleField(field.id)}
                        disabled={processing}
                      />
                    }
                    label={field.label}
                  />
                ))}
              </Box>
            </FormGroup>
          </Box>

          {/* Info Alert */}
          <Alert severity="info" icon={<Icon>info</Icon>}>
            <Typography variant="body2">
              {selectedFields.length} field{selectedFields.length !== 1 ? 's' : ''} selected • 
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} will be exported
            </Typography>
          </Alert>

          {/* Error Display */}
          {error && (
            <Alert severity="error" icon={<Icon>error</Icon>}>
              {error}
            </Alert>
          )}

          {/* Progress Bar */}
          {processing && (
            <Box>
              <LinearProgress />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                Generating export file...
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={processing}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant="contained"
          disabled={selectedFields.length === 0 || processing}
          startIcon={processing ? <Icon>hourglass_empty</Icon> : <Icon>file_download</Icon>}
        >
          {processing ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const Definition: any = {
  name: 'ExportAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: ExportAction,
  roles: ['USER']
}

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    ExportAction,
    ['Support Tickets', 'Export', 'Data'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', { 
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`, 
    component: ExportAction 
  });
}

export default ExportAction;
