import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetCategoryFilters',
    text: fileAsString(require.resolve('./LasecGetCategoryFilters.graphql')),
    variables: {},
    resultMap: {
      id: 'id',
      '[].title': 'filters[].title',
      '[].key': 'filters[].key',
      '[].selectMultiple': 'filters[].selectMultiple'
    },
    resultType: 'array',
    edit: true,
    new: false,
  }
};
