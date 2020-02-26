import lasecApi from '../api';
import moment from 'moment';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import LasecDatabase from '@reactory/server-modules/lasec/database';
import ApiError from '@reactory/server-core/exceptions';
import logger from '../../../logging';
import lodash, { isArray, isNil, isString } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';
import { clientFor, execql } from '@reactory/server-core/graph/client';
import gql from 'graphql-tag';
import { ENVIRONMENT } from 'types/constants';
import emails from '@reactory/server-core/emails';
import Hash from '@reactory/server-core/utils/hash';
import PageTemplateConfigForm from 'data/forms/boxcommerce/pageTemplateConfig';


const WarehouseIds = {
  "10": {
    id: 10,
    title: 'Cape Town'
  },
  "20": {
    id: 20,
    title: 'Gauteng'
  },
  "21": {
    id: 21,
    title: 'Edu Gauteng'
  },
  "30": {
    id: 30,
    title: 'Pine Town'
  },
  "31": {
    id: 31,
    title: 'Edu Pine Town'
  }
};

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
  const { product = "", paging = { page: 1, pageSize: 10 },  iter = 0  } = params;
  // ADITIONAL PARAMS : Product Name
  logger.debug(`Getting Products For Using Query ${product}`, {paging});

  
  
  let pagingResult = {
    total: 0,
    page: paging.page || 1,
    hasNext: false,
    pageSize: paging.pageSize || 10
  };

  if(isString(product) === false || product.length < 3) return {
    paging: pagingResult,
    products: []
  };

  let filter = { "any_field": product };

  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('year'),
      periodEnd: moment().endOf('day')
    }
  }
  const cachekey = Hash(`product_list_${product}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}`.toLowerCase());

   

  let _cachedResults = await getCacheItem(cachekey);
  if (_cachedResults) {
    
    if(iter === 0) {
      //client request and we have a cache so we fire off the next fetch anyway
      execql(`query LasecGetProductList($product: String!, $paging: PagingRequest, $iter: Int){
        LasecGetProductList(product: $product, paging: $paging, iter: $iter){
          paging {
            total
            page
            hasNext
            pageSize
          }
          products {
            id           
          }        
        }
      }`, {product, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1}).then();
    }

    return _cachedResults;
  }

  const productResult = await lasecApi.Products.list({ filter, pagination: { current_page: paging.page, page_size: paging.pageSize } }).then();

  let ids = [];

  if (isArray(productResult.ids) === true) {
    ids = [...productResult.ids];
  }

  //const pagePromises = [];

  if (productResult.pagination && productResult.pagination.num_pages > 1) {
    pagingResult.total = productResult.pagination.num_items;
    pagingResult.pageSize = productResult.pagination.page_size || 10;
    pagingResult.hasNext = productResult.pagination.has_next_page === true;
    pagingResult.page = productResult.pagination.current_page || 1;
    //const max_pages = 2; //productResult.pagination.num_pages < 10 ? productResult.pagination.num_pages : 10;

    //for (let pageIndex = productResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
    //  pagePromises.push(lasecApi.Products.list({ filter, pagination: { ...productResult.pagination, current_page: pageIndex } }));
    //}
  }

  //const pagedResults = await Promise.all(pagePromises).then();

  //pagedResults.forEach((pagedResult) => {
  //  ids = [...ids, ...pagedResult.ids]
  //});

  // logger.debug(`Loading (${ids.length}) product ids`);

  const productDetails = await lasecApi.Products.list({ filter: { ids: ids }, pagination: { page_size: paging.pageSize }  });
  // logger.debug(`Fetched Expanded View for (${productDetails.items.length}) Products from API`);
  let products = [...productDetails.items];

  logger.debug('PRODUCT RESOLVER - PRODUCTS::', products.slice(0, 10));

  products = products.map((prd) => {
    return {
      id: prd.id,
      name: prd.name,
      code: prd.code,
      description: prd.description,
      qtyAvailable: prd.QtyAvailable,
      qtyOnHand: prd.QtyOnHand,
      qtyOnOrder: prd.QtyOnOrder,
      unitOfMeasure: prd.pack_size,
      price: prd.list_price_cents,
      priceAdditionalInfo: prd.price_is_expired ? 'EXPIRED' : (prd.on_special ? 'ON_SPECIAL' : ''),
      image: prd.image_url,
      onSyspro: prd.is_in_syspro,
      landedPrice: prd.cost_price_cents,
      wh10CostPrice: prd.actual_cost_wh10,
      threeMonthAvePrice: prd.three_month_ave_price_cents,
      listPrice: prd.list_price_cents,
      buyer: prd.buyer,
      planner: prd.planner,
      isHazardous: prd.is_hazardous ? 'Yes' : 'No',
      siteEvaluationRequired: prd.site_evaluation_required ? 'Yes' : 'No',
      packedLength: prd.packed_length,
      packedWidth: prd.packed_width,
      packedHeight: prd.packed_height,
      packedVolume: prd.packed_volume,
      packedWeight: prd.packed_weight,
    };
  });

  let result = {
    paging: pagingResult,
    products,
  };

  if(result.paging.pageSize >= 10 && result.paging.hasNext === true) {
    // cache the next result

    // create segments for page size 5 and 10
    if(result.paging.pageSize === 20) {
      const cachekeys_10 = `product_list_${product}_page_${paging.page || 1}_page_size_10`.toLowerCase();
      setCacheItem(cachekeys_10, { paging: {...result.paging, pageSize: 10, hasNext: true }, products: lodash.take(result.products, 10) } );
    }
    
    const cachekeys_5 = `product_list_${product}_page_${paging.page || 1}_page_size_5`.toLowerCase();
    setCacheItem(cachekeys_5, { paging: {...result.paging, pageSize: 5, hasNext: true }, products: lodash.take(result.products, 5) } );       
  }

  if(result.paging.hasNext === true && iter === 0) {    
    execql(`query LasecGetProductList($product: String!, $paging: PagingRequest, $iter: Int){
      LasecGetProductList(product: $product, paging: $paging, iter: $iter){
        paging {
          total
          page
          hasNext
          pageSize
        }
        products {
          id           
        }        
      }
    }`, {product, paging: { page: paging.page + 1, pageSize: paging.pageSize }, iter: 1}).then();        
  } 
    
  setCacheItem(cachekey, result, 60);

  return result;  
}

