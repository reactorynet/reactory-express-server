import { IndvidualLeadership360Template } from './Leadership360Template';
import { LeadershipBrand } from '@reactory/server-modules/towerstone/models';
import { Organization } from '@reactory/server-core/models';
import { ObjectId } from 'mongodb';
import { MongooseDocument } from 'mongoose';

const factory = async ( organizationId: string |ObjectId, scaleId: string |ObjectId  ) : Promise<MongooseDocument> => {

  const generatedBrand = new LeadershipBrand(IndvidualLeadership360Template(organizationId, scaleId));
  await generatedBrand.save().then()

  return generatedBrand;
};

export default factory;