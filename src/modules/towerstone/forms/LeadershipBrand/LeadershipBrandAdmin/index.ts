import { UIFrameWork } from "@reactory/server-core/types/constants";
import { Reactory } from "@reactory/server-core/types/reactory";
import propsFactory from '@reactory/server-core/data/forms/defs';
import $graphql from './graphql';
import $schema from './schema';
import $uiSchema from './uiSchema';

import { FormNameSpace } from "../../../constants";

export const defaultFormValue = {
  scale: '',
  qualities: [
    {
      ordinal: 1,
      behaviours: [
        {
          ordinal: 1,
        },
      ],
    },
  ],
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


