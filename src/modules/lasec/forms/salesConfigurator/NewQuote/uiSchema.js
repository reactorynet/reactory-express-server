import { fileAsString } from '@reactory/server-core/utils/io';

export default {  
  'ui:options': {
    submitProps: {
      variant: 'button',
      text: 'Next',
      iconAlign: 'right'
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
