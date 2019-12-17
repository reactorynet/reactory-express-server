import { Reactory } from '@reactory/server-core/types/reactory';
import { ENVIRONMENT } from '@reactory/server-core/types/constants';

const dashboardExcelExportOptions : Reactory.IExcelExportOptions =  {
  filename: 'Delegate Report ${moment().format("YYYY MMM DD")}.xlsx',
  sheets: [
    {
      name: 'Delegates',
      index: 0,
      arrayField: 'delegates',
      startRow: 1,
      columns: [        
        {
          title: 'First Name', 
          propertyField: 'firstName',
          format: '',
          width: 30,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Last Name', 
          propertyField: 'lastName',
          format: '',
          width: 30,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Email', 
          propertyField: 'email',
          format: '',
          width: 45,
          type: 'string',
          required: true,
          style: {}
        },
        {
          title: 'Is Complete', 
          propertyField: 'complete',
          format: '',
          width: 45,
          type: 'boolean',
          required: false,
          style: {}
        },                
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
    'formData.delegates': 'sheets.Delegates.delegates',
    'formData.delegates[].delegate.firstName': 'sheets.Delegates.delegates[].firstName',
    'formData.delegates[].delegate.lastName': 'sheets.Delegates.delegates[].lastName',
    'formData.delegates[].delegate.email': 'sheets.Delegates.delegates[].email',
  },
  exportOptions: dashboardExcelExportOptions
};