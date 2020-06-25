import { Indvidual360Template, Leadership360Template, TeamLeadership180Template, CultureLeadershipTemplate } from './Leadership360Template';
import { LeadershipBrand } from '@reactory/server-modules/towerstone/models';
import { Organization, Scale } from '@reactory/server-core/models';
import {
  isNil, template
} from 'lodash'
import { ObjectID, ObjectId } from 'mongodb';
import { MongooseDocument } from 'mongoose';
import ApiError from 'exceptions';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';

const factory = async ( organizationId: string |ObjectID, surveyType: string = 'i360'  ) : Promise<MongooseDocument> => {
  
  let selectedScale = await Scale.findOne({ key: 'mores-default-scale' }).then();

  if(selectedScale === null) {
    selectedScale = new Scale({
      _id: new ObjectID(),
      title: 'Mores Asessments Default Scale',
      key: 'mores-default-scale',
      entries: [
        {
          "_id" : new ObjectID(), 
          "description" : "Please select a rating.", 
          "rating": 0
        }, 
        {
          "_id" :  new ObjectID(), 
          "description" : "Strongly disagree.", 
          "rating" : 1
        }, 
        {
          "_id" :  new ObjectID(), 
          "description" : "Disagree", 
          "rating" : 2
        }, 
        {
          "_id" : new ObjectID(), 
          "description" : "Neutral", 
          "rating" : 3
        }, 
        {
          "_id" : new ObjectID(), 
          "description" : "Agree", 
          "rating" : 4
        },
        {
          "_id" : new ObjectID(), 
          "description" : "Strongly Agree", 
          "rating" : 5
        }
      ],
    });

    await selectedScale.save().then();
  }

  if(selectedScale === null) {
    throw new ApiError('Could not get or create the mores-default-scale')
  }
  
  let generatedBrand: TowerStone.ILeadershipBrandDocument = await LeadershipBrand.findOne({ key: surveyType, organization: new ObjectId( organizationId )}).then();
  
  if(generatedBrand === null) {
    let templateFunction = null;
    switch(surveyType) {     
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
    generatedBrand = new LeadershipBrand(templateFunction(organizationId, selectedScale._id)) as TowerStone.ILeadershipBrandDocument;
    generatedBrand.key = surveyType;
    await generatedBrand.save().then();
  }
      
  return generatedBrand;
};

export default factory;