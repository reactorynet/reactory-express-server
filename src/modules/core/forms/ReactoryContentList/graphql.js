import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'ReactoryGetContentList',
    text: fileAsString(require.resolve('./ReactoryGetContentList.graphql')),
    variables: {},
    resultMap: {
      '[].id': 'contentList[].id',
      '[].slug': 'contentList[].primaryText',
      '[].updatedAt': 'contentList[].secondaryText',
    },
    edit: false,
    new: false,
  },
};
