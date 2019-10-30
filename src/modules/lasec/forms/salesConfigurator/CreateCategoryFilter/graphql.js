import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  mutation: {
    new: {
      name: 'LasecCreateCategoryFilter',
      text: fileAsString(require.resolve('./LasecCreateCategoryFilter.graphql')),
      objectMap: true,
      updateMessage: 'Creating New Category Filter...',
      variables: {
        'formData.title': 'input.title',
        'formData.filterOptions': 'input.filterOptions',
        'formData.selectMultiple': 'input.selectMultiple',
      },
      onSuccessMethod: 'refresh'
    },
  }
};
