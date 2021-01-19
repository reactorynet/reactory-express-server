import lasecApi from '../api';
import moment from 'moment';
import unfluff from 'unfluff';
import om from 'object-mapper';
import { queryAsync as mysql } from '@reactory/server-core/database/mysql';
import LasecDatabase from '@reactory/server-modules/lasec/database';
import ApiError from '@reactory/server-core/exceptions';
import logger from '../../../logging';
import lodash, { isArray, isNil, isString } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';
import { clientFor, execql } from '@reactory/server-core/graph/client';
import gql from 'graphql-tag';
import emails from '@reactory/server-core/emails';
import Hash from '@reactory/server-core/utils/hash';
import PageTemplateConfigForm from 'data/forms/boxcommerce/pageTemplateConfig';
import {  getLoggedIn360User } from './Helpers';


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


  try {
    const { product = "", paging = { page: 1, pageSize: 10 }, iter = 0 } = params;
    // ADITIONAL PARAMS : Product Name
    logger.debug(`Getting Products For Using Query ${product}`, { paging });


    let pagingResult = {
      total: 0,
      page: paging.page || 1,
      hasNext: false,
      pageSize: paging.pageSize || 10
    };

    if (isString(product) === false || product.length < 3) return {
      paging: pagingResult,
      product,
      products: []
    };

    let filter = { "any_field": product };
    // let filter = { "any_field123": product }; // REMOVE THIS - TRYING TO BREAK CALL

    const cachekey = Hash(`product_list_${product}_page_${paging.page || 1}_page_size_${paging.pageSize || 10}`.toLowerCase());

    const productResult = await lasecApi.Products.list({ filter, pagination: { current_page: paging.page, page_size: paging.pageSize } }).then();

    let ids = [];

    if (isArray(productResult.ids) === true) {
      ids = [...productResult.ids];
    }

    if (productResult.pagination && productResult.pagination.num_pages > 1) {
      pagingResult.total = productResult.pagination.num_items;
      pagingResult.pageSize = productResult.pagination.page_size || 10;
      pagingResult.hasNext = productResult.pagination.has_next_page === true;
      pagingResult.page = productResult.pagination.current_page || 1;
    }

    const productDetails = await lasecApi.Products.list({ filter: { ids: ids }, pagination: { page_size: paging.pageSize } });
    let products = [...productDetails.items];

    const loggedInUser = await getLoggedIn360User().then();
    const currencies = loggedInUser && loggedInUser.user_type === 'lasec_international' ? ['USD', 'ZAR'] : ['ZAR'];

    products = products.map((product) => {
      let productResult = {
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        qtyAvailable: product.QtyAvailable,
        qtyOnHand: product.QtyOnHand,
        qtyOnOrder: product.QtyOnOrder,
        unitOfMeasure: product.pack_size,
        price: product.list_price_cents,
        priceAdditionalInfo: product.price_is_expired ? 'EXPIRED' : (product.on_special ? 'ON_SPECIAL' : ''),
        image: product.image_url,
        onSyspro: product.is_in_syspro,
        landedPrice: product.cost_price_cents,
        wh10CostPrice: product.actual_cost_wh10,
        threeMonthAvePrice: product.three_month_ave_price_cents,
        listPrice: product.list_price_cents,
        buyer: product.buyer,
        buyerEmail: product.buyer_email || 'allbuyers@lasec.com',
        planner: product.planner,
        plannerEmail: product.planner_email || 'allplanners@lasec.com',
        isHazardous: product.is_hazardous ? 'Yes' : 'No',
        siteEvaluationRequired: product.site_evaluation_required ? 'Yes' : 'No',
        packedLength: product.packed_length,
        packedWidth: product.packed_width,
        packedHeight: product.packed_height,
        packedVolume: product.packed_volume,
        packedWeight: product.packed_weight,
        numberOfSalesOrders: product.number_of_salesorders || 0, // THESE FIELDS DO NOT EXIST - DAWID IS IMPLEMENTING
        numberOfPurchaseOrders: product.number_of_purchaseorders || 0, // THESE FIELDS DO NOT EXIST - DAWID IS IMPLEMENTING
        productClass: product.class,
        tariffCode: product.tariff_code,
        leadTime: product.lead_time,
        validPriceUntil: product.valid_price_until ? moment(product.valid_price_until).format('DD MMM YYYY') : '',
        lastUpdated: product.last_updated,
        lastUpdatedBy: product.last_updated_by,
        lastOrdered: product.last_ordered ? moment(product.last_ordered).format('DD MMM YYYY') : '',
        lastReceived: product.last_received ? moment(product.last_received).format('DD MMM YYYY') : '',
        supplyCurrency: product.supplier_currency,
        listCurrency: product.list_currency,
        onSpecial: product.on_special,
        specialPrice: product.special_price_cents,
        currencyCode: product.currency_code,
        availableCurrencies: currencies,
      };


      if (product.currency_pricing && Object.keys(product.currency_pricing).length > 0) {
        productResult.productPricing = Object.keys(product.currency_pricing).map((key) => product.currency_pricing[key]);
      }

      return productResult;
    });

    products = products.map(async (prod) => {
      const productCostingsDetails = await lasecApi.Products.costings({ filter: { ids: [prod.id] }, pagination: { page_size: paging.pageSize } }).then();
      const costing = productCostingsDetails.items[0];
      return {
        ...prod,
        supplier: costing.supplier_name,
        model: costing.model,
        shipmentSize: costing.shipment_size,
        exWorksFactor: costing.exworks_factor,

        freightFactor: costing.freight_factor,
        clearingFactor: costing.clearing_factor,
        actualCostwh10: costing.actual_cost_wh10,
        actualCostwh20: costing.actual_cost_wh20,
        actualCostwh21: costing.actual_cost_wh21,
        actualCostwh31: costing.actual_cost_wh31,
        supplierUnitPrice: costing.supplier_unit_price_cents,
        percDiscount: costing.percentage_discount,
        discountPrice: costing.discounted_price_cents,
        freightPrice: costing.freight_price_cents,
        exWorksPrice: costing.exworks_price_cents,
        craftingFOC: costing.crating_foc_cents,
        netFOB: costing.net_fob,
        percDuty: costing.percentage_duty,
        clearance: costing.clearance_cost_cents,
        landedCost: costing.landed_cost_cents,
        markup: costing.markup,
        sellingPrice: costing.markup,
      }
    });

    let result = {
      paging: pagingResult,
      product,
      products,
    };

    logger.debug(`TO RETURN :: ${JSON.stringify(result)}`);

    return result;
  } catch (productListError) {
    logger.error(`Error getting product list ${productListError.message}`, productListError);
    throw new ApiError("Could not get data from remote API", { error: productListError });
  }


}

