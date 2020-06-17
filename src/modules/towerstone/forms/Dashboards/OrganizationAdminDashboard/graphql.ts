import { Reactory } from '@reactory/server-core/types/reactory';



const OrganizationDashboardFormQuery : Reactory.IFormGraphDefinition =  {
  query: {
    name: 'OrganizationDashboardFormQuery',
    text: `
    query MoresGetOrganizationAdminDashboard($dashparams: MoresOrganizationDashboardQueryInput){
      MoresGetOrganizationAdminDashboard(dashparams: $dashparams){
        toolbar {
          period
          periodStart
          periodEnd
        }
      }
    }
    `,
    variables: {
      'formData.toolbar.period': 'dashparams.period',
      'formData.toolbar.periodStart': 'dashparams.periodStart',
      'formData.toolbar.periodEnd': 'dashparams.periodEnd',      
    },
    resultMap: {
      id: 'id',
      period: 'toolbar.period',
      periodStart: 'toolbar.periodStart',
      periodEnd: 'toolbar.periodEnd',      
    },
    edit: false,
    new: false,    
  },
};

export default OrganizationDashboardFormQuery;