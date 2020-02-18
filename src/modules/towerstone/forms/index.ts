import { Reactory } from "@reactory/server-core/types/reactory";
import { TowerStoneSurveyConfigForm } from './SurveyConfig'
import { TowerStoneLeadershipBrandConfigForm } from './LeadershipBrand/LeadershipBrandAdmin';
import { TowerStoneSurveyDelegateConfig } from './SurveyDelegates';
import { TowerStoneSurveySettings } from './SurveySettings';
import { TowerStoneSurveyTemplatesForm } from './SurveyTemplates';
import { CopyLeadershipBrand } from './CopyLeadershipBrand';
import { QualityFormWidget } from './LeadershipBrand/QualityFormWidget';
import { BehaviourFormWidget } from './LeadershipBrand/BehaviourFormWidget';


const Forms: Reactory.IReactoryForm[] = [
  BehaviourFormWidget,
  QualityFormWidget,
  CopyLeadershipBrand,
  TowerStoneLeadershipBrandConfigForm,
  TowerStoneSurveyConfigForm,
  TowerStoneSurveyDelegateConfig,
  TowerStoneSurveySettings,
  TowerStoneSurveyTemplatesForm,
];

export default Forms;
