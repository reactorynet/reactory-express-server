
      import $schema from './schema';
      import $uiSchema from './uiSchema';
      import $graphql from './graphql';

      const ReactoryFormEditor = {
        id: 'ReactoryFormEditor',
        uiFramework: 'material',
        uiSupport: ['material'],
        uiResources: [],
        title: 'Form Editor Content',
        tags: ['Form Editor'],
        name: 'ReactoryFormEditor',
        nameSpace: 'core',
        version: '1.0.0',
        description: 'Provides a light interface to edit / create a new Reactory Form',
        author: {
          fullName: 'Werner Weber',
          email: 'werner.weber@gmail.com',
        },
        helpTopics: [
          'ReactoryFormEditor',
        ],
        registerAsComponent: true,
        schema: $schema,
        uiSchema: $uiSchema,
        //graphql: $graphql,        
      };

      export default ReactoryFormEditor;
