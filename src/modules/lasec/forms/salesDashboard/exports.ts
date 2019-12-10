import { Reactory } from '@reactory/server-core/types/reactory';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const dashboardExcelExportOptions : Reactory.IExcelExportOptions =  {
  filename: 'CRMDashboard ${moment(formData.periodStart).format("YYYY MMM DD")} - ${moment(formData.periodEnd).format("YYYY MMM DD")}.xlsx',
  sheets: [
    {
      name: 'Quotes',
      index: 0,
      arrayField: 'quotes',
      startRow: 1,
      columns: [
        { 
          title: 'Quote Id', 
          propertyField: 'id',
          format: '',
          type: 'string',
          required: true
        },
        {
          title: 'Code', 
          propertyField: 'code',
          format: '',
          type: 'string',
          required: true
        },
        {
          title: 'Status', 
          propertyField: 'statusName',
          format: '',
          type: 'string',
          required: true
        },
        {
          title: 'Customer', 
          propertyField: 'customerName',
          format: '',
          type: 'string',
          required: true
        },
        {
          title: 'Total (Vat Excl)',
          propertyField: 'totalVATExclusive',
          format: 'currency',
          type: 'number',
          required: true
        }
      ]
    }        
  ]
};

export default {
  title: 'Excel Export',
  frameProps: {
    height: '100%',
    width: '100%',
    styles: {
      height: '100%',
      width: '100%',
    },
    url: `blob`,
    method: 'get'      
  },
  engine: 'excel',    
  useClient: true,
  mappingType: 'om',
  mapping: {
    'formData.toolbar.periodStart': 'sheets.Overview.periodStart',
    'formData.toolbar.periodEnd': 'sheets.Overview.periodEnd',
    'formData.quotes': 'sheets.Quotes.quotes'
  },
  exportOptions: dashboardExcelExportOptions
};