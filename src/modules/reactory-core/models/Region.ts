import mongoose from 'mongoose';
import { ObjectId } from 'mongodb';
import Reactory from '@reactory/reactory-core';

const Region = new mongoose.Schema<Reactory.Models.IRegion>({
  title: String,
  key: {
    type: String,
    default: ()=>{
      let that: Reactory.Models.IRegionDocument = this;
      if(that !==null && that !== undefined) {              
        let default_key = `${that.key || `${that.title.toLowerCase()}::${that.populated('organization') || that.organization}`}`;
        return default_key;            
      }

      return null
    }
  },
  description: String,
  icon: String,
  // Regions with no organization will be considered public regions
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
  },
  locations: [
    {
      title: String,
      country: String,
      province: String,
      district: String,
      city: String
    }
  ],
  deleted: {
    type: Boolean,
    default: false,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created: {
    type: Number,
    default: new Date().valueOf()
  }
});

//Return all regions with organizaiton filter
// Region.statics.GetRegions = async (organization?: string | ObjectId | Reactory.IOrganization ): Promise<Array<Reactory.IRegion>> => {
Region.statics.GetRegions = async function GetRegions(context: Reactory.Server.IReactoryContext): Promise<Array<Reactory.IRegion>> {
  const { user, partner } = context;

  // return await this.find({ organisation: organization.id });
  return await this.find();
};


Region.statics.AddRegion = async (organization: string | ObjectId, title: string, description: string, icon: string, locations: any[] = [], context: Reactory.Server.IReactoryContext,): Promise<Reactory.IRegion> => {

  let input: any = {
    organization,
    locations,
    title,
    description,
    icon,
    createdBy: context.user._id
  }

  if (organization) {
    input.organization = new ObjectId(organization);
    input.locations = locations;
  }

  const region = new RegionModel(input);
  await region.save().then();
  return region;
};


const RegionModel = mongoose.model<Reactory.Models.IRegionDocument>('Region', Region, 'reactory_regions');

export default RegionModel;