export const getProductById = async (params, load_costings = true) => {
  const { productId } = params;

  const productResult = await lasecApi.Products.list({ filter: { ids: [productId] }, pagination: { page_size: 5 } }).then();

  if (productResult && productResult.items) {

    if (productResult.items.length === 1) {
      let product = productResult.items[0]


      let costingResults = null;
      let costing = null;
      let product_costing = {};

      if (load_costings === true) {

        costingResults = await lasecApi.Products.costings({ filter: { ids: [productId] }, pagination: { page_size: 5 } }).then();
        costing = costingResults.items[0] || {};

        product_costing = {
          supplier: costing.supplier_name,
          model: costing.model,
          shipmentSize: costing.shipment_size,
          exWorksFactor: costing.exworks_factor,
          freightFactor: costing.freight_factor,
          clearingFactor: costing.clearing_factor,
          actualCostwh10: costing.actual_cost_wh10,
          actualCostwh20: costing.actual_cost_wh20,
          actualCostwh21: costing.actual_cost_wh21,
          actualCostwh31: costing.actual_cost_wh31,
          supplierUnitPrice: costing.supplier_unit_price_cents,
          percDiscount: costing.percentage_discount,
          discountPrice: costing.discounted_price_cents,
          freightPrice: costing.freight_price_cents,
          exWorksPrice: costing.exworks_price_cents,
          craftingFOC: costing.crating_foc_cents,
          netFOB: costing.net_fob,
          percDuty: costing.percentage_duty,
          clearance: costing.clearance_cost_cents,
          landedCost: costing.landed_cost_cents,
          markup: costing.markup,
          sellingPrice: costing.selling_price_cents,
        };

      }



      product = {
        id: product.id,
        name: product.name,
        code: product.code,
        description: product.description,
        qtyAvailable: product.QtyAvailable,
        qtyOnHand: product.QtyOnHand,
        qtyOnOrder: product.QtyOnOrder,
        unitOfMeasure: product.pack_size,
        price: product.list_price_cents,
        priceAdditionalInfo: product.price_is_expired ? 'EXPIRED' : (product.on_special ? 'ON_SPECIAL' : ''),
        image: product.image_url,
        onSyspro: product.is_in_syspro,
        landedPrice: product.cost_price_cents,
        wh10CostPrice: product.actual_cost_wh10,
        threeMonthAvePrice: product.three_month_ave_price_cents,
        listPrice: product.list_price_cents,
        buyer: product.buyer,
        buyerEmail: product.buyer_email || 'allbuyers@lasec.com',
        planner: product.planner,
        plannerEmail: product.planner_email || 'allplanners@lasec.com',
        isHazardous: product.is_hazardous ? 'Yes' : 'No',
        siteEvaluationRequired: product.site_evaluation_required ? 'Yes' : 'No',
        packedLength: product.packed_length,
        packedWidth: product.packed_width,
        packedHeight: product.packed_height,
        packedVolume: product.packed_volume,
        packedWeight: product.packed_weight,
        numberOfSalesOrders: product.no_of_salesorder || 0,
        productClass: product.class,
        tariffCode: product.tariff_code,
        leadTime: product.lead_time,
        validPriceUntil: product.valid_price_until ? moment(product.valid_price_until).format('DD MMM YYYY') : '',
        lastUpdated: product.last_updated,
        lastUpdatedBy: product.last_updated_by,
        lastOrdered: product.last_ordered ? moment(product.last_ordered).format('DD MMM YYYY') : '',
        lastReceived: product.last_received ? moment(product.last_received).format('DD MMM YYYY') : '',
        supplyCurrency: product.supplier_currency,
        listCurrency: product.list_currency,
        onSpecial: product.on_special,
        specialPrice: product.special_price_cents,
        currencyCode: product.currency_code,

        ...product_costing,

        notes: ''
      };

      if (product.currency_pricing && Object.keys(product.currency_pricing).length > 0) {
        productResult.productPricing = Object.keys(product.currency_pricing).map((key) => product.currency_pricing[key]);
      }

      return product;
    }
  }

  return null;
}

