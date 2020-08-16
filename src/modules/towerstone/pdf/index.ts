import MoresTeam180 from './Mores/Team180';
import MoresLeadership360 from './Mores/Leadership360';
import MoresIndividual360 from './Mores/Individual360';
import MoresCultureSurvey from './Mores/CultureSurvey';
import TowerStone360 from './towerstone/delegate-360-assessment';
import TowerStone180 from './towerstone/delegate-180-assessment';
import SurveyStatus from './towerstone/survey-status-delegates';
export default [
    {
        nameSpace: 'mores',
        name: 'MoresLeadership360',
        version: '1.0.0',
        component: MoresLeadership360
    },
    {
        nameSpace: 'mores',
        name: 'MoresIndividual360',
        version: '1.0.0',
        component: MoresIndividual360
    },
    {
        nameSpace: 'mores',
        name: 'MoresCultureSurvey',
        version: '1.0.0',
        component: MoresCultureSurvey
    },
    {
        nameSpace: 'mores',
        name: 'MoresTeam180',
        version: '1.0.0',
        component: MoresTeam180
    },
    {
        nameSpace: 'towerstone',
        name: 'TowerStoneTeam180',
        version: '1.0.0',
        component: TowerStone180
    },
    {
        nameSpace: 'towerstone',
        name: 'TowerStone360',
        version: '1.0.0',
        component: TowerStone360
    },
    {
        nameSpace: 'towerstone',
        name: 'SurveyStatus',
        version: '1.0.0',
        component: SurveyStatus
    }
];