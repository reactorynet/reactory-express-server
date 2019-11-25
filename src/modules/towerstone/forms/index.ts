import { TowerStoneSurveyConfigForm } from './SurveyConfig'
import { TowerStoneLeadershipBrandConfigForm } from './LeadershipBrands';
import { TowerStoneSurveyDelegateConfig } from './SurveyDelegates';
import { TowerStoneSurveySettings } from './SurveySettings';
import { TowerStoneSurveyTemplatesForm } from './SurveyTemplates';

const Forms: Reactory.IReactoryForm[] = [
  TowerStoneLeadershipBrandConfigForm,
  TowerStoneSurveyConfigForm,
  TowerStoneSurveyDelegateConfig,
  TowerStoneSurveySettings,
  TowerStoneSurveyTemplatesForm
];


export default Forms;

