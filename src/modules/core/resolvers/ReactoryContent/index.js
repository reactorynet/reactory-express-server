
import lodash from 'lodash';
import { ObjectId } from 'mongodb';
import om from 'object-mapper';
import { Content } from '../../../../models/index';
// import ApiError, { RecordNotFoundError } from '../../../exceptions';
import logger from '../../../../logging';

export default {
  Content: {
    id: (content) => {
      return content._id.toString();
    }
  },
  Query: {
    ReactoryGetContentBySlug: async (parent, params) => {
      const { slug } = params;
      logger.debug(`Fetching Content For ${slug}`, parent);
      const result = await Content.findOne({ slug }).then();
      logger.debug(`Fetching Content Result: ${result}`);
      if (lodash.isArray(result) === true && result.length === 1) {
        return result[0];
      }

      return result;
    },
    ReactoryGetContentByTags(parent, tags) {
      logger.debug('Getting Reactory Content By Tags', tags);
      return [];
    },
    ReactoryGetContentById(parent, id) {
      logger.debug('Getting Reactory Content By Id', id);
      return [];
    },
  },
  Mutation: {
    ReactoryCreateContent: async (parent, args) => {
      const { createInput } = args;
      try {
        logger.debug('Reactory Create Content Starting: ', args);
        return await Content.findOneAndUpdate({ slug: args.createInput.slug }, {
          ...createInput,
          createdAt: new Date().valueOf(),
          updatedAt: new Date().valueOf(),
          createdBy: global.user._id,
          updatedBy: global.user._id
        }, { upsert: true }).then();
      } catch (error) {
        logger.debug('Reactory Create Content Error: ', error);
      }
    }
  }
};
