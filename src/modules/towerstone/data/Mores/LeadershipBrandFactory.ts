import { Indvidual360Template } from './Leadership360Template';
import { LeadershipBrand } from '@reactory/server-modules/towerstone/models';
import { Organization, Scale } from '@reactory/server-core/models';
import {
  isNil
} from 'lodash'
import { ObjectID } from 'mongodb';
import { MongooseDocument } from 'mongoose';
import ApiError from 'exceptions';
import { TowerStone } from '@reactory/server-modules/towerstone/towerstone';

const factory = async ( organizationId: string |ObjectID  ) : Promise<MongooseDocument> => {
  
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

  const generatedBrand: TowerStone.ILeadershipBrandDocument = new LeadershipBrand(Indvidual360Template(organizationId, selectedScale._id)) as TowerStone.ILeadershipBrandDocument;      
  await generatedBrand.save().then();
  
  return generatedBrand;
};

export default factory;