const getProductTenders = async (product = null, params) => {
  logger.debug(`Getting Product Tenders For Product ${product.id || params.product_id}`, { product, params });

  const { ids } = await lasecApi.Products.tenders({
    filter: { product_id: product.id || params.product_id },
    format: { ids_only: true },
    ordering: {},
    pagination: { current_page: 1, page_size: 25 }
  }).then();

  const { items } = await lasecApi.Products.tenders({
    filter: { ids },
    pagination: { enabled: false }
  }).then()

  if (items && isArray(items) === true) {
    return items;
  } else {
    return []
  }
}

const getProductContracts = async (product = null, params) => {

  logger.debug(`Getting Product Contracts For Product ${product.id || params.product_id}`, { product, params });


  const { ids } = await lasecApi.Products.contracts({
    filter: { product_id: product.id || params.product_id },
    format: { ids_only: true },
    ordering: {},
    pagination: { current_page: 1, page_size: 25 }
  }).then();

  const { items } = await lasecApi.Products.contracts({
    filter: { ids },
    pagination: { enabled: false }
  }).then()

  if (items && isArray(items) === true) {
    return items;
  } else {
    return []
  }
}

const getWarehouseStockLevels = async (params) => {
  logger.debug('Getting Warehouse Stock Levels For Product', { params });

  const product_id = params.productId;
  const apiFilter = { product_id };

  const cachekey = Hash(`product_warehouse_stock_product_id_${product_id}`.toLowerCase());

  const cached = await getCacheItem(cachekey).then();
  if (cached) return cached;

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
  let totalAllocated = 0; // not in use
  let totalOnOrder = 0; // no in use
  let totalOnBO = 0;
  let totalInTransit = 0;
  let totalAvailable = 0;
  let totalOnSalesOrder = 0;
  let totalOnPurchaseOrder = 0;

  logger.debug(`Loaded Warehouse Stock For Product ${params.product_id}`, warehouseStock);

  const stock = warehouseStock.items.map((warehouse) => {

    totalOnHand += warehouse.QtyOnHand;
    totalAllocated += warehouse.QtyAllocated;
    totalOnOrder += warehouse.QtyOnOrder;
    totalOnBO += warehouse.QtyOnBackOrder;
    totalInTransit += warehouse.QtyInTransit;
    totalAvailable += warehouse.QtyAvailable;
    totalOnSalesOrder += warehouse.QtyOnSalesOrder;
    totalOnPurchaseOrder = warehouse.QtyOnPurchaseOrder ? totalOnPurchaseOrder + warehouse.QtyOnPurchaseOrder : totalOnPurchaseOrder + 0;

    return {
      name: WarehouseIds[warehouse.warehouse_id].title,
      warehouseId: warehouse.warehouse_id,
      qtyOnHand: warehouse.QtyOnHand,
      qtyAllocated: warehouse.QtyAllocated,
      qtyOnOrder: warehouse.QtyOnOrder,
      qtyOnBO: warehouse.QtyOnBackOrder,
      qtyInTransit: warehouse.QtyInTransit,
      qtyAvailable: warehouse.QtyAvailable,
      qtyOnSalesOrder: warehouse.QtyOnSalesOrder,
      qtyOnPurchaseOrder: warehouse.QtyOnPurchaseOrder ? warehouse.QtyOnPurchaseOrder : 0,
    };
  });

  stock.push({
    name: 'Totals',
    qtyOnHand: totalOnHand,
    qtyAllocated: totalAllocated,
    qtyOnOrder: totalOnOrder,
    qtyOnBO: totalOnBO,
    qtyInTransit: totalInTransit,
    qtyAvailable: totalAvailable,
    qtyOnSalesOrder: totalOnSalesOrder,
    qtyOnPurchaseOrder: totalOnPurchaseOrder,
  });

  setCacheItem(cachekey, {
    id: product_id,
    stock,
    totals: {
      qtyOnHand: totalOnHand,
      qtyAllocated: totalAllocated,
      qtyOnOrder: totalOnOrder,
      qtyOnBO: totalOnBO,
      qtyInTransit: totalInTransit,
      qtyAvailable: totalAvailable,
      qtyOnSalesOrder: totalOnSalesOrder,
      qtyOnPurchaseOrder: totalOnPurchaseOrder,
    },
  }, 60 * 5);

  return {
    id: product_id,
    stock,
    totals: {
      qtyOnHand: totalOnHand,
      qtyAllocated: totalAllocated,
      qtyOnOrder: totalOnOrder,
      qtyOnBO: totalOnBO,
      qtyInTransit: totalInTransit,
      qtyAvailable: totalAvailable,
      qtyOnSalesOrder: totalOnSalesOrder,
      qtyOnPurchaseOrder: totalOnPurchaseOrder,
    },
  };
}

