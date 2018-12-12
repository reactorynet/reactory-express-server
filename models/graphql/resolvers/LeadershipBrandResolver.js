import { ObjectId } from 'mongodb';
import moment from 'moment';
import { LeadershipBrand, Scale } from '../../../models';
// import { migrateOrganization } from '../../../application/admin/Organization';
import logger from '../../../logging';

const leadershipBrandResolver = {
  LeadershipBrand: {
    id(obj) {
      return obj.id;
    },
    title(obj) {
      return obj.title || 'NOT SET';
    },
    description(obj) {
      return obj.description || 'NOT SET';
    },
    qualities(brand) {
      if (brand.qualities) return brand.qualities;
      return [];
    },
    scale(brand) {
      if (brand.scale) return Scale.findById(brand.scale);
      return null;
    },
    createdAt(obj) {
      return obj.createdAt || moment().unix();
    },
    updatedAt(obj) {
      return obj.updatedAt || moment().unix();
    },
  },
  Query: {
    brandListForOrganization(obj, args, context, info) {
      logger.debug('Finding leadership brands for organization');
      return LeadershipBrand.find({ organization: ObjectId(args.organizationId) });
    },
    brandWithId(obj, args, context, info) {
      logger.debug('Getting leadership brand with id', args.brandId);
      return LeadershipBrand.findById(args.brandId);
    },
    allScales() {
      return Scale.find({});
    },
  },
  Mutation: {
    createBrandForOrganization(obj, args, context, info) {
      console.log('createBrandForOrganization()', {
        obj, args, context, info,
      });

      const leadershipBrand = new LeadershipBrand(args.brandInput || null);
      leadershipBrand.createdAt = moment().valueOf();
      leadershipBrand.updatedAt = moment().valueOf();

      return leadershipBrand.save();
    },
    updateBrandForOrganization(obj, args, context, info) {
      console.log('updateBrandForOrganization', {
        obj, args, context, info,
      });
      const { brandInput } = args;
      return LeadershipBrand.findOneAndUpdate({ _id: ObjectId(brandInput.id) }, { ...brandInput });
    },
  },
};

module.exports = leadershipBrandResolver;
