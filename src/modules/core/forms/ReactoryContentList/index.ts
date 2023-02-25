
      import $schema from './schema';
      import $uiSchema from './uiSchema';
      import $graphql from './graphql';
import Reactory from '@reactory/reactory-core';

      const ContentList: Reactory.Forms.IReactoryForm = {
        id: 'ContentList',
        uiFramework: 'material',
        uiSupport: ['material'],
        uiResources: [],
        title: 'Available Content',
        tags: ['reactory content', 'forms'],
        name: 'ContentList',
        nameSpace: 'static',
        version: '1.0.0',
        description: 'Provides a list of content items available to your user account.',
        author: {
          fullName: 'Werner Weber',
          email: 'werner.weber@reactory.net',
        },
        helpTopics: [
          'ReactoryContentList',
        ],
        registerAsComponent: true,
        schema: $schema,
        uiSchema: $uiSchema,
        graphql: $graphql,
      };

      export default ContentList;
