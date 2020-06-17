import { Reactory } from "@reactory/server-core/types/reactory";
import { TowerStoneSurveyConfigForm } from './SurveyConfig'
import { TowerStoneLeadershipBrandConfigForm } from './LeadershipBrand/LeadershipBrandAdmin';
import { TowerStoneSurveyDelegateConfig } from './SurveyDelegates';
import { TowerStoneSurveySettings } from './SurveySettings';
import { TowerStoneSurveyTemplatesForm } from './SurveyTemplates';
import { CopyLeadershipBrand } from './CopyLeadershipBrand';
import { QualityFormWidget } from './LeadershipBrand/QualityFormWidget';
import { BehaviourFormWidget } from './LeadershipBrand/BehaviourFormWidget';
import MoresPluginForm from './Global/MoresPlugin';
import  { MoresUserDashboard } from './Dashboards/UserDashboard';


const Forms: Reactory.IReactoryForm[] = [
  MoresPluginForm,
  MoresUserDashboard,
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
