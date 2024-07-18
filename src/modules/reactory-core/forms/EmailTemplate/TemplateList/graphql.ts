import { fileAsString } from '@reactory/server-core/utils/io';

const graphql: Reactory.IFormGraphDefinition = {
  query: {
    name: 'ReactoryGetTemplateList',
    text: fileAsString(require.resolve('./ReactoryTemplateList.graphql')),
    variables: {
      '$route.params.slug': 'slug',
    },
    resultMap: {
      id: 'id',
      'createdAt': 'createdAt',
      'title': 'title',
      'content': 'content',
      'slug': 'slug',
      'published': 'published',
      'topics': 'topics'
    },
    edit: false,
    new: false,
  }  
};

export default graphql;