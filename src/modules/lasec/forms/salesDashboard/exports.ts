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
          title: 'Code', 
          propertyField: 'code',
          format: '',
          width: 30,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Status', 
          propertyField: 'statusName',
          format: '',
          width: 30,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Company', 
          propertyField: 'companyTradingName',
          format: '',
          width: 45,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Customer', 
          propertyField: 'customerName',
          format: '',
          width: 45,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'GP', 
          propertyField: 'GP',
          format: 'percent',
          width: 45,
          type: 'number',
          required: true,
          style: {}
        },              
        {
          title: 'Total (Vat Excl)',
          propertyField: 'totalVATExclusive',
          format: 'currency',
          type: 'number',
          width: 20,
          required: true,
          style: {
            numFmt: '"R"#,##0.00;[Red]\-"R"#,##0.00'
          }
        },
        {
          title: 'Next Action', 
          propertyField: 'nextAction',         
          format: '',
          width: 90,
          type: 'string',
          required: false,
          style: {}
        },
        {
          title: 'Note', 
          propertyField: 'nextActionNote',         
          format: '',
          width: 120,
          type: 'string',
          required: false,
          style: {}
        },
        {
          title: 'Follow Up', 
          propertyField: 'followUp',         
          format: '',
          width: 90,
          type: 'string',
          required: false,
          style: {}
        },
        {
          title: 'Follow Up Note', 
          propertyField: 'followUpNote',         
          format: '',
          width: 90,
          type: 'string',
          required: false,
          style: {}
        },
        {
          title: 'User', 
          propertyField: 'nextActionWho',         
          format: '',
          width: 90,
          type: 'string',
          required: false,
          style: {}
        },
        {
          title: 'Date Created', 
          propertyField: 'created',         
          format: 'date',
          width: 45,
          type: 'number',
          required: true,
          style: {}
        },
        {
          title: 'Date Modified', 
          propertyField: 'modified',         
          format: 'date',
          width: 45,
          type: 'number',
          required: true,
          style: {}
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