import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'ReactoryGetContentList',
    text: fileAsString(require.resolve('./ReactoryGetContentList.graphql')),
    variables: {},
    resultType: 'array',
    resultMap: {
      '[].id': 'contentList[].id',
      '[].slug': 'contentList[].primaryText',
      '[].updatedAt': 'contentList[].secondaryText',
    },
    edit: false,
    new: false,
  },
};
