import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'LasecGetDashboard',
    text: fileAsString(require.resolve('./LasecGetDashboard.graphql')),
    variables: {
      'formData.toolbar.period': 'dashparams.period',
      'formData.toolbar.periodStart': 'dashparams.periodStart',
      'formData.toolbar.periodEnd': 'dashparams.periodEnd',
      'formData.toolbar.agentSelection': 'dashparams.agentSelection',
      'formData.toolbar.repIds': 'dashparams.repIds',
      'formData.toolbar.teamFilter': 'dashparams.teamIds'
    },
    resultMap: {
      id: 'id',
      period: 'toolbar.period',
      periodStart: 'toolbar.periodStart',
      periodEnd: 'toolbar.periodEnd',
      repIds: 'toolbar.repIds',
      teamIds: 'toolbar.teamFilter',
      agentSelection: 'toolbar.agentSelection',
      statusSummary: 'statusSummary',
      quotes: 'quotes',
      // nextActions: 'nextActions',
      'nextActions.actions[].actionType': 'nextActions.actions[].actionType',
      'nextActions.actions[].importance': 'nextActions.actions[].importance',
      'nextActions.actions[].text': 'nextActions.actions[].text',
      'nextActions.actions[].next': 'nextActions.actions[].next',
      'nextActions.actions[].quote': 'nextActions.actions[].quote',
      'nextActions.actions[].who': 'nextActions.actions[].who',
      totalQuotes: 'totalQuotes',
      target: 'target',
      targetPercent: 'targetPercent',
      totalBad: 'totalBad',
      charts: 'charts',
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
