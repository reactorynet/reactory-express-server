import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetFilteredQuotes',
    text: fileAsString(require.resolve('./LasecGetFilteredQuotes.graphql')),
    variables: {
      'formContext.query.filterType': 'filterparams.filterType',
    },
    resultMap: {
      '[].customer.fullName': '[].customerName',
      '[].company.tradingName': '[].companyTradingName',
      '[].status': '[].status',
      '[].created': '[].created'
    },
    resultType: 'array',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};
