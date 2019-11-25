


import lodash from 'lodash';
import logger from 'logging';
import { TowerStone } from '../towerstone';
import { FormNameSpace } from '../constants';
import { ObjectId } from 'bson';
import { Survey } from '@reactory/server-core/models'


const getSurveyService = (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneSurveyService =>  {
  logger.debug("TowerStoneEmailService Constructor", {props, context});
  return {
    get: (id: String) => {
      return Survey.findById(id)
    }
  }
};

const TowerstoneSurveyServiceProvider: TowerStone.ITowerStoneSurveyServiceProvider = getSurveyService;

export default TowerstoneSurveyServiceProvider;