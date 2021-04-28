import moment from "moment";
import logger from "logging";
import TowerStoneEmailService from './TowerStoneEmailService';
import TowerStoneSurveyService from './TowerStoneSurveyService';

import { FormNameSpace } from "../constants";
import { Reactory } from "@reactory/server-core/types/reactory";
import { TowerStone } from "../towerstone";
//custom services to be expressed here



const EmailServiceDefinition: Reactory.IReactoryServiceDefinition = {
  id: `${FormNameSpace}.EmailService@1.0.0`,
  name: 'Towerstone Email Services',
  description: "Provides all email service functions for TowerStone and PLC Services",
  service: (props: TowerStone.ITowerStoneServiceParameters, context: any): TowerStone.ITowerStoneEmailService => {
    logger.debug("Executing TowerStone Email Service Provider");
    return TowerStoneEmailService(props, context);
  },
  serviceType: 'TowerStone.ITowerStoneEmailServiceProvider',
};

export const services: Reactory.IReactoryServiceDefinition[] = [
  EmailServiceDefinition,
  TowerStoneSurveyService,
];

export const TowerStoneServicesMap = {
  "towerstone.EmailService@1.0.0": EmailServiceDefinition,
  "towerstone.SurveyService@1.0.0": TowerStoneSurveyService,
};

export default services;
