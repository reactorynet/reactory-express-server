import { mergeGraphResolver } from '@reactory/server-core/utils';
import SurveyResolver from './SurveyResolver';
import MoresDashboardsResolver from './Mores/Dashboards';

export default mergeGraphResolver([
  SurveyResolver,
  MoresDashboardsResolver,
]);
