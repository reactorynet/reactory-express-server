import { mergeGraphResolver } from '@reactory/server-core/utils';
import SurveyResolver from './SurveyResolver';
import MoresDashboardsResolver from './Mores/Dashboards';
import MoresSurveyResolver from './Mores/Survey';
import MoresReportDataResolver from './Mores/Reports';
import MoresOrganisation from './Mores/Organisation';

export default mergeGraphResolver([
  SurveyResolver,
  MoresDashboardsResolver,
  MoresSurveyResolver,
  MoresReportDataResolver,
  MoresOrganisation,
]);
