import { PieChart } from '@reactory/server-modules/core/schema/formSchema';
import { PeriodToolbarSchema } from '@reactory/server-modules/towerstone/forms/Widgets/FilterSchemas';

export default {
  type: 'object',
  title: '',
  properties: {
    toolbar: {
      ...PeriodToolbarSchema
    },
    activeSurveys: {
      type: 'number',
      title: 'Active Surveys'
    },
    totalAssessments: {
      type: 'number',
      title: 'Total Assessessments'
    },
    completedAssessments: {
      type: 'number',
      title: 'Completed Assessements'
    },
    responseRate: {
      type: 'number',
      title: 'Response Rate'
    },
    nextActions: {
      type: 'array',
      title: 'Next Actions'
    },
    charts: {
      type: 'object',
      title: 'Dashboard Charts',
      properties: {
        culture: {
          type: 'string',
          title: 'Culture Chart For Organization'
        },
        leadership360: {
          type: 'string',
          title: 'Leadership 360 Chart For Organization'
        },
        individual360: {
          type: 'string',
          title: 'Culture Chart For Organization'
        },
        team180: {
          type: 'string',
          title: 'Team 180 Chart For Organization'
        }
      }
    },
    assessments: {
      title: 'Assessments',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          title: 'Assessment Id'
        },
        complete: {
          type: 'boolean',
          title: 'Complete'
        },
        delegate: {
          type: 'string',
          title: 'Delegate'
        },
        assessor: {
          type: 'string',
          title: 'assessor'
        },        
      }
    }
  }
};
