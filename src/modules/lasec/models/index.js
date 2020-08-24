import LasecCache from './LasecCache';
import moment from 'moment';
import { addCatchUndefinedToSchema } from 'graphql-tools';

export const getCacheItem = async (cacheKey) => {
  let cached = await LasecCache.findOne({ key: cacheKey, partner: global.partner._id }).then();

  if(cached !== null && typeof cached === 'object' && cached.ttl) {
    if(moment(cached.ttl).isBefore(moment(), 'milliseconds')) {
      cached.remove();
      return null;
    } else {
      return cached.item;
    }
  }

  return null;
};

/**
 * 
 * @param {*} cacheKey 
 * @param {*} item 
 * @param {*} ttl - number of seconds
 */
export const setCacheItem = async (cacheKey, item, ttl = 60) => {
  let cached = await LasecCache.findOne({ key: cacheKey, partner: global.partner._id }).then();

  if(cached) {
    cached.item = item;
    cached.ttl = (new Date().valueOf()) + ((ttl || 60) * 1000);

    LasecCache.updateOne({ partner: global.partner._id,
      key: cacheKey }, cached).then();

    return cached;
  } else {

    return new LasecCache({
      partner: global.partner._id,
      key: cacheKey,
      item,
      ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
    }).save().then();

  }   
};


export const clearCache = () => {
    LasecCache.clean();
}