import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'ReactoryGetContentList',
    text: fileAsString(require.resolve('./ReactoryGetContentList.graphql')),
    variables: {},
    resultType: 'object',
    resultMap: {
      'paging': 'paging',
      'data': 'data',
      'data[].id': '[].id',
      'data[].slug': '[].primaryText',
      'data[].updatedAt': '[].secondaryText',
      'data[].title': '[].title',
    },
    edit: false,
    new: false,
  },
};