const getWarehouseStockLevels = async (params) => {
  logger.debug('Getting Warehouse Stock Levels For Product', {params});
  
  const product_id = params.productId;
  const apiFilter = { product_id };

  const cachekey = Hash(`product_warehouse_stock_product_id_${product_id}`.toLowerCase());

  const cached = await getCacheItem(cachekey).then();
  if(cached) return cached;

  const warehouseIds = await lasecApi.Products.warehouse_stock({
    filter: apiFilter,
    format: {
      ids_only: true,
    },
    ordering: {},
    pagination: {
      current_page: 1,
      page_size: 25,
    },
  }).then();

  const warehouseStock = await lasecApi.Products.warehouse_stock({
    filter: {
      ids: warehouseIds.ids,
      pagination: { enabled: false },
    },
  }).then();

  let totalOnHand = 0;
  let totalOnBO = 0;
  let totalAvailable = 0;

  logger.debug(`Loaded Warehouse Stock For Product ${params.product_id}`, warehouseStock);

  const stock = warehouseStock.items.map((warehouse) => {

    totalAvailable += warehouse.QtyAvailable;
    totalOnHand += warehouse.QtyOnHand;
    totalOnBO += warehouse.QtyOnBackOrder;
    //const warehouseDetails = await lasecApi.Products.warehouse({ filter: { ids: [warehouse.warehouse_id], pagination: { enabled: false } } }).then();
    //const detail = warehouseDetails.items[0];

    return {
      name: WarehouseIds[warehouse.warehouse_id].title,
      qtyAvailable: warehouse.QtyAvailable,
      qtyOnHand: warehouse.QtyOnHand,
      qtyOnBO: warehouse.QtyOnBackOrder,
    };
  });



  stock.push({    
    name: 'Totals',
    qtyAvailable: totalAvailable,
    qtyOnHand: totalOnHand,
    qtyOnBO: totalOnBO,
  });

  setCacheItem(cachekey, {
    id: product_id,
    stock,
    totals: {
      qtyAvailable: totalAvailable,
      qtyOnHand: totalOnHand,
      qtyOnBO: totalOnBO,
    },
  }, 60 * 5);

  return {
    id: product_id,
    stock,
    totals: {
      qtyAvailable: totalAvailable,
      qtyOnHand: totalOnHand,
      qtyOnBO: totalOnBO,
    },
  };
}

