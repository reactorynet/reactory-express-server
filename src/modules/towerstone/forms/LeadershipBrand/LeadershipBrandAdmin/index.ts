import { UIFrameWork } from "@reactory/server-core/types/constants";
import { Reactory } from "@reactory/server-core/types/reactory";
import propsFactory from '@reactory/server-core/data/forms/defs';
import $graphql from './graphql';
import $schema, { sanitizeSpec } from './schema';
import $uiSchema from './uiSchema';

import { FormNameSpace } from "../../../constants";

export const defaultFormValue = {
  scale: '',
  qualities: [],
};

export const TowerStoneLeadershipBrandConfigForm: Reactory.IReactoryForm = {
  id: 'TowerStoneLeadershipBrandConfig',
  title: 'TowerStone Leadership Brand Configuration',  
  nameSpace: FormNameSpace,
  uiFramework: UIFrameWork.material,
  uiSupport: [ UIFrameWork.material ],
  name: 'TowerStoneLeadershipBrandConfig',
  helpTopics: ['Create Leadership Brand'],
  version: '1.0.0',
  registerAsComponent: true,
  schema: $schema,
  sanitizeSchema: sanitizeSpec,
  uiSchema: $uiSchema,
  defaultFormValue,
  workflow: {
    onSave: {
      id: 'towerstone.LeadershipBrandOnSave',
      properties: {
        'formData.id': 'brandId',
      },
    },
  },
  graphql: $graphql,

};


