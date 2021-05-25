import { ObjectId } from 'mongodb';
import moment from 'moment';
import { LeadershipBrand, Scale, User, Survey } from '@reactory/server-core/models';
import logger from '../../../logging';

const leadershipBrandResolver = {
  Behaviour: {
    ordinal(obj) {
      return obj.ordinal || 99;
    },
  },
  LeadershipBrand: {
    id(obj) {
      return obj._id;
    },
    title(obj) {
      return obj.title ? obj.title : 'NOT SET';
    },
    description(obj) {
      return obj.description || 'NOT SET';
    },
    locked: async (brand, params, context) => {
      const count = await Survey.count({ leadershipBrand: brand._id }).then();
      if (count && count > 0) return true;

      return false;
    },
    label: (brand) => {
      return `${brand.title} - ${brand.version || "1.0.0"}`
    },
    qualities(brand) {
      if (brand.qualities) return brand.qualities;
      return [];
    },
    scale(brand) {
      if (brand.scale) return Scale.findById(brand.scale);
      return null;
    },
    createdBy: async (brand, params, context, info) => {
      return User.findById(brand.createdBy);
    },
    version: (brand) => {
      if (brand.version) return brand.version;
      return '1.0.0'
    },
    createdAt(obj) {
      return obj.createdAt;
    },
    updatedAt(obj) {
      return obj.updatedAt;
    },
  },
  Query: {
    MoresLeadershipBrands(obj, args, context, info) {
      logger.debug('Finding leadership brands for organization');
      return LeadershipBrand.find({ organization: ObjectId(args.organizationId) });
    },
    MoresLeadershipBrand(obj, args, context, info) {
      logger.debug('Getting leadership brand with id', args.id);
      return LeadershipBrand.findById(args.id);
    },
    allScales() {
      return Scale.find({});
    },
  },
  Mutation: {
    createBrandForOrganization(obj, args, context, info) {

      const leadershipBrand = new LeadershipBrand(args.brandInput || null);
      leadershipBrand.createdAt = moment().valueOf();
      leadershipBrand.updatedAt = moment().valueOf();

      return leadershipBrand.save();
    },
    updateBrandForOrganization(obj, args, context, info) {
      const { brandInput } = args;
      return LeadershipBrand.findOneAndUpdate({ _id: ObjectId(brandInput.id) }, { ...brandInput });
    },
  },
};

module.exports = leadershipBrandResolver;
