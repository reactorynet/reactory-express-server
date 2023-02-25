import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'ReactoryGetContentList',
    text: fileAsString(require.resolve('./ReactoryGetContentList.graphql')),
    variables: {},
    resultType: 'array',
    resultMap: {
      '[].id': '[].id',
      '[].slug': '[].primaryText',
      '[].updatedAt': '[].secondaryText',
      '[].title': '[].title',
      '[].*': '[].data'
    },
    edit: false,
    new: false,
  },
};
