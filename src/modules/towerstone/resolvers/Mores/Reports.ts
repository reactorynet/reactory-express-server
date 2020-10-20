
import { MoresIndidvidual360DataResolver } from '../../pdf/Mores/Individual360'
import { MoresLeadership360DataResolver } from '../../pdf/Mores/Leadership360';
import { MoresTeamCultureDataResolver } from '../../pdf/Mores/CultureSurvey';
import { MoresTeam180ReportDataResolver } from '../../pdf/Mores/Team180';
const ReportsResolver = {
    Query: {
        MoresTeam180ReportData: (obj, params) => {
            return MoresTeam180ReportDataResolver(params);
        },
        MoresLeadership360ReportData: (obj, params) => {
            return MoresLeadership360DataResolver(params);
        },
        MoresIndividual360ReportData: (obj, params) => {            
            return MoresIndidvidual360DataResolver(params);
        },
        MoresTeamCultureReportData: (obj, params) => {
            return MoresTeamCultureDataResolver(params);
        }
    }
}

export default ReportsResolver