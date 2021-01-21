import { fileAsString } from '../../../../utils/io';
import { Reactory } from '@reactory/server-core/types/reactory';


export const LasecUserLookupQuery: Reactory.IReactoryFormQuery = {
  name: 'Lasec360UserList',
  text: fileAsString(require.resolve('./Lasec360UserList.gql')),
  variables: {
    '$formData.repIds': 'repIds'
  },
  autoQuery: false,
  delete: false,
  edit: false,
  new: false,
  resultMap: {
    'id': 'id',
    'code': 'code',
    'staff_user_id': 'repId',
    'first_name': 'firstName',
    'email': 'email'
  }
};

export default {
  debug: true,
  query: {
    name: 'LasecGetDashboard',
    text: fileAsString(require.resolve('./LasecGetDashboard.graphql')),
    variables: {
      'formData.toolbar.period': 'dashparams.period',
      'formData.toolbar.periodStart': 'dashparams.periodStart',
      'formData.toolbar.periodEnd': 'dashparams.periodEnd',
      'formData.toolbar.agentSelection': 'dashparams.agentSelection',
      'formData.toolbar.repIds': 'dashparams.repIds',
      'formData.toolbar.teamFilter': 'dashparams.teamIds',
      'formData.options': 'dashparams.options'
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
      nextActions: 'nextActions',
      /*
      'nextActions.actions[].id': 'nextActions.actions[].id',
      'nextActions.actions[].actionType': 'nextActions.actions[].actionType',
      'nextActions.actions[].actioned': 'nextActions.actions[].actioned',
      'nextActions.actions[].importance': 'nextActions.actions[].importance',
      'nextActions.actions[].text': 'nextActions.actions[].text',
      'nextActions.actions[].next': 'nextActions.actions[].next',
      'nextActions.actions[].quote': 'nextActions.actions[].quote',
      'nextActions.actions[].meta': 'nextActions.actions[].meta',
      'nextActions.actions[].who[].id': 'nextActions.actions[].who[].id',
      'nextActions.actions[].who[].firstName': 'nextActions.actions[].who[].firstName',
      'nextActions.actions[].who[].lastName': 'nextActions.actions[].who[].lastName',
      */
      totalQuotes: 'totalQuotes',
      target: 'target',
      targetPercent: 'targetPercent',
      totalBad: 'totalBad',
      totalInvoiced: 'totalInvoiced',
      charts: 'charts',
      'quotes[].code': ['quotes[].quote_id', 'quotes[].code'],
      'quotes[].customer.fullName': 'quotes[].customerName',
      'quotes[].statusName' : 'quotes[].statusName',
      'quotes[].totalVATExclusive' : 'quotes[].totalVATExclusive',
      'quotes[].totalVATInclusive' : 'quotes[].totalVATInclusive',
      'quotes[].company.tradingName': 'quotes[].companyTradingName',
    },
    options: 'cache-first',
    edit: false,
    new: false,
    onError: {
      componentRef: 'lasec-crm.Lasec360Plugin@1.0.0',
      method: 'onGraphQLQueryError',
    },
  },
};
