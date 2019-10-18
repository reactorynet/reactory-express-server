
      import schema from './ReactoryFormList';
      import DefaultUiSchema from './uiSchema';


      const ReactoryFormList = {
        id: 'ReactoryFormList',
        uiFramework: 'material',
        uiSupport: ['material'],
        uiResources: [],
        title: 'Available Forms',
        tags: ['reactory forms', 'forms'],
        name: 'ReactoryFormList',
        nameSpace: 'core',
        version: '1.0.0',
        description: 'Provides a list of forms available to your user account.',
        author: {
          fullName: 'Werner Weber',
          email: 'werner.weber@gmail.com',
        },
        helpTopics: [
          'ReactoryFormList',
        ],
        registerAsComponent: true,
        schema,
        uiSchema: DefaultUiSchema,
      };

      export default ReactoryFormList;
