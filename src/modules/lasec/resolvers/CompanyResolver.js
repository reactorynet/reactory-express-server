import lasecApi from '../api';
import moment from 'moment';
import logger from '../../../logging';
import lodash, { isArray, isNil, orderBy } from 'lodash';
import { getCacheItem, setCacheItem } from '../models';

const getClients = async (params) => {

  let _params = params;

  if (!_params) {
    _params = {
      periodStart: moment().startOf('year'),
      periodEnd: moment().endOf('day')
    }
  }
  const cachekey = `CLIENT_LIST_TEST`;

  let apiFilter = {};

  // let _cachedResults = await getCacheItem(cachekey);
  // if(_cachedResults) return _cachedResults;

  const clientResult = await lasecApi.Customers.list({ filter: apiFilter, pagination: { page_size: 10 } }).then();

  let ids = [];

  if (isArray(clientResult.ids) === true) {
    ids = [...clientResult.ids];
  }

  const pagePromises = [];

  if (clientResult.pagination && clientResult.pagination.num_pages > 1) {
    const max_pages = clientResult.pagination.num_pages < 10 ? clientResult.pagination.num_pages : 10;

    for (let pageIndex = clientResult.pagination.current_page + 1; pageIndex <= max_pages; pageIndex += 1) {
      pagePromises.push(lasecApi.Customers.list({ filter: apiFilter, pagination: { ...clientResult.pagination, current_page: pageIndex } }));
    }
  }

  const pagedResults = await Promise.all(pagePromises).then();

  pagedResults.forEach((pagedResult) => {
    ids = [...ids, ...pagedResult.ids]
  });

  logger.debug(`Loading (${ids.length}) client ids`);

  const clientDetails = await lasecApi.Customers.list({ filter: { ids: ids } });
  logger.debug(`Fetched Expanded View for (${clientDetails.items.length}) Clients from API`);
  let clients = [...clientDetails.items];

  // const productSyncResult = await Promise.all(products.map((product) => {
  //   return product_sync(product.id, global.partner.key, product, true);
  // })).then();

  // products = productSyncResult.map(doc => doc);

  // amq.raiseWorkFlowEvent('product.list.refresh', products, global.partner);

  logger.debug(`CLIENT RESOLVER - CLIENTS::  `, { clients });

  clients = clients.map(client => {
    return {
      id: client.id,
      fullname: `${client.first_name.trim()} ${client.surname}`
    }
  });

  setCacheItem(cachekey, clients, 60 * 10)

  // logger.debug(`CLIENT RESOLVER - CLIENTS::  `, { clients });

  return orderBy(clients, ['fullname', ['asc']]);
}

export default {
  Query: {
    LasecGetClientList: async (obj, args) => {
      return getClients();
    }
  }
};
