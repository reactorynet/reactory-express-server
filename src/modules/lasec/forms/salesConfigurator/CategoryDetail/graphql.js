import { fileAsString } from '@reactory/server-core/utils/io';

export default {
  query: {
    name: 'LasecGetCategoryById',
    text: fileAsString(require.resolve('./LasecGetCategoryById.graphql')),
    variables: {
      'formContext.$route.params.id': 'id',
    },
    resultMap: {
      id: 'id',
      'name': 'categoryName',
      'description': 'categoryDescription',
    },
    edit: true,
    new: false,
  },
  mutation: {
    new: {
      name: 'LasecCreateNewCategory',
      text: fileAsString(require.resolve('./LasecCreateNewCategory.graphql')),
      objectMap: true,
      updateMessage: 'Creating New Category...',
      variables: {
        'formData.categoryName': 'input.name',
        'formData.categoryDescription': 'input.description',
      },
      onSuccessMethod: 'refresh'
    },
    edit: {
      name: 'LasecUpdateCategory',
      text: fileAsString(require.resolve('./LasecUpdateCategory.graphql')),
      objectMap: true,
      updateMessage: 'Updating Category...',
      variables: {
        'formData.id': 'id',
        'formData.categoryName': 'input.name',
        'formData.categoryDescription': 'input.description',
      },
      onSuccessMethod: 'refresh'
    }
  }
};
