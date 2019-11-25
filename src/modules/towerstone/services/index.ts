import moment from "moment";
import logger from "logging";
import TowerStoneEmailService from './TowerStoneEmailService';
import TowerStoneSurveyService from './TowerStoneSurveyService';

import { FormNameSpace } from "../constants";
import { Reactory } from "types/reactory";
import { TowerStone } from "../towerstone";
//custom services to be expressed here



const EmailServiceDefinition : Reactory.IReactoryServiceDefinition = {
  id: `${FormNameSpace}.EmailService@1.0.0`,
  name: 'Towerstone Email Services',
  description: "Provides all email service functions for TowerStone and PLC Services",
  service: (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneEmailService => {
    logger.debug("Executing TowerStone Email Service Provider");    
    return TowerStoneEmailService(props, context);
  },
  serviceType: 'TowerStone.ITowerStoneEmailServiceProvider',
};

const SurveyServiceDefinition: Reactory.IReactoryServiceDefinition = {
  id: `${FormNameSpace}.SurveyService@1.0.0`,
  name: 'Towerstone Survey Service',
  description: "Provides all Survey Related Service functions for TowerStone and PLC Services",
  service: (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneSurveyService => {
    logger.debug("Executing TowerStone Email Service Provider");    
    return TowerStoneSurveyService(props, context);
  },
  serviceType: 'TowerStone.ITowerStoneSurveyService',
}

export const services: Reactory.IReactoryServiceDefinition[] = [
  EmailServiceDefinition,
  SurveyServiceDefinition,    
];

export const TowerStoneServicesMap = {
  "towerstone.EmailService@1.0.0": EmailServiceDefinition,
  "towerstone.SurveyService@1.0.0": SurveyServiceDefinition
};

export default services;
