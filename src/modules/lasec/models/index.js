import LasecCache from './LasecCache';
import moment from 'moment';
import { addCatchUndefinedToSchema } from 'graphql-tools';
import logger from '@reactory/server-core/logging';

const null_fetch = () => {
  return new Promise((resolve) => { resolve(null) });
}

export const getCacheItem = async (cacheKey, fetchpromise, ttl ) => {
  let cached = await LasecCache.findOne({ key: cacheKey, partner: global.partner._id }).then();

  if(cached !== null && typeof cached === 'object' && cached.ttl) {
    if(moment(cached.ttl).isBefore(moment(), 'milliseconds')) {
      cached.remove();
      return null;
    } else {
      return cached.item;
    }
  }

  if (fetchpromise && typeof fetchpromise === 'function') {
    try {
      const _fetch_result = await fetchpromise().then()

      if (_fetch_result !== null && _fetch_result !== undefined) setCacheItem(cacheKey, _fetch_result, ttl);

      return _fetch_result;

    } catch (error) {
      logger.error(`fetch promise failed`, error)
      throw error;
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