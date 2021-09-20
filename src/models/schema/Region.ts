import mongoose, { MongooseDocument } from 'mongoose';
import { ObjectId, ObjectID } from 'mongodb';
// import { Organization } from '@reactory/server-core/models';
import { Reactory } from '@reactory/server-core/types/reactory'
import { ReactoryApplicationsForm } from 'data/forms/core/dashboard';

const Region = new mongoose.Schema<Reactory.IRegion>({
  title: String,
  description: String,
  icon: String,
  // Regions with no organization will be considered public regions
  organization: {
    type: mongoose.Schema.Types.ObjectId,
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
Region.statics.GetRegions = async function GetRegions(context: Reactory.IReactoryContext): Promise<Array<Reactory.IRegion>> {
  const { user, partner } = context;

  // return await this.find({ organisation: organization.id });
  return await this.find();
};


Region.statics.AddRegion = async (organization: string | ObjectId, title: string, description: string, icon: string, locations: any[] = [], context: Reactory.IReactoryContext,): Promise<Reactory.IRegion> => {

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


const RegionModel = mongoose.model<Reactory.IRegionDocument>('Region', Region);

export default RegionModel;
