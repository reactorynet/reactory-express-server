import { mergeGraphResolver } from '@reactory/server-core/utils';
import SurveyResolver from './SurveyResolver';
export default mergeGraphResolver([
  SurveyResolver,
]);