const LasecGetProductQueryDetail = async ({ productId }) => {
  const { user } = global;

  const productResult = await lasecApi.Products.byId({ filter: { ids: [productId] } }).then();
  if (!productResult.items || productResult.items.length == 0)
    throw new ApiError(`Could not find a matching product for: ${productId}`);
  const product = productResult.items[0];

  return {
    id: productId,
    productCode: product.code,
    productName: product.name,
    productDescription: product.description,
    from: user.email,
    buyer: product.buyer,
    buyerEmail: product.buyer_email,
    subject: `Product query regarding: ${product.name} (${product.code})`,
    message: `
    Product query from ${user.firstName} ${user.lastName}, regards the following product:
    ${product.name} (${product.code})
    `
  }
}

const getProductClasses = async (params) => {
  return await LasecDatabase.Read.LasecGetProductClasses({
    context: {
      connectionId: 'mysql.lasec360',
      schema: 'lasec360'
    }
  }).then();
};

const sendProductQuery = async (params) => {
  const { buyerEmail, subject, message } = params;
  const { user } = global;
  let mailResponse = { success: true, message: `Product Query sent successfully!` };

  if (user.getAuthentication("microsoft") !== null) {
    await clientFor(user, global.partner).mutate({
      mutation: gql`
        mutation sendMail($message: SendMailInput!) {
          sendMail(message: $message) {
            Successful
            Message
          }
        }`, variables: {
        "message": {
          "id": `${user._id.toString()}`,
          "via": "microsoft",
          "subject": subject,
          "content": message,
          "recipients": [buyerEmail],
          'contentType': 'html'
        }
      }
    })
      .then()
      .catch(error => {
        logger.debug(`SENDING PRODUCT QUERY FAILED - ERROR:: ${error}`);
        mailResponse.success = false;
        mailResponse.message = `Product Query Failed: ${error}`
      });

    return mailResponse;

  } else {
    const mailParams = {
      to: buyerEmail,
      from: user.email,
      subject,
      message
    }
    const response = await emails.sendProductQueryEmail(mailParams);
    if (!response.success) {
      logger.debug(`SENDING PRODUCT QUERY FAILED - ERROR:: ${error.message}`);
      mailResponse.success = false;
      mailResponse.message = `Product Query Failed: ${response.message}`
    }

    return mailResponse;
  }
}

export default {
  Query: {
    LasecGetProductList: async (obj, args) => {
      return getProducts(args);
    },
    LasecGetProductQueryDetail: async (obj, args) => {
      return LasecGetProductQueryDetail(args);
    },
    LasecGetProductClassList: async (obj, args) => {
      return getProductClasses();
    },
    LasecGetWarehouseStockLevels: async (obj, args) => {
      return getWarehouseStockLevels(args);
    },
  },
  Mutation: {
    LasecSendProductQuery: async (obj, args) => {
      return sendProductQuery(args);
    }
  }
};