const LasecGetProductQueryDetail = async ({ productId, context = 'buyer' }) => {
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
    to: product[context],
    toEmail: product[`${context}_email`],
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
  const { toEmail, subject, message } = params;
  const { user } = global;
  let mailResponse = { success: true, message: `Product Query sent successfully!` };

  logger.debug(`Sending a product inquiry ${JSON.stringify({
    toEmail,
    subject,
    message
  })}`);

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
          "recipients": [toEmail],
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
  Product: {
    contracts: async (product, args) => {
      logger.debug(`PRODUCT resolving contracts for product`, { product, args });
      return getProductContracts(product, args)
    },
    tenders: async (product, args) => {
      logger.debug(`PRODUCT resolving renders for product`, { product, args });
      return getProductTenders(product, args)
    },
    notes: async (product, args) => {
      try {

        const productNotes = await mysql(`SELECT notes FROM Product WHERE productid = ${product.id};`, 'mysql.lasec360').then()
        logger.debug(`Product.notes --> Checking Notes for Product Id ${product.id} - ${product.code}`, productNotes)
        if(productNotes) {
          if(isArray(productNotes) === true && productNotes.length === 1) {
            //return productNotes[0].notes;
            const html = `
              <html>
                <head>
                  <title>Product Notes unfluff wrapper for ${product.code}</title>
                </head>
                <body>
                  <p>${productNotes[0].notes || 'No note'}</p>
                </body>
              </html>`;
            const cleared = unfluff(html, 'en');

            logger.debug(`Unfluffed Notes For Product ${product.code}`, {cleared, original: productNotes[0].notes})
            return cleared.text;
          }
        }
        logger.debug(`Found Product Result for product id ${productId}`, { product });

        /*
        if (product.note) return product.note;
        if (product.notes) return product.notes;
        */

      } catch (ex) {
        logger.error(`Could not retrieve product note due to ${ex.message}`);
      }

      return product.notes;
    }
  },
  Query: {
    LasecGetProductList: async (obj, args) => {
      return getProducts(args);
    },
    LasecGetProductById: async (obj, args) => {
      return getProductById(args);
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
