
      import $schema from './schema';
      import $uiSchema from './uiSchema';
      import $graphql from './graphql';

      const ContentList = {
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
          fullName: 'Drew Murphy',
          email: 'drewmurphyza@gmail.com',
        },
        helpTopics: [
          'ReactoryContentList',
        ],
        registerAsComponent: true,
        schema: $schema,
        uiSchema: $uiSchema,
        graphql: $graphql,
        defaultFormValue: {
          contentList: [
            { id: '1', primaryText: 'Primary Text', secondaryText: 'Primary Text' },
            { id: '2', primaryText: 'Primary Text', secondaryText: 'Primary Text' },
            { id: '3', primaryText: 'Primary Text', secondaryText: 'Primary Text' },
            { id: '4', primaryText: 'Primary Text', secondaryText: 'Primary Text' },
          ],
        },
      };

      export default ContentList;
