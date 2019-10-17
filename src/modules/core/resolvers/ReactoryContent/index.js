
import lodash from 'lodash';
import { ObjectId } from 'mongodb';
import om from 'object-mapper';
import moment, { Moment } from 'moment';

import logger from '../../../../logging';



export default {
  Query: {
    ReactoryGetContentBySlug: async (parent, params)=>{
      const { slug } = params;
      logger.debug(`Fetching Content For ${slug}`, parent);

      return {
        id: new ObjectId(),
        slug,
        topics: [],
        title: 'My title',
        content: '<p>Hallo Content</p>',
        createdAt: new Date().valueOf(),
        updatedAt: new Date().valueOf(),
        createdBy: global.user,
        updatedBy: global.user,
        published: true,
      };
    },
    ReactoryGetContentByTags(parent, tags) {
      logger.debug('Getting Reactory Content By Tags', tags);
      return [  ];
    },
    ReactoryGetContentById(parent, id) {
      logger.debug('Getting Reactory Content By Id', id);
      return [  ];
    }, 
  },
  Mutation: {
    
  }
};