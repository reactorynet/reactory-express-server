import { TowerStoneSurveyConfigForm } from './SurveyConfig'
import { TowerStoneLeadershipBrandConfigForm } from './LeadershipBrands';
import { TowerStoneSurveyDelegateConfig } from './SurveyDelegates';
import { TowerStoneSurveySettings } from './SurveySettings';
import { TowerStoneSurveyTemplatesForm } from './SurveyTemplates';
import { CopyLeadershipBrand } from './CopyLeadershipBrand';

const Forms: Reactory.IReactoryForm[] = [
  CopyLeadershipBrand,
  TowerStoneLeadershipBrandConfigForm,
  TowerStoneSurveyConfigForm,
  TowerStoneSurveyDelegateConfig,
  TowerStoneSurveySettings,
  TowerStoneSurveyTemplatesForm,
];

export default Forms;
