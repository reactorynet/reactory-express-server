import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetProductList',
    text: fileAsString(require.resolve('./LasecGetProductList.graphql')),
    resultMap: {
      '[].name': 'list.[].name',
      '[].code': 'list.[].code',
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
