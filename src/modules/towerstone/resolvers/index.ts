import { mergeGraphResolver } from '@reactory/server-core/utils';
import SurveyResolver from './SurveyResolver';
import MoresDashboardsResolver from './Mores/Dashboards';
import MoresSurveyResolver from './Mores/Survey';

export default mergeGraphResolver([
  SurveyResolver,
  MoresDashboardsResolver,
  MoresSurveyResolver
]);
