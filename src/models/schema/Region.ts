import mongoose, { MongooseDocument } from 'mongoose';
import { ObjectId, ObjectID } from 'mongodb';
// import { Organization } from '@reactory/server-core/models';
import { Reactory } from '@reactory/server-core/types/reactory'
import { ReactoryApplicationsForm } from 'data/forms/core/dashboard';
const { ObjectId } = mongoose.Schema.Types;

const Region = new mongoose.Schema({
  id: ObjectId,
  title: String,

  // Regions with no organization will be considered public regions
  organization: {
    type: ObjectId,
    ref: 'Organization'
  },
  

  locations: [
    {
      title: String,
      country: String,
      province: String,
      district: String,
      city: String
    }
  ]
});

//Return all regions with organizaiton filter
Region.statics.GetRegions = async (organization?: string | ObjectId | Reactory.IOrganization ): Promise<Array<Reactory.IRegion>> => {  
  const { user, partner } = global;
  
  return []
  
};


Region.statics.AddRegion = async (organization?: string | ObjectId | Reactory.IOrganization ): Promise<Reactory.IRegion> => {  
  const { user, partner } = global;
  
  return {
    title: '',    
  }
};


const RegionModel = mongoose.model<Reactory.IRegionDocument>('Region', Region);

export default RegionModel;
