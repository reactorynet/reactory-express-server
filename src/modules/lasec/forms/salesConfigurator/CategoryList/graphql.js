import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetCategoryList',
    text: fileAsString(require.resolve('./LasecGetCategoryList.graphql')),
    resultMap: {
      '[].id': 'list.[].id',
      '[].name': 'list.[].name',
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
