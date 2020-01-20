import lasecApi from '../api';
import moment from 'moment';
import logger from '../../../logging';
// import { Quote, QuoteReminder } from '../schema/Quote';
import lodash, { isArray, isNil } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';

// const product_sync = async (product_id, owner, source = null, map = true) => {

//   let _source = source;
//   let _productDoc = {};
//   const _predicate = {
//     'meta.reference': product_id,
//     'meta.owner': owner || global.partner.key,
//   }

//   const now = moment();

//   const _existing = await Quote.findOne(_predicate).then();

//   if(_source === null) {
//     _source = await lasecApi.Quotes.getByQuoteId(quote_id).then();
//   }

//   if(_source === null && _existing !== null){
//     _source = _existing.meta && _existing.meta.source ? _existing.meta.source : {};
//   }

//   if(map === true && _source) {
//     const _map = {
//       ...maps.meta,
//       ...maps.company,
//       ...maps.customer,
//       ...maps.status,
//       ...maps.totals,
//     };

//     _quoteDoc = om(_source, _map);
//   }

//   if(_source === null) return null;

//   try {
//     if(_existing) {
//         _existing.meta = {
//           owner,
//           reference: quote_id,
//           source: { ..._source },
//           lastSync: now.valueOf(),
//           nextSync: moment(now).add(quoteSyncTimeout,'minutes').valueOf(),
//           mustSync: true,
//         };
//         _existing.totals = _quoteDoc.totals;
//         _existing.modified = moment(_quoteDoc.modified || now).valueOf();
//         await _existing.save();
//         return _existing;
//     } else {
//       const _newQuote = new Quote({
//         ..._quoteDoc,
//         meta: {
//           owner,
//           reference: quote_id,
//           source: { ..._source },
//           lastSync: now.valueOf(),
//           nextSync: moment(now).add(quoteSyncTimeout,'minutes').valueOf(),
//           mustSync: true,
//         },
//         created: moment(_quoteDoc.created || now).valueOf(),
//         modified: moment(_quoteDoc.modified || now).valueOf(),
//       });

//       await _newQuote.addTimelineEntry({
//         when: now.valueOf(),
//         what: `Initial Sync with reactory trigger by ${global.user.fullName(true)}`,
//         who: global.user._id,
//         notes: `Initial import from Lasec360 API.`
//       });

//       return _newQuote;
//     }
//   } catch (createError) {
//     logger.error('Error while upserting remote document', createError);
//     throw createError;
//   }
// };

const getProducts = async (params) => {

  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('year'),
      periodEnd: moment().endOf('day')
    }
  }
  const cachekey = `PRODUCT_LIST_TEST`;

  let apiFilter = {};

  let _cachedResults = await getCacheItem(cachekey);
  if (_cachedResults) return _cachedResults;

  const productResult = await lasecApi.Products.list({ filter: apiFilter, pagination: { page_size: 10 } }).then();

  let ids = [];

  if (isArray(productResult.ids) === true) {
    ids = [...productResult.ids];
  }

  const pagePromises = [];

  if (productResult.pagination && productResult.pagination.num_pages > 1) {
    const max_pages = productResult.pagination.num_pages < 10 ? productResult.pagination.num_pages : 10;

    for (let pageIndex = productResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
      pagePromises.push(lasecApi.Products.list({ filter: apiFilter, pagination: { ...productResult.pagination, current_page: pageIndex } }));
    }
  }

  const pagedResults = await Promise.all(pagePromises).then();

  pagedResults.forEach((pagedResult) => {
    ids = [...ids, ...pagedResult.ids]
  });

  logger.debug(`Loading (${ids.length}) product ids`);

  const productDetails = await lasecApi.Products.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${productDetails.items.length}) Products from API`);
  let products = [...productDetails.items];

  // const productSyncResult = await Promise.all(products.map((product) => {
  //   return product_sync(product.id, global.partner.key, product, true);
  // })).then();

  // products = productSyncResult.map(doc => doc);

  // amq.raiseWorkFlowEvent('product.list.refresh', products, global.partner);


  products = products.map(prd => {
    return {
      id: prd.id,
      name: prd.name,
      code: prd.code,
      description: prd.description
    }
  });

  setCacheItem(cachekey, products, 60 * 10)

  logger.debug(`PRODUCT RESOLVER - PRODUCTS::  `, { products });

  return products;
}

const LasecGetProductQueryDetail = async (params) => {

  logger.debug(`PRODUCT RESOLVER - GET PRODUCT QUERY DETAIL::  ${JSON.stringify(params)}`);

  // const productResult = await lasecApi.Products.list({ filter: apiFilter, pagination: { page_size: 10 } }).then();
  const productResult = await lasecApi.Products.byId(id).then();

  logger.debug(`PRODUCT RESOLVER - GOT A PRODUCT::  ${JSON.stringify(productResult)}`);

  return {
    id: 12,
    name: 'name',
    code: 'code',
    description: 'description'
  }
}

const getProductClasses = async (params) => {

  return [
    {
      id: 0,
      name: 'Poduct Class 1'
    },
    {
      id: 0,
      name: 'Poduct Class 2'
    },
    {
      id: 0,
      name: 'Poduct Class 3'
    },
    {
      id: 0,
      name: 'Poduct Class 4'
    }
  ]
}

export default {
  Query: {
    LasecGetProductList: async (obj, args) => {
      return getProducts();
    },
    LasecGetProductQueryDetail: async (obj, args) => {
      return LasecGetProductQueryDetail();
    },
    LasecGetProductClassList: async (obj, args) => {
      return getProductClasses();
    },
  }
};
