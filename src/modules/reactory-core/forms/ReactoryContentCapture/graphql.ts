import Reactory from '@reactorynet/reactory-core';
import { fileAsString } from '@reactory/server-core/utils/io';

const mutationVariables = {
  'formData.slug': 'createInput.slug',
  'formData.title': 'createInput.title',
  'formData.description': 'createInput.description',
  'formData.content': 'createInput.content',
  'formData.published': 'createInput.published',
  'formData.topics': 'createInput.topics',
  'formData.version': 'createInput.version',
  'formData.locale': 'createInput.locale',
  'formData.template': 'createInput.template',
  'formData.engine': 'createInput.engine',
  'formData.previewInputForm': 'createInput.previewInputForm',
  'formData.helpTopic': 'createInput.helpTopic',
};

const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    name: 'ReactoryGetContentBySlug',
    text: fileAsString(require.resolve('./ReactoryGetContentBySlug.graphql')),
    variables: {
      'formData.slug': 'slug',       
    },
    resultMap: {
      'id': 'id',
      'createdAt': 'createdAt',
      'updatedAt': 'updatedAt',
      'title': 'title',
      'description': 'description',
      'content': 'content',
      'slug': 'slug',
      'published': 'published',
      'topics': 'topics',
      'version': 'version',
      'locale': 'locale',
      'template': 'template',
      'engine': 'engine',
      'previewInputForm': 'previewInputForm',
      'helpTopic': 'helpTopic',
    },
    edit: true,
    new: false,
  },
  mutation: {
    new: {
      name: 'ReactoryCreateContent',
      text: fileAsString(require.resolve('./ReactoryCreateContent.graphql')),
      objectMap: true,
      updateMessage: 'Creating Entry ...',
      // @ts-ignore
      variables: mutationVariables,      
      onSuccessMethod: 'refresh',
      notification: { 
        inAppNotification: true,
        title: 'Content Created',
        type: 'success',
      },
    },
    edit: {
      name: 'ReactoryCreateContent',
      text: fileAsString(require.resolve('./ReactoryCreateContent.graphql')),
      objectMap: true,
      updateMessage: 'Updating Content ...',
      // @ts-ignore
      variables: mutationVariables,
      onSuccessMethod: 'refresh',
      notification: { 
        inAppNotification: true,
        title: 'Content Updated',
        type: 'success',
      },
      mergeStrategy: 'function'
    },
  },
};

export default graphql;
