import { Indvidual360Template, Leadership360Template, TeamLeadership180Template, CultureLeadershipTemplate } from './Leadership360Template';
import { LeadershipBrand } from '@reactory/server-modules/towerstone/models';
import { Organization, Scale } from '@reactory/server-core/models';
import {
  isNil, template, sortBy
} from 'lodash'
import { ObjectID, ObjectId } from 'mongodb';
import { MongooseDocument } from 'mongoose';
import ApiError from 'exceptions';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';
import { Reactory } from 'types/reactory';

const factory = async (organizationId: string | ObjectID, surveyType: string = 'i360', patch: boolean = true, user: Reactory.IUserDocument): Promise<MongooseDocument> => {

  let selectedScale = await Scale.findOne({ key: 'mores-default-scale' }).then();

  if (selectedScale === null) {
    selectedScale = new Scale({
      _id: new ObjectID(),
      title: 'Mores Asessments Default Scale',
      key: 'mores-default-scale',
      entries: [
        {
          "_id": new ObjectID(),
          "description": "Please select a rating.",
          "rating": 0
        },
        {
          "_id": new ObjectID(),
          "description": "Strongly disagree.",
          "rating": 1
        },
        {
          "_id": new ObjectID(),
          "description": "Disagree",
          "rating": 2
        },
        {
          "_id": new ObjectID(),
          "description": "Neutral",
          "rating": 3
        },
        {
          "_id": new ObjectID(),
          "description": "Agree",
          "rating": 4
        },
        {
          "_id": new ObjectID(),
          "description": "Strongly Agree",
          "rating": 5
        }
      ],
    });

    await selectedScale.save().then();
  }

  if (selectedScale === null) {
    throw new ApiError('Could not get or create the mores-default-scale')
  }

  let templateFunction = null;
  switch (surveyType) {
    case 'l360': {
      templateFunction = Leadership360Template;
      break;
    }
    case 'culture': {
      templateFunction = CultureLeadershipTemplate;
      break;
    }
    case 'team180': {
      templateFunction = TeamLeadership180Template;
      break;
    }
    case 'i360':
    default: {
      templateFunction = Indvidual360Template;
      break;
    }
  }

  let generatedBrand: TowerStone.ILeadershipBrandDocument = await LeadershipBrand.findOne({ key: surveyType, organization: new ObjectId(organizationId) }).then();

  const currentTemplate = new LeadershipBrand(templateFunction(organizationId, selectedScale._id, user)) as TowerStone.ILeadershipBrandDocument;

  if (generatedBrand === null) {
    generatedBrand = currentTemplate;
    generatedBrand.key = surveyType;
    await generatedBrand.save().then();
  } else {
    //patch the brand content from the factory
    if (patch === true) {
      sortBy(generatedBrand.qualities, "ordinal").forEach((quality: TowerStone.IQuality, index: number) => {
        let sourceQuality = sortBy(currentTemplate.qualities, "ordinal")[index];

        quality.title = sourceQuality.title;
        quality.description = sourceQuality.description;
        quality.chart_color = sourceQuality.chart_color;
        quality.chart_title = sourceQuality.chart_title;
        quality.assessor_title = sourceQuality.assessor_title;
        quality.delegate_title = sourceQuality.delegate_title;
        quality.delegate_description = sourceQuality.delegate_description;
        quality.ordinal = sourceQuality.ordinal;

        let sortedSourceBehaviours: Array<TowerStone.IBehaviour> = sourceQuality.behaviours.sort((a, b) => a.ordinal - b.ordinal);

        quality.behaviours.sort((a, b) => a.ordinal - b.ordinal).forEach((behaviour: TowerStone.IBehaviour, bIdx: number) => {
          behaviour.title = sortedSourceBehaviours[bIdx].title;
          behaviour.description = sortedSourceBehaviours[bIdx].description;
          behaviour.chart_color = sortedSourceBehaviours[bIdx].chart_color;
          behaviour.chart_title = sortedSourceBehaviours[bIdx].chart_title;
          behaviour.assessor_title = sortedSourceBehaviours[bIdx].assessor_title;
          behaviour.delegate_title = sortedSourceBehaviours[bIdx].delegate_title;
          behaviour.delegate_description = sortedSourceBehaviours[bIdx].delegate_description;
          behaviour.ordinal = sortedSourceBehaviours[bIdx].ordinal;
        });
      });

      await generatedBrand.save().then();
    }
  }


  return generatedBrand;
};

export default factory;