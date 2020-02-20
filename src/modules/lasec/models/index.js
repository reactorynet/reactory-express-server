import LasecCache from './LasecCache';
import moment from 'moment';

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
export const setCacheItem = async (cacheKey, item, ttl) => {
  return new LasecCache({
    partner: global.partner._id,
    key: cacheKey,
    item,
    ttl: (new Date().valueOf()) + ((ttl || 60) * 1000),
  }).save().then();
};


export const clearCache = () => {
    LasecCache.clean();
}