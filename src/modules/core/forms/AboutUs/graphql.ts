import { fileAsString } from '../../../../utils/io';

export default {
  query: {
    name: 'ReactoryGetContentBySlug',
    text: fileAsString(require.resolve('./ReactoryGetContentBySlug.graphql')),
    variables: {
      'formData.slug': 'slug',
    },
    resultMap: {
      id: 'id',
      'createdAt': 'createdAt',
      'title': 'title',
      'content': 'content',
      'slug': 'slug'
    },
    edit: false,
    new: false,
  },
  mutation: {
    new: {
      name: 'ReactoryCreateContent',
      text: fileAsString(require.resolve('./ReactoryCreateContent.graphql')),
      objectMap: true,
      updateMessage: 'Updating About Us Page...',
      variables: {
        'formData.slug': 'createInput.slug',
        'formData.title': 'createInput.title',
        'formData.content': 'createInput.content',
      },
      onSuccessMethod: 'refresh'
    },
  },
};
