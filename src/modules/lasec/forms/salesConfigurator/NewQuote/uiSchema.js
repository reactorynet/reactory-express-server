import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  submitIcon: '$none',
  'ui:options': {
    submitProps: {
      variant: 'button',
      text: 'Next'
    },
  },
  client: {
    'ui:widget': 'SelectWithDataWidget',
    'ui:options': {
      query: fileAsString(require.resolve('./LasecGetClientList.graphql')),
      resultItem: 'LasecGetClientList',
      resultsMap: {
        'LasecGetClientList.[].id': ['[].key', '[].value'],
        'LasecGetClientList.[].fullname': '[].label',
      },

    },
  },
  date: {
    'ui:widget': 'DateSelectorWidget',
  },
  poNumber: {}
};
