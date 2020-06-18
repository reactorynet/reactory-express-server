import moment, { Moment } from "moment";
import { ObjectID } from "mongodb";
import { ReactoryChart, ReactoryChartType } from '@reactory/server-modules/core/types/Charts';


interface MoresPeriodFilter {
  period: string | 'today' | 'yesterday' | 'this-week' | 'last-week' |
  'this-month'| 'last-month' | 'this-year' | 'last-year';
  periodStart?: Moment,
  periodEnd?: Moment
}

interface MoresOrganizationDashboardFilter extends MoresPeriodFilter {
  organizationId?: ObjectID
}

interface MoresOrganizationDashboard {
  toolbar: MoresPeriodFilter,
  activeSurveys: Number,
  totalAssessments: Number,
  completedAssessments: Number,
  responseRate: Number,
  nextActions: any[],  
  charts: {
    culture: ReactoryChart,
    leadership360: ReactoryChart,
    individual360: ReactoryChart,
    team180: ReactoryChart,
  },
  assessments: any[]
}

interface MoresOrganizationDashboardParams {
  organizationDashboardFilter: MoresOrganizationDashboardFilter
}


const DashboardsResolver = {

  Query: {
    MoresGetOrganizationAdminDashboard: async (obj: any, params: MoresOrganizationDashboardParams): Promise<MoresOrganizationDashboard> => {
      const { 
        organizationDashboardFilter
      } = params;

      const {
        user,
        partner,
      } = global;
      
      const now = moment();

      const response: MoresOrganizationDashboard = {
        toolbar: {
          period: 'today',
          periodStart: moment().subtract(1,'day').startOf('day'),
          periodEnd: moment(now).endOf('day')
        },
        activeSurveys: 0,
        completedAssessments: 0,
        totalAssessments: 0,
        responseRate: 0,
        charts: {
          culture: {
            chartType: ReactoryChartType.PIE,
            data: {},
            options: {},
            key: 'organization-culture-pie'
          },
          individual360: {
            chartType: ReactoryChartType.PIE,
            data: {},
            options: {},
            key: 'organization-individual360-pie'
          },
          leadership360: {
            chartType: ReactoryChartType.PIE,
            data: {},
            options: {},
            key: 'organization-leadership360-pie'
          },
          team180: {
            chartType: ReactoryChartType.PIE,
            data: {},
            options: {},
            key: 'organization-team180-pie'
          }
        },
        nextActions: [],
        assessments: [],
      }

      return response;      
    } 
  },
  Mutation: {

  }
};

export default DashboardsResolver;