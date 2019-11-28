import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'LasecGetDashboard',
    text: fileAsString(require.resolve('./LasecGetProductDashboard.graphql')),
    variables: {
      'formData.toolbar.period': 'dashparams.period',
      'formData.toolbar.periodStart': 'dashparams.periodStart',
      'formData.toolbar.periodEnd': 'dashparams.periodEnd'
    },
    resultMap: {
      id: 'id',
      period: 'toolbar.period',
      periodStart: 'toolbar.periodStart',
      periodEnd: 'toolbar.periodEnd',
      repIds: 'toolbar.repIds',
      statusSummary: 'statusSummary',
      quotes: 'quotes',
      totalQuotes: 'totalQuotes',
      totalBad: 'totalBad',
      target: 'target',
      targetPercent: 'targetPercent',
      charts: 'charts',
      nextActions: 'nextActions',
      'quotes[].code': ['quotes[].quote_id', 'quotes[].code'],
      'quotes[].customer.fullName': 'quotes[].customerName',
      'quotes[].statusName' : 'quotes[].statusName',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
    },
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};
