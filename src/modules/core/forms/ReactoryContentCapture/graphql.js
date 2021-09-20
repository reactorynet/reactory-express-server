 import { fileAsString } from '@reactory/server-core/utils/io';

 const mutationVariables = {
  'formData.slug': 'createInput.slug',
  'formData.title': 'createInput.title',
  'formData.content': 'createInput.content',
  'formData.published': 'createInput.published',
  'formData.topics': 'createInput.topics'
}

 export default {
   query: {
     name: 'ReactoryGetContentBySlug',
     text: fileAsString(require.resolve('./ReactoryGetContentBySlug.graphql')),
     variables: {
       'formData.slug': 'slug',
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
   },
   mutation: {
     new: {
       name: 'ReactoryCreateContent',
       text: fileAsString(require.resolve('./ReactoryCreateContent.graphql')),
       objectMap: true,
       updateMessage: 'Creating Entry ...',
       variables: mutationVariables,      
       onSuccessMethod: 'refresh'
     },
     edit: {
       name: 'ReactoryCreateContent',
       text: fileAsString(require.resolve('./ReactoryCreateContent.graphql')),
       objectMap: true,
       updateMessage: 'Updating Content ...',
       variables: mutationVariables,
       onSuccessMethod: 'refresh'
     },
   },
 };